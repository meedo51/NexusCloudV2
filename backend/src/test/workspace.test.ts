import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../index';
import { getTable } from './mock-db';

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

describe('Team Workspaces with RBAC', () => {
  let adminToken: string;
  let memberToken: string;
  let workspaceId: string;

  beforeEach(async () => {
    // Register admin user
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'alice@test.com', password: 'pass123' });
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'alice', password: 'pass123' });
    adminToken = adminLogin.body.token;

    // Register member user
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'bob', email: 'bob@test.com', password: 'pass123' });
    const memberLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'bob', password: 'pass123' });
    memberToken = memberLogin.body.token;
  });

  describe('Workspace CRUD', () => {
    it('should create a workspace', async () => {
      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'My Project', description: 'A test workspace' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('My Project');
      expect(res.body.description).toBe('A test workspace');
      expect(res.body.ownerId).toBeTruthy();
      workspaceId = res.body.id;
    });

    it('should require name when creating workspace', async () => {
      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'No name' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Workspace name is required');
    });

    it('should list workspaces for owner', async () => {
      await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'My Project' });

      const res = await request(app)
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].name).toBe('My Project');
    });

    it('should get workspace details', async () => {
      const create = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Detail Test' });
      const wid = create.body.id;

      const res = await request(app)
        .get(`/api/workspaces/${wid}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Detail Test');
      expect(res.body.members).toBeDefined();
      expect(Array.isArray(res.body.members)).toBe(true);
    });

    it('should update workspace name and description', async () => {
      const create = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Old Name' });
      const wid = create.body.id;

      const res = await request(app)
        .put(`/api/workspaces/${wid}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Name', description: 'Updated desc' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('New Name');
    });

    it('should not allow non-owner to update workspace', async () => {
      const create = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Owner Only' });
      const wid = create.body.id;

      const res = await request(app)
        .put(`/api/workspaces/${wid}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Hacked' });
      expect(res.status).toBe(403);
    });

    it('should delete workspace', async () => {
      const create = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'To Delete' });
      const wid = create.body.id;

      const res = await request(app)
        .delete(`/api/workspaces/${wid}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      // Verify it's gone
      const get = await request(app)
        .get(`/api/workspaces/${wid}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(get.status).toBe(404);
    });

    it('should not allow non-owner to delete workspace', async () => {
      const create = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Safe' });
      const wid = create.body.id;

      const res = await request(app)
        .delete(`/api/workspaces/${wid}`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Invite and Member Management', () => {
    it('should invite a user by email', async () => {
      const create = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Team Space' });
      const wid = create.body.id;

      const res = await request(app)
        .post(`/api/workspaces/${wid}/invite`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'bob@test.com', role: 'member' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
      expect(res.body.email).toBe('bob@test.com');
    });

    it('should not invite a non-existent email', async () => {
      const create = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Team Space' });
      const wid = create.body.id;

      const res = await request(app)
        .post(`/api/workspaces/${wid}/invite`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'nobody@test.com', role: 'member' });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found with that email');
    });

    it('should not allow member role to invite', async () => {
      const create = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Team Space' });
      const wid = create.body.id;

      // Member tries to invite
      const res = await request(app)
        .post(`/api/workspaces/${wid}/invite`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ email: 'someone@test.com', role: 'member' });
      expect(res.status).toBe(403);
    });

    it('should accept an invitation', async () => {
      const create = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Team Space' });
      const wid = create.body.id;

      const invite = await request(app)
        .post(`/api/workspaces/${wid}/invite`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'bob@test.com', role: 'member' });
      const { token } = invite.body;

      const res = await request(app)
        .post(`/api/workspaces/invite/${token}/accept`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Joined workspace successfully');
      expect(res.body.workspaceId).toBe(wid);
    });

    it('should see workspace in member list after accepting', async () => {
      const create = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Team Space' });
      const wid = create.body.id;

      const invite = await request(app)
        .post(`/api/workspaces/${wid}/invite`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'bob@test.com', role: 'member' });

      await request(app)
        .post(`/api/workspaces/invite/${invite.body.token}/accept`)
        .set('Authorization', `Bearer ${memberToken}`);

      const res = await request(app)
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${memberToken}`);
      const found = res.body.find((w: any) => w.id === wid);
      expect(found).toBeTruthy();
      expect(found.role).toBe('member');
    });

    it('should reject expired invitation', async () => {
      const create = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Team Space' });
      const wid = create.body.id;

      const invite = await request(app)
        .post(`/api/workspaces/${wid}/invite`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'bob@test.com', role: 'member' });
      const { token } = invite.body;

      // Manually expire the invite
      const invites = getTable('workspace_invites');
      const inv = invites.find((i: any) => i.token === token);
      if (inv) inv.expiresAt = new Date(Date.now() - 1000);

      const res = await request(app)
        .post(`/api/workspaces/invite/${token}/accept`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Invalid or expired invitation');
    });

    it('should reject invitation for wrong email', async () => {
      // Register a third user
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'charlie', email: 'charlie@test.com', password: 'pass123' });
      const charlieLogin = await request(app)
        .post('/api/auth/login')
        .send({ username: 'charlie', password: 'pass123' });
      const charlieToken = charlieLogin.body.token;

      const create = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Team Space' });
      const wid = create.body.id;

      const invite = await request(app)
        .post(`/api/workspaces/${wid}/invite`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'bob@test.com', role: 'member' });

      // Charlie tries to accept Bob's invite
      const res = await request(app)
        .post(`/api/workspaces/invite/${invite.body.token}/accept`)
        .set('Authorization', `Bearer ${charlieToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('This invitation is for a different email');
    });

    it('should list pending invites', async () => {
      const create = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Team Space' });
      const wid = create.body.id;

      await request(app)
        .post(`/api/workspaces/${wid}/invite`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'bob@test.com', role: 'member' });

      const res = await request(app)
        .get(`/api/workspaces/${wid}/invites`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Role Management', () => {
    it('should change a member role', async () => {
      const create = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Team Space' });
      const wid = create.body.id;

      // Invite and accept
      const invite = await request(app)
        .post(`/api/workspaces/${wid}/invite`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'bob@test.com', role: 'member' });
      await request(app)
        .post(`/api/workspaces/invite/${invite.body.token}/accept`)
        .set('Authorization', `Bearer ${memberToken}`);

      // Get member info
      const detail = await request(app)
        .get(`/api/workspaces/${wid}`)
        .set('Authorization', `Bearer ${adminToken}`);
      const bobMember = detail.body.members.find((m: any) => m.email === 'bob@test.com');

      // Change role to viewer
      const roleRes = await request(app)
        .put(`/api/workspaces/${wid}/members/${bobMember.userId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'viewer' });
      expect(roleRes.status).toBe(200);
      expect(roleRes.body.message).toBe('Role updated');
    });

    it('should not allow non-owner to change roles', async () => {
      const create = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Team Space' });
      const wid = create.body.id;

      const invite = await request(app)
        .post(`/api/workspaces/${wid}/invite`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'bob@test.com', role: 'member' });
      await request(app)
        .post(`/api/workspaces/invite/${invite.body.token}/accept`)
        .set('Authorization', `Bearer ${memberToken}`);

      const detail = await request(app)
        .get(`/api/workspaces/${wid}`)
        .set('Authorization', `Bearer ${adminToken}`);
      const bobMember = detail.body.members.find((m: any) => m.email === 'bob@test.com');

      const roleRes = await request(app)
        .put(`/api/workspaces/${wid}/members/${bobMember.userId}/role`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ role: 'viewer' });
      expect(roleRes.status).toBe(403);
    });

    it('should reject invalid role', async () => {
      const create = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Team Space' });
      const wid = create.body.id;

      const res = await request(app)
        .put(`/api/workspaces/${wid}/members/some-user/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'superadmin' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid role');
    });

    it('should remove a member', async () => {
      const create = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Team Space' });
      const wid = create.body.id;

      const invite = await request(app)
        .post(`/api/workspaces/${wid}/invite`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'bob@test.com', role: 'member' });
      await request(app)
        .post(`/api/workspaces/invite/${invite.body.token}/accept`)
        .set('Authorization', `Bearer ${memberToken}`);

      const detail = await request(app)
        .get(`/api/workspaces/${wid}`)
        .set('Authorization', `Bearer ${adminToken}`);
      const bobMember = detail.body.members.find((m: any) => m.email === 'bob@test.com');

      const res = await request(app)
        .delete(`/api/workspaces/${wid}/members/${bobMember.userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Member removed');
    });

    it('should not allow non-owner to remove members', async () => {
      const create = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Team Space' });
      const wid = create.body.id;

      const invite = await request(app)
        .post(`/api/workspaces/${wid}/invite`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'bob@test.com', role: 'member' });
      await request(app)
        .post(`/api/workspaces/invite/${invite.body.token}/accept`)
        .set('Authorization', `Bearer ${memberToken}`);

      const res = await request(app)
        .delete(`/api/workspaces/${wid}/members/${adminToken}`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Leave Workspace', () => {
    it('should allow member to leave workspace', async () => {
      const create = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Team Space' });
      const wid = create.body.id;

      const invite = await request(app)
        .post(`/api/workspaces/${wid}/invite`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'bob@test.com', role: 'member' });
      await request(app)
        .post(`/api/workspaces/invite/${invite.body.token}/accept`)
        .set('Authorization', `Bearer ${memberToken}`);

      const res = await request(app)
        .post(`/api/workspaces/${wid}/leave`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Left workspace');
    });

    it('should not allow owner to leave workspace', async () => {
      const create = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'My Space' });
      const wid = create.body.id;

      const res = await request(app)
        .post(`/api/workspaces/${wid}/leave`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Owner cannot leave workspace; transfer ownership or delete it');
    });
  });

  describe('Workspace Items', () => {
    it('should add and list items in workspace', async () => {
      const create = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Shared Files' });
      const wid = create.body.id;

      // Create a file first
      const fileRow = {
        id: 'test-file-id-1',
        name: 'report.pdf',
        originalname: 'report.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        path: '/uploads/report.pdf',
        folderid: null,
        userid: getTable('users')[0].id,
        isfolder: false,
        deletedat: null,
        createdat: new Date(),
        updatedat: new Date(),
      };
      getTable('files').push(fileRow);

      // Add to workspace
      const addRes = await request(app)
        .post(`/api/workspaces/${wid}/items`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ itemId: 'test-file-id-1', itemType: 'file' });
      expect(addRes.status).toBe(201);

      // List items
      const listRes = await request(app)
        .get(`/api/workspaces/${wid}/items`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body)).toBe(true);
      expect(listRes.body.length).toBe(1);
      expect(listRes.body[0].name).toBe('report.pdf');
    });

    it('should not allow viewer to add items', async () => {
      const create = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'View Only' });
      const wid = create.body.id;

      // Invite bob as viewer
      const invite = await request(app)
        .post(`/api/workspaces/${wid}/invite`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'bob@test.com', role: 'viewer' });
      await request(app)
        .post(`/api/workspaces/invite/${invite.body.token}/accept`)
        .set('Authorization', `Bearer ${memberToken}`);

      const fileRow = {
        id: 'test-file-id-2', name: 'secret.txt', originalname: 'secret.txt',
        mimetype: 'text/plain', size: 100, path: '/uploads/secret.txt',
        folderid: null, userid: getTable('users')[0].id, isfolder: false,
        deletedat: null, createdat: new Date(), updatedat: new Date(),
      };
      getTable('files').push(fileRow);

      const res = await request(app)
        .post(`/api/workspaces/${wid}/items`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ itemId: 'test-file-id-2', itemType: 'file' });
      expect(res.status).toBe(403);
    });

    it('should remove item from workspace', async () => {
      const create = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Shared Files' });
      const wid = create.body.id;

      const fileRow = {
        id: 'test-file-id-3', name: 'doc.docx', originalname: 'doc.docx',
        mimetype: 'application/docx', size: 2048, path: '/uploads/doc.docx',
        folderid: null, userid: getTable('users')[0].id, isfolder: false,
        deletedat: null, createdat: new Date(), updatedat: new Date(),
      };
      getTable('files').push(fileRow);

      await request(app)
        .post(`/api/workspaces/${wid}/items`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ itemId: 'test-file-id-3', itemType: 'file' });

      const res = await request(app)
        .delete(`/api/workspaces/${wid}/items/test-file-id-3`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Item removed from workspace');
    });
  });

  describe('Authentication', () => {
    it('should require auth for all workspace endpoints', async () => {
      const endpoints = [
        ['get', '/api/workspaces'],
        ['post', '/api/workspaces'],
        ['get', '/api/workspaces/some-id'],
        ['put', '/api/workspaces/some-id'],
        ['delete', '/api/workspaces/some-id'],
        ['post', '/api/workspaces/some-id/invite'],
        ['post', '/api/workspaces/invite/some-token/accept'],
      ] as const;

      for (const [method, path] of endpoints) {
        const res = await (request(app) as any)[method](path).send({});
        expect(res.status).toBe(401);
      }
    });
  });
});
