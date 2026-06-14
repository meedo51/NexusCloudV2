import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { generateToken, authenticateToken } from '../middleware/auth';
import { User, UserPublic } from '../types';

const router = Router();

function toPublic(u: User): UserPublic {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    displayName: u.displayName || '',
    storageQuotaBytes: u.storageQuotaBytes || 3221225472,
    usedStorageBytes: u.usedStorageBytes || 0,
    createdAt: u.createdAt,
  };
}

router.post('/register', (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    res.status(400).json({ error: 'Username, email, and password are required' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    res.status(409).json({ error: 'Username or email already exists' });
    return;
  }

  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);
  const createdAt = new Date().toISOString();

  db.prepare('INSERT INTO users (id, username, email, passwordHash, displayName, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, username, email, passwordHash, '', createdAt);

  const token = generateToken({ userId: id, username });

  res.status(201).json({
    token,
    user: { id, username, email, displayName: '', storageQuotaBytes: 3221225472, usedStorageBytes: 0, createdAt },
  });
});

router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  if (!bcrypt.compareSync(password, user.passwordHash)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = generateToken({ userId: user.id, username: user.username });

  res.json({
    token,
    user: toPublic(user),
  });
});

router.get('/me', authenticateToken, (req: Request, res: Response) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.userId) as User | undefined;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(toPublic(user));
});

router.put('/profile', authenticateToken, (req: Request, res: Response) => {
  const { username, email, displayName } = req.body;
  const userId = req.user!.userId;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (username !== undefined && username !== user.username) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, userId);
    if (existing) {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }
  }

  if (email !== undefined && email !== user.email) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, userId);
    if (existing) {
      res.status(409).json({ error: 'Email already taken' });
      return;
    }
  }

  const newUsername = username !== undefined ? username : user.username;
  const newEmail = email !== undefined ? email : user.email;
  const newDisplayName = displayName !== undefined ? displayName : (user.displayName || '');

  db.prepare('UPDATE users SET username = ?, email = ?, displayName = ? WHERE id = ?')
    .run(newUsername, newEmail, newDisplayName, userId);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User;
  res.json(toPublic(updated));
});

router.put('/password', authenticateToken, (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user!.userId;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current password and new password are required' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (!bcrypt.compareSync(currentPassword, user.passwordHash)) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(passwordHash, userId);

  const token = generateToken({ userId: user.id, username: user.username });
  res.json({ message: 'Password updated successfully', token });
});

export default router;
