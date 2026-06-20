import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { prepare, logActivity } from '../database';
import { generateToken, authenticateToken } from '../middleware/auth';
import { User, UserPublic } from '../types';

const router = Router();
const ENABLE_2FA = process.env.ENABLE_2FA !== 'false';

function toPublic(u: User): UserPublic {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    displayName: u.displayName || '',
    storageQuotaBytes: u.storageQuotaBytes || 3221225472,
    usedStorageBytes: u.usedStorageBytes || 0,
    preferredView: u.preferredView || 'grid',
    two_factor_enabled: u.two_factor_enabled || false,
    isAdmin: u.isAdmin || false,
    createdAt: u.createdAt,
  };
}

router.post('/register', async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    res.status(400).json({ error: 'Username, email, and password are required' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }
  const existing = await prepare('SELECT id FROM users WHERE username = $1 OR email = $2').get(username, email);
  if (existing) {
    res.status(409).json({ error: 'Username or email already exists' });
    return;
  }
  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);
  await prepare('INSERT INTO users (id, username, email, passwordHash, displayName, createdAt) VALUES ($1, $2, $3, $4, $5, NOW())')
    .run(id, username, email, passwordHash, '');
  const token = generateToken({ userId: id, username, isAdmin: false });
  res.status(201).json({
    token,
    user: { id, username, email, displayName: '', storageQuotaBytes: 3221225472, usedStorageBytes: 0, preferredView: 'grid', two_factor_enabled: false, isAdmin: false, createdAt: new Date().toISOString() },
  });
});

router.post('/login', async (req: Request, res: Response) => {
  const { username, password, totpCode, backupCode } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }
  const user = await prepare('SELECT * FROM users WHERE username = $1').get(username) as User | undefined;
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  if (!bcrypt.compareSync(password, user.passwordHash)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  if (ENABLE_2FA && user.two_factor_enabled) {
    if (totpCode) {
      const verified = speakeasy.totp.verify({
        secret: user.two_factor_secret!,
        encoding: 'base32',
        token: totpCode,
        window: 1,
      });
      if (!verified) {
        res.status(401).json({ error: 'Invalid 2FA code' });
        return;
      }
    } else if (backupCode) {
      const codes: string[] = JSON.parse(user.backup_codes || '[]');
      const idx = codes.indexOf(backupCode);
      if (idx === -1) {
        res.status(401).json({ error: 'Invalid backup code' });
        return;
      }
      codes.splice(idx, 1);
      await prepare('UPDATE users SET backup_codes = $1 WHERE id = $2').run(JSON.stringify(codes), user.id);
    } else {
      res.json({ require2FA: true, tempToken: generateToken({ userId: user.id, username: user.username, isAdmin: user.isAdmin }) });
      return;
    }
  }

  const token = generateToken({ userId: user.id, username: user.username, isAdmin: user.isAdmin });
  await logActivity({ userId: user.id, action: 'login', ipAddress: String(req.ip || ''), userAgent: String(req.headers['user-agent'] || '') });
  res.json({ token, user: toPublic(user) });
});

router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  const user = await prepare('SELECT * FROM users WHERE id = $1').get(req.user!.userId) as User | undefined;
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(toPublic(user));
});

router.put('/profile', authenticateToken, async (req: Request, res: Response) => {
  const { username, email, displayName } = req.body;
  const userId = req.user!.userId;
  const user = await prepare('SELECT * FROM users WHERE id = $1').get(userId) as User | undefined;
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  if (username !== undefined && username !== user.username) {
    const existing = await prepare('SELECT id FROM users WHERE username = $1 AND id != $2').get(username, userId);
    if (existing) { res.status(409).json({ error: 'Username already taken' }); return; }
  }
  if (email !== undefined && email !== user.email) {
    const existing = await prepare('SELECT id FROM users WHERE email = $1 AND id != $2').get(email, userId);
    if (existing) { res.status(409).json({ error: 'Email already taken' }); return; }
  }
  const newUsername = username !== undefined ? username : user.username;
  const newEmail = email !== undefined ? email : user.email;
  const newDisplayName = displayName !== undefined ? displayName : (user.displayName || '');
  await prepare('UPDATE users SET username = $1, email = $2, displayName = $3 WHERE id = $4')
    .run(newUsername, newEmail, newDisplayName, userId);
  const updated = await prepare('SELECT * FROM users WHERE id = $1').get(userId) as User;
  res.json(toPublic(updated));
});

router.put('/password', authenticateToken, async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user!.userId;
  if (!currentPassword || !newPassword) { res.status(400).json({ error: 'Current password and new password are required' }); return; }
  if (newPassword.length < 6) { res.status(400).json({ error: 'New password must be at least 6 characters' }); return; }
  const user = await prepare('SELECT * FROM users WHERE id = $1').get(userId) as User | undefined;
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  if (!bcrypt.compareSync(currentPassword, user.passwordHash)) { res.status(401).json({ error: 'Current password is incorrect' }); return; }
  const passwordHash = bcrypt.hashSync(newPassword, 10);
  await prepare('UPDATE users SET passwordHash = $1 WHERE id = $2').run(passwordHash, userId);
  const token = generateToken({ userId: user.id, username: user.username, isAdmin: user.isAdmin });
  res.json({ message: 'Password updated successfully', token });
});

// 2FA routes
router.post('/2fa/setup', authenticateToken, async (req: Request, res: Response) => {
  if (!ENABLE_2FA) { res.status(400).json({ error: '2FA is disabled' }); return; }
  const userId = req.user!.userId;
  const user = await prepare('SELECT * FROM users WHERE id = $1').get(userId) as User | undefined;
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  const secret = speakeasy.generateSecret({ name: `NexusCloud (${user.username})` });
  const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
  const backupCodes: string[] = [];
  for (let i = 0; i < 8; i++) {
    backupCodes.push(uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase());
  }
  await prepare('UPDATE users SET two_factor_secret = $1, backup_codes = $2 WHERE id = $3')
    .run(secret.base32, JSON.stringify(backupCodes), userId);
  res.json({ secret: secret.base32, qrCode, backupCodes });
});

router.post('/2fa/verify', authenticateToken, async (req: Request, res: Response) => {
  if (!ENABLE_2FA) { res.status(400).json({ error: '2FA is disabled' }); return; }
  const { token: totpToken } = req.body;
  if (!totpToken) { res.status(400).json({ error: 'Verification code required' }); return; }
  const user = await prepare('SELECT * FROM users WHERE id = $1').get(req.user!.userId) as User | undefined;
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  if (!user.two_factor_secret) { res.status(400).json({ error: '2FA not set up' }); return; }
  const verified = speakeasy.totp.verify({
    secret: user.two_factor_secret,
    encoding: 'base32',
    token: totpToken,
    window: 1,
  });
  if (!verified) { res.status(400).json({ error: 'Invalid code' }); return; }
  await prepare('UPDATE users SET two_factor_enabled = TRUE WHERE id = $1').run(user.id);
  res.json({ message: '2FA enabled successfully' });
});

router.post('/2fa/disable', authenticateToken, async (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password) { res.status(400).json({ error: 'Password required' }); return; }
  const user = await prepare('SELECT * FROM users WHERE id = $1').get(req.user!.userId) as User | undefined;
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  if (!bcrypt.compareSync(password, user.passwordHash)) { res.status(401).json({ error: 'Invalid password' }); return; }
  await prepare('UPDATE users SET two_factor_secret = NULL, two_factor_enabled = FALSE, backup_codes = $1 WHERE id = $2')
    .run('[]', user.id);
  res.json({ message: '2FA disabled' });
});

router.get('/2fa/backup-codes', authenticateToken, async (req: Request, res: Response) => {
  const user = await prepare('SELECT backup_codes FROM users WHERE id = $1').get(req.user!.userId) as any;
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  const codes = JSON.parse(user.backup_codes || '[]');
  res.json({ backupCodes: codes });
});

router.post('/2fa/regenerate-backup-codes', authenticateToken, async (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password) { res.status(400).json({ error: 'Password required' }); return; }
  const user = await prepare('SELECT * FROM users WHERE id = $1').get(req.user!.userId) as User | undefined;
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  if (!bcrypt.compareSync(password, user.passwordHash)) { res.status(401).json({ error: 'Invalid password' }); return; }
  const backupCodes: string[] = [];
  for (let i = 0; i < 8; i++) {
    backupCodes.push(uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase());
  }
  await prepare('UPDATE users SET backup_codes = $1 WHERE id = $2').run(JSON.stringify(backupCodes), user.id);
  res.json({ backupCodes });
});

router.put('/preferred-view', authenticateToken, async (req: Request, res: Response) => {
  const { view } = req.body;
  if (!view || !['grid', 'list'].includes(view)) { res.status(400).json({ error: 'Invalid view mode' }); return; }
  await prepare('UPDATE users SET preferredView = $1 WHERE id = $2').run(view, req.user!.userId);
  res.json({ preferredView: view });
});

export default router;
