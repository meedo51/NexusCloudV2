import { vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { resetTables, getTable } from './mock-db';

// Set env before anything else
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.ENABLE_2FA = 'true';
process.env.ENABLE_WEBDAV = 'true';
process.env.ENABLE_FULLTEXT_SEARCH = 'true';

// Mock the database module entirely
vi.mock('../database', async () => {
  const mockDb = await import('./mock-db');
  return {
    prepare: mockDb.prepare,
    initializeDatabase: mockDb.initializeDatabase,
    recalculateUsedStorage: mockDb.recalculateUsedStorage,
    checkQuota: mockDb.checkQuota,
    logActivity: mockDb.logActivity,
    pruneVersions: mockDb.pruneVersions,
    pool: mockDb.pool,
    default: { prepare: mockDb.prepare },
  };
});

// Mock the queue service to prevent background jobs
vi.mock('../services/queue', () => ({
  jobQueue: {
    register: vi.fn(),
    add: vi.fn(),
  },
}));

// Mock text extractor
vi.mock('../services/text-extractor', () => ({
  extractText: vi.fn().mockResolvedValue(''),
  shouldExtract: vi.fn().mockReturnValue(false),
}));

export async function createTestUser(overrides: Partial<{
  username: string; email: string; password: string; displayName: string;
  storageQuotaBytes: number; usedStorageBytes: number;
}> = {}) {
  const password = overrides.password || 'testpass123';
  const hash = await bcrypt.hash(password, 4);
  const user = {
    id: crypto.randomUUID(),
    username: overrides.username || `testuser_${Date.now()}`,
    email: overrides.email || `test_${Date.now()}@example.com`,
    passwordHash: hash,
    displayName: overrides.displayName || 'Test User',
    storageQuotaBytes: overrides.storageQuotaBytes || 3221225472,
    usedStorageBytes: overrides.usedStorageBytes || 0,
    preferredView: 'grid',
    two_factor_secret: null,
    two_factor_enabled: false,
    backup_codes: [],
    createdAt: new Date(),
  };
  getTable('users').push(user);
  return user;
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'test-jwt-secret', {
    expiresIn: '1h',
  });
}

export async function loginAs(email: string, password: string) {
  const user = getTable('users').find((u: any) => u.email === email);
  if (!user) throw new Error('User not found');
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('Invalid password');
  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET || 'test-jwt-secret',
    { expiresIn: '1h' }
  );
  return { user, token, tempToken: null, require2FA: false };
}

beforeEach(() => {
  resetTables();
});
