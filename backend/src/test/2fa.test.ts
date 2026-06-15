import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { getTable } from './mock-db';

describe('Two-Factor Authentication', () => {
  beforeEach(async () => {
    // Register a test user via the API
    await request(app)
      .post('/api/auth/register')
      .send({ username: '2fa_user', email: '2fa@test.com', password: 'testpass123' });
  });

  it('should register and login without 2FA', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: '2fa_user', password: 'testpass123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.two_factor_enabled).toBe(false);
  });

  it('should setup 2FA with secret and QR code', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: '2fa_user', password: 'testpass123' });
    const token = login.body.token;

    const res = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.secret).toBeTruthy();
    expect(res.body.qrCode).toMatch(/^data:image/);
    expect(res.body.backupCodes).toHaveLength(8);
    res.body.backupCodes.forEach((code: string) => {
      expect(code.length).toBe(12);
    });
  });

  it('should verify 2FA with a valid TOTP code', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: '2fa_user', password: 'testpass123' });
    const token = login.body.token;

    // Setup 2FA
    const setup = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${token}`);
    const { secret } = setup.body;

    // Generate TOTP code from the secret
    const speakeasy = await import('speakeasy');
    const totpCode = speakeasy.totp({
      secret,
      encoding: 'base32',
    });

    // Verify the code
    const verify = await request(app)
      .post('/api/auth/2fa/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: totpCode });
    expect(verify.status).toBe(200);
    expect(verify.body.message).toBe('2FA enabled successfully');
  });

  it('should reject invalid TOTP code during verification', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: '2fa_user', password: 'testpass123' });
    const token = login.body.token;

    await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${token}`);

    const verify = await request(app)
      .post('/api/auth/2fa/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: '000000' });
    expect(verify.status).toBe(400);
    expect(verify.body.error).toBe('Invalid code');
  });

  it('should prompt for 2FA code on login when enabled', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: '2fa_user', password: 'testpass123' });
    const token = login.body.token;

    // Setup and verify 2FA
    const setup = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${token}`);
    const speakeasy = await import('speakeasy');
    const totpCode = speakeasy.totp({ secret: setup.body.secret, encoding: 'base32' });
    await request(app)
      .post('/api/auth/2fa/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: totpCode });

    // Login again - should get require2FA response
    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ username: '2fa_user', password: 'testpass123' });
    expect(login2.status).toBe(200);
    expect(login2.body.require2FA).toBe(true);
    expect(login2.body.tempToken).toBeTruthy();
    expect(login2.body.token).toBeFalsy();
  });

  it('should login with valid TOTP code when 2FA is enabled', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: '2fa_user', password: 'testpass123' });
    const token = login.body.token;

    const setup = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${token}`);
    const speakeasy = await import('speakeasy');
    const totpCode = speakeasy.totp({ secret: setup.body.secret, encoding: 'base32' });
    await request(app)
      .post('/api/auth/2fa/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: totpCode });

    // Login with TOTP code
    const totpCode2 = speakeasy.totp({ secret: setup.body.secret, encoding: 'base32' });
    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ username: '2fa_user', password: 'testpass123', totpCode: totpCode2 });
    expect(login2.status).toBe(200);
    expect(login2.body.token).toBeTruthy();
    expect(login2.body.require2FA).toBeFalsy();
  });

  it('should login with a backup code when 2FA is enabled', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: '2fa_user', password: 'testpass123' });
    const token = login.body.token;

    const setup = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${token}`);
    const { backupCodes } = setup.body;
    const speakeasy = await import('speakeasy');
    const totpCode = speakeasy.totp({ secret: setup.body.secret, encoding: 'base32' });
    await request(app)
      .post('/api/auth/2fa/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: totpCode });

    // Login with a backup code
    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ username: '2fa_user', password: 'testpass123', backupCode: backupCodes[0] });
    expect(login2.status).toBe(200);
    expect(login2.body.token).toBeTruthy();

    // The used backup code should be consumed
    const backupRes = await request(app)
      .get('/api/auth/2fa/backup-codes')
      .set('Authorization', `Bearer ${login2.body.token}`);
    expect(backupRes.body.backupCodes).not.toContain(backupCodes[0]);
    expect(backupRes.body.backupCodes).toHaveLength(7);
  });

  it('should reject login with invalid TOTP code', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: '2fa_user', password: 'testpass123' });
    const token = login.body.token;

    const setup = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${token}`);
    const speakeasy = await import('speakeasy');
    const totpCode = speakeasy.totp({ secret: setup.body.secret, encoding: 'base32' });
    await request(app)
      .post('/api/auth/2fa/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: totpCode });

    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ username: '2fa_user', password: 'testpass123', totpCode: '000000' });
    expect(login2.status).toBe(401);
    expect(login2.body.error).toBe('Invalid 2FA code');
  });

  it('should regenerate backup codes', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: '2fa_user', password: 'testpass123' });
    const token = login.body.token;

    // Setup 2FA
    const setup = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${token}`);

    // Regenerate backup codes
    const regen = await request(app)
      .post('/api/auth/2fa/regenerate-backup-codes')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'testpass123' });
    expect(regen.status).toBe(200);
    expect(regen.body.backupCodes).toHaveLength(8);
    expect(regen.body.backupCodes).not.toEqual(setup.body.backupCodes);
  });

  it('should disable 2FA with correct password', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: '2fa_user', password: 'testpass123' });
    const token = login.body.token;

    const setup = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${token}`);
    const speakeasy = await import('speakeasy');
    const totpCode = speakeasy.totp({ secret: setup.body.secret, encoding: 'base32' });
    await request(app)
      .post('/api/auth/2fa/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: totpCode });

    // Disable 2FA
    const disable = await request(app)
      .post('/api/auth/2fa/disable')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'testpass123' });
    expect(disable.status).toBe(200);
    expect(disable.body.message).toBe('2FA disabled');

    // Login should no longer require 2FA
    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ username: '2fa_user', password: 'testpass123' });
    expect(login2.status).toBe(200);
    expect(login2.body.require2FA).toBeFalsy();
    expect(login2.body.token).toBeTruthy();
  });

  it('should require password to disable 2FA', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: '2fa_user', password: 'testpass123' });
    const token = login.body.token;

    const disable = await request(app)
      .post('/api/auth/2fa/disable')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(disable.status).toBe(400);
    expect(disable.body.error).toBe('Password required');
  });

  it('should reject disabling 2FA with wrong password', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: '2fa_user', password: 'testpass123' });
    const token = login.body.token;

    const disable = await request(app)
      .post('/api/auth/2fa/disable')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'wrongpassword' });
    expect(disable.status).toBe(401);
    expect(disable.body.error).toBe('Invalid password');
  });

  it('should require auth for all 2FA endpoints', async () => {
    const endpoints = [
      ['post', '/api/auth/2fa/setup'],
      ['post', '/api/auth/2fa/verify'],
      ['post', '/api/auth/2fa/disable'],
      ['get', '/api/auth/2fa/backup-codes'],
      ['post', '/api/auth/2fa/regenerate-backup-codes'],
    ] as const;

    for (const [method, path] of endpoints) {
      const res = await (request(app) as any)[method](path).send({});
      expect(res.status).toBe(401);
    }
  });
});
