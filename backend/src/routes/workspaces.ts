import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { prepare } from '../database';
import { authenticateToken } from '../middleware/auth';
import { Workspace, WorkspaceMember } from '../types';

const router = Router();
router.use(authenticateToken);

// List workspaces (owned + member)
router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const owned = await prepare(
    'SELECT w.*, (SELECT COUNT(*)::int FROM workspace_members WHERE workspaceId = w.id) as memberCount FROM workspaces w WHERE w.ownerId = $? ORDER BY w.createdAt DESC'
  ).all(userId) as any[];
  const member = await prepare(`
    SELECT w.*, wm.role, (SELECT COUNT(*)::int FROM workspace_members WHERE workspaceId = w.id) as memberCount
    FROM workspaces w JOIN workspace_members wm ON w.id = wm.workspaceId
    WHERE wm.userId = $? ORDER BY w.createdAt DESC
  `).all(userId) as any[];
  const all = [...owned, ...member.filter((m: any) => !owned.find((o: any) => o.id === m.id))];
  res.json(all);
});

// Create workspace
router.post('/', async (req: Request, res: Response) => {
  const { name, description } = req.body;
  const userId = req.user!.userId;
  if (!name) { res.status(400).json({ error: 'Workspace name is required' }); return; }
  const id = uuidv4();
  await prepare(
    'INSERT INTO workspaces (id, name, description, ownerId, createdAt, updatedAt) VALUES ($?, $?, $?, $?, NOW(), NOW())'
  ).run(id, name, description || '', userId);
  // Add owner as admin member
  await prepare(
    'INSERT INTO workspace_members (workspaceId, userId, role, invitedBy, joinedAt) VALUES ($?, $?, $?, $?, NOW())'
  ).run(id, userId, 'admin', userId);
  const ws = await prepare('SELECT * FROM workspaces WHERE id = $?').get(id);
  res.status(201).json(ws);
});

// Get workspace details
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const ws = await prepare('SELECT * FROM workspaces WHERE id = $?').get(id) as any;
  if (!ws) { res.status(404).json({ error: 'Workspace not found' }); return; }
  // Check membership
  const member = await prepare('SELECT * FROM workspace_members WHERE workspaceId = $? AND userId = $?').get(id, userId);
  if (!member && ws.ownerId !== userId) { res.status(403).json({ error: 'Access denied' }); return; }
  const members = await prepare(`
    SELECT wm.*, u.username, u.email FROM workspace_members wm
    JOIN users u ON wm.userId = u.id WHERE wm.workspaceId = $? ORDER BY wm.joinedAt
  `).all(id);
  res.json({ ...ws, members });
});

// Update workspace
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const userId = req.user!.userId;
  const ws = await prepare('SELECT * FROM workspaces WHERE id = $?').get(id) as any;
  if (!ws) { res.status(404).json({ error: 'Workspace not found' }); return; }
  if (ws.ownerId !== userId) { res.status(403).json({ error: 'Only owner can update workspace' }); return; }
  if (name) await prepare('UPDATE workspaces SET name = $? WHERE id = $?').run(name, id);
  if (description !== undefined) await prepare('UPDATE workspaces SET description = $? WHERE id = $?').run(description, id);
  await prepare('UPDATE workspaces SET updatedAt = NOW() WHERE id = $?').run(id);
  const updated = await prepare('SELECT * FROM workspaces WHERE id = $?').get(id);
  res.json(updated);
});

// Delete workspace
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const ws = await prepare('SELECT * FROM workspaces WHERE id = $?').get(id) as any;
  if (!ws) { res.status(404).json({ error: 'Workspace not found' }); return; }
  if (ws.ownerId !== userId) { res.status(403).json({ error: 'Only owner can delete workspace' }); return; }
  await prepare('DELETE FROM workspace_items WHERE workspaceId = $?').run(id);
  await prepare('DELETE FROM workspace_members WHERE workspaceId = $?').run(id);
  await prepare('DELETE FROM workspace_invites WHERE workspaceId = $?').run(id);
  await prepare('DELETE FROM workspaces WHERE id = $?').run(id);
  res.json({ message: 'Workspace deleted' });
});

// Invite user to workspace
router.post('/:id/invite', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { email, role } = req.body;
  const userId = req.user!.userId;
  if (!email) { res.status(400).json({ error: 'Email is required' }); return; }
  // Check permission
  const membership = await prepare('SELECT * FROM workspace_members WHERE workspaceId = $? AND userId = $?').get(id, userId) as any;
  const ws = await prepare('SELECT * FROM workspaces WHERE id = $?').get(id) as any;
  if (!ws) { res.status(404).json({ error: 'Workspace not found' }); return; }
  if (ws.ownerId !== userId && (!membership || membership.role !== 'admin')) {
    res.status(403).json({ error: 'Only admins can invite members' });
    return;
  }
  const targetUser = await prepare('SELECT id FROM users WHERE email = $?').get(email) as any;
  if (!targetUser) { res.status(404).json({ error: 'User not found with that email' }); return; }
  // Check if already member
  const existingMember = await prepare('SELECT * FROM workspace_members WHERE workspaceId = $? AND userId = $?').get(id, targetUser.id);
  if (existingMember) { res.status(409).json({ error: 'User is already a member' }); return; }
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prepare(
    'INSERT INTO workspace_invites (id, workspaceId, email, token, role, invitedBy, expiresAt, createdAt) VALUES ($?, $?, $?, $?, $?, $?, $?, NOW())'
  ).run(uuidv4(), id, email, token, role || 'member', userId, expiresAt);
  res.json({ message: 'Invitation sent', token, email });
});

// Accept workspace invite
router.post('/invite/:token/accept', async (req: Request, res: Response) => {
  const { token } = req.params;
  const userId = req.user!.userId;
  const invite = await prepare('SELECT * FROM workspace_invites WHERE token = $? AND accepted = FALSE AND expiresAt > NOW()').get(token) as any;
  if (!invite) { res.status(404).json({ error: 'Invalid or expired invitation' }); return; }
  const user = await prepare('SELECT email FROM users WHERE id = $?').get(userId) as any;
  if (!user || user.email !== invite.email) { res.status(403).json({ error: 'This invitation is for a different email' }); return; }
  await prepare('INSERT INTO workspace_members (workspaceId, userId, role, invitedBy, joinedAt) VALUES ($?, $?, $?, $?, NOW())').run(invite.workspaceId, userId, invite.role, invite.invitedBy);
  await prepare('UPDATE workspace_invites SET accepted = TRUE WHERE id = $?').run(invite.id);
  res.json({ message: 'Joined workspace successfully', workspaceId: invite.workspaceId });
});

// List workspace invites
router.get('/:id/invites', async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const membership = await prepare('SELECT * FROM workspace_members WHERE workspaceId = $? AND userId = $?').get(id, userId) as any;
  const ws = await prepare('SELECT * FROM workspaces WHERE id = $?').get(id) as any;
  if (!ws) { res.status(404).json({ error: 'Workspace not found' }); return; }
  if (ws.ownerId !== userId && (!membership || membership.role !== 'admin')) {
    res.status(403).json({ error: 'Access denied' }); return;
  }
  const invites = await prepare(
    'SELECT * FROM workspace_invites WHERE workspaceId = $? ORDER BY createdAt DESC'
  ).all(id);
  res.json(invites);
});

// Remove member
router.delete('/:id/members/:memberId', async (req: Request, res: Response) => {
  const { id, memberId } = req.params;
  const userId = req.user!.userId;
  const ws = await prepare('SELECT * FROM workspaces WHERE id = $?').get(id) as any;
  if (!ws) { res.status(404).json({ error: 'Workspace not found' }); return; }
  if (ws.ownerId !== userId) { res.status(403).json({ error: 'Only owner can remove members' }); return; }
  await prepare('DELETE FROM workspace_members WHERE workspaceId = $? AND userId = $?').run(id, memberId);
  res.json({ message: 'Member removed' });
});

// Update member role
router.put('/:id/members/:memberId/role', async (req: Request, res: Response) => {
  const { id, memberId } = req.params;
  const { role } = req.body;
  const userId = req.user!.userId;
  if (!['admin', 'member', 'viewer'].includes(role)) { res.status(400).json({ error: 'Invalid role' }); return; }
  const ws = await prepare('SELECT * FROM workspaces WHERE id = $?').get(id) as any;
  if (!ws) { res.status(404).json({ error: 'Workspace not found' }); return; }
  if (ws.ownerId !== userId) { res.status(403).json({ error: 'Only owner can change roles' }); return; }
  await prepare('UPDATE workspace_members SET role = $? WHERE workspaceId = $? AND userId = $?').run(role, id, memberId);
  res.json({ message: 'Role updated' });
});

// Add file/folder to workspace
router.post('/:id/items', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { itemId, itemType } = req.body;
  const userId = req.user!.userId;
  const membership = await prepare('SELECT * FROM workspace_members WHERE workspaceId = $? AND userId = $?').get(id, userId) as any;
  const ws = await prepare('SELECT * FROM workspaces WHERE id = $?').get(id) as any;
  if (!ws) { res.status(404).json({ error: 'Workspace not found' }); return; }
  if (ws.ownerId !== userId && (!membership || membership.role === 'viewer')) {
    res.status(403).json({ error: 'Access denied' }); return;
  }
  const existing = await prepare('SELECT * FROM workspace_items WHERE workspaceId = $? AND itemId = $?').get(id, itemId);
  if (existing) { res.status(409).json({ error: 'Item already in workspace' }); return; }
  const wiId = uuidv4();
  await prepare(
    'INSERT INTO workspace_items (id, workspaceId, itemId, itemType, addedBy, addedAt) VALUES ($?, $?, $?, $?, $?, NOW())'
  ).run(wiId, id, itemId, itemType || 'file', userId);
  res.status(201).json({ id: wiId, message: 'Item added to workspace' });
});

// List workspace items
router.get('/:id/items', async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const member = await prepare('SELECT * FROM workspace_members WHERE workspaceId = $? AND userId = $?').get(id, userId);
  const ws = await prepare('SELECT * FROM workspaces WHERE id = $?').get(id) as any;
  if (!ws) { res.status(404).json({ error: 'Workspace not found' }); return; }
  if (!member && ws.ownerId !== userId) { res.status(403).json({ error: 'Access denied' }); return; }
  const items = await prepare(`
    SELECT wi.*, f.name, f.originalName, f.mimeType, f.size, f.isFolder, f.folderId
    FROM workspace_items wi JOIN files f ON wi.itemId = f.id
    WHERE wi.workspaceId = $? ORDER BY wi.addedAt DESC
  `).all(id);
  res.json(items);
});

// Remove file/folder from workspace
router.delete('/:id/items/:itemId', async (req: Request, res: Response) => {
  const { id, itemId } = req.params;
  const userId = req.user!.userId;
  const membership = await prepare('SELECT * FROM workspace_members WHERE workspaceId = $? AND userId = $?').get(id, userId) as any;
  const ws = await prepare('SELECT * FROM workspaces WHERE id = $?').get(id) as any;
  if (!ws) { res.status(404).json({ error: 'Workspace not found' }); return; }
  if (ws.ownerId !== userId && (!membership || membership.role === 'viewer')) {
    res.status(403).json({ error: 'Access denied' }); return;
  }
  await prepare('DELETE FROM workspace_items WHERE workspaceId = $? AND itemId = $?').run(id, itemId);
  res.json({ message: 'Item removed from workspace' });
});

// Leave workspace
router.post('/:id/leave', async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const ws = await prepare('SELECT * FROM workspaces WHERE id = $?').get(id) as any;
  if (!ws) { res.status(404).json({ error: 'Workspace not found' }); return; }
  if (ws.ownerId === userId) { res.status(400).json({ error: 'Owner cannot leave workspace; transfer ownership or delete it' }); return; }
  await prepare('DELETE FROM workspace_members WHERE workspaceId = $? AND userId = $?').run(id, userId);
  await prepare('DELETE FROM workspace_items WHERE workspaceId = $? AND addedBy = $?').run(id, userId);
  res.json({ message: 'Left workspace' });
});

export default router;
