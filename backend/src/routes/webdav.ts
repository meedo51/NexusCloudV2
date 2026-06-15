import { Router, Request, Response } from 'express';
import { prepare } from '../database';
import { FileEntry } from '../types';
const ENABLE_WEBDAV = process.env.ENABLE_WEBDAV !== 'false';

const router = Router();

if (ENABLE_WEBDAV) {
  try {
    const wfs = require('webdav-server').v2;
    const { ResourceType, HTTPMethods, Errors } = wfs;

    // Authenticate webdav user from Basic Auth
    async function authenticateWebDAV(auth: any): Promise<{ userId: string; username: string } | null> {
      if (!auth || !auth.username || !auth.password) return null;
      const bcrypt = require('bcryptjs');
      const user = await prepare('SELECT * FROM users WHERE email = $?').get(auth.username) as any;
      if (!user) return null;
      if (!bcrypt.compareSync(auth.password, user.passwordHash)) return null;
      return { userId: user.id, username: user.username };
    }

    class NexusCloudWebDAVResource {
      path: string;
      fileEntry: any;
      userId: string;
      constructor(path: string, fileEntry: any, userId: string) {
        this.path = path;
        this.fileEntry = fileEntry;
        this.userId = userId;
      }
    }

    // Custom WebDAV server using Express
    async function handlePropfind(req: Request, res: Response, path: string, depth: string) {
      const auth = parseBasicAuth(req);
      if (!auth) { res.status(401).setHeader('WWW-Authenticate', 'Basic realm="NexusCloud WebDAV"').end(); return; }
      const user = await authenticateWebDAV(auth);
      if (!user) { res.status(403).json({ error: 'Invalid credentials' }); return; }

      const resource = await resolveWebDAVPath(path, user.userId);
      if (!resource) { res.status(404).end(); return; }

      let entries: any[] = [];
      if (depth === '0') {
        entries = [resource];
      } else if (depth === '1') {
        entries = [resource];
        const children = await prepare(
          'SELECT * FROM files WHERE folderId = $? AND userId = $? AND deletedAt IS NULL'
        ).all(resource.fileEntry.id, user.userId) as FileEntry[];
        for (const child of children) {
          entries.push({ path: path + '/' + (child.isFolder ? child.name + '/' : child.originalName), fileEntry: child, userId: user.userId });
        }
      }

      const xml = generatePropfindResponse(entries, path);
      res.setHeader('Content-Type', 'application/xml; charset="utf-8"');
      res.setHeader('DAV', '1');
      res.status(207).send(xml);
    }

    async function handleGet(req: Request, res: Response, path: string) {
      const auth = parseBasicAuth(req);
      if (!auth) { res.status(401).setHeader('WWW-Authenticate', 'Basic realm="NexusCloud WebDAV"').end(); return; }
      const user = await authenticateWebDAV(auth);
      if (!user) { res.status(403).json({ error: 'Invalid credentials' }); return; }
      const resource = await resolveWebDAVPath(path, user.userId);
      if (!resource || resource.fileEntry.isFolder) { res.status(404).end(); return; }
      if (!fs.existsSync(resource.fileEntry.path)) { res.status(404).end(); return; }
      res.download(resource.fileEntry.path, resource.fileEntry.originalName);
    }

    async function handlePut(req: Request, res: Response, path: string) {
      const auth = parseBasicAuth(req);
      if (!auth) { res.status(401).setHeader('WWW-Authenticate', 'Basic realm="NexusCloud WebDAV"').end(); return; }
      const user = await authenticateWebDAV(auth);
      if (!user) { res.status(403).json({ error: 'Invalid credentials' }); return; }

      const parts = path.split('/').filter(Boolean);
      const fileName = parts.pop() || 'file';
      const parentPath = '/' + parts.join('/');
      const parent = await resolveWebDAVPath(parentPath, user.userId);

      // Find or create parent folder hierarchy
      let folderId: string | null = null;
      if (parts.length > 0) {
        if (!parent || !parent.fileEntry.isFolder) { res.status(409).end(); return; }
        folderId = parent.fileEntry.id;
      }

      const userId = user.userId;
      const { v4: uuidv4 } = require('uuid');
      const id = uuidv4();
      const userDir = pathModule.join(require('../middleware/upload').UPLOAD_DIR_PATH, userId);
      if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
      const ext = pathModule.extname(fileName);
      const safeName = `${id}${ext}`;
      const filePath = pathModule.join(userDir, safeName).replace(/\\/g, '/');

      const writeStream = fs.createWriteStream(filePath);
      req.pipe(writeStream);
      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', () => resolve());
        writeStream.on('error', reject);
      });

      const stats = fs.statSync(filePath);
      const mimeType = require('mime-types').lookup(fileName) || 'application/octet-stream';
      const now = new Date().toISOString();

      await prepare(
        `INSERT INTO files (id, name, originalName, mimeType, size, path, folderId, userId, isFolder, createdAt, updatedAt) VALUES ($?, $?, $?, $?, $?, $?, $?, $?, $?, $?, $?)`
      ).run(id, safeName, fileName, mimeType, stats.size, filePath, folderId, userId, false, now, now);

      await recalculateUsedStorage(userId);
      res.status(201).end();
    }

    async function handleDelete(req: Request, res: Response, path: string) {
      const auth = parseBasicAuth(req);
      if (!auth) { res.status(401).setHeader('WWW-Authenticate', 'Basic realm="NexusCloud WebDAV"').end(); return; }
      const user = await authenticateWebDAV(auth);
      if (!user) { res.status(403).json({ error: 'Invalid credentials' }); return; }
      const resource = await resolveWebDAVPath(path, user.userId);
      if (!resource) { res.status(404).end(); return; }
      await prepare('UPDATE files SET deletedAt = NOW() WHERE id = $?').run(resource.fileEntry.id);
      if (!resource.fileEntry.isFolder) {
        await prepare('DELETE FROM files WHERE id = $?').run(resource.fileEntry.id);
        if (fs.existsSync(resource.fileEntry.path)) fs.unlinkSync(resource.fileEntry.path);
      } else {
        const descendants = await prepare('SELECT * FROM files WHERE folderId = $? AND userId = $?').all(resource.fileEntry.id, user.userId) as FileEntry[];
        for (const d of descendants) {
          if (!d.isFolder) { if (fs.existsSync(d.path)) fs.unlinkSync(d.path); }
          await prepare('DELETE FROM files WHERE id = $?').run(d.id);
        }
        await prepare('DELETE FROM files WHERE id = $?').run(resource.fileEntry.id);
      }
      await recalculateUsedStorage(user.userId);
      res.status(204).end();
    }

    async function handleMkcol(req: Request, res: Response, path: string) {
      const auth = parseBasicAuth(req);
      if (!auth) { res.status(401).setHeader('WWW-Authenticate', 'Basic realm="NexusCloud WebDAV"').end(); return; }
      const user = await authenticateWebDAV(auth);
      if (!user) { res.status(403).json({ error: 'Invalid credentials' }); return; }
      const parts = path.split('/').filter(Boolean);
      const folderName = parts.pop() || 'folder';
      const parentPath = '/' + parts.join('/');
      const parent = await resolveWebDAVPath(parentPath, user.userId);
      let folderId: string | null = null;
      if (parts.length > 0) {
        if (!parent || !parent.fileEntry.isFolder) { res.status(409).end(); return; }
        folderId = parent.fileEntry.id;
      }
      const { v4: uuidv4 } = require('uuid');
      const id = uuidv4();
      const now = new Date().toISOString();
      await prepare(
        `INSERT INTO files (id, name, originalName, mimeType, size, path, folderId, userId, isFolder, createdAt, updatedAt) VALUES ($?, $?, $?, $?, $?, $?, $?, $?, $?, $?, $?)`
      ).run(id, folderName, folderName, 'application/folder', 0, '', folderId, user.userId, true, now, now);
      res.status(201).end();
    }

    async function handleMove(req: Request, res: Response, sourcePath: string) {
      const destPath = req.headers['destination'] as string;
      if (!destPath) { res.status(400).end(); return; }
      const destUrl = new URL(destPath);
      const dest = decodeURIComponent(destUrl.pathname).replace('/webdav', '');
      const auth = parseBasicAuth(req);
      if (!auth) { res.status(401).setHeader('WWW-Authenticate', 'Basic realm="NexusCloud WebDAV"').end(); return; }
      const user = await authenticateWebDAV(auth);
      if (!user) { res.status(403).json({ error: 'Invalid credentials' }); return; }
      const source = await resolveWebDAVPath(sourcePath, user.userId);
      if (!source) { res.status(404).end(); return; }
      const destParts = dest.split('/').filter(Boolean);
      const newName = destParts.pop() || '';
      const destParentPath = '/' + destParts.join('/');
      const destParent = await resolveWebDAVPath(destParentPath, user.userId);
      let destFolderId: string | null = null;
      if (destParts.length > 0) {
        if (!destParent || !destParent.fileEntry.isFolder) { res.status(409).end(); return; }
        destFolderId = destParent.fileEntry.id;
      }
      const updatedAt = new Date().toISOString();
      if (source.fileEntry.isFolder) {
        await prepare('UPDATE files SET name = $?, originalName = $?, folderId = $?, updatedAt = $? WHERE id = $?').run(newName, newName, destFolderId, updatedAt, source.fileEntry.id);
      } else {
        const ext = pathModule.extname(source.fileEntry.name);
        const finalName = newName.endsWith(ext) ? newName : `${newName}${ext}`;
        await prepare('UPDATE files SET name = $?, originalName = $?, folderId = $?, updatedAt = $? WHERE id = $?').run(finalName, newName, destFolderId, updatedAt, source.fileEntry.id);
      }
      res.status(204).end();
    }

    async function handleCopy(req: Request, res: Response, sourcePath: string) {
      const destPath = req.headers['destination'] as string;
      if (!destPath) { res.status(400).end(); return; }
      const destUrl = new URL(destPath);
      const dest = decodeURIComponent(destUrl.pathname).replace('/webdav', '');
      const auth = parseBasicAuth(req);
      if (!auth) { res.status(401).setHeader('WWW-Authenticate', 'Basic realm="NexusCloud WebDAV"').end(); return; }
      const user = await authenticateWebDAV(auth);
      if (!user) { res.status(403).json({ error: 'Invalid credentials' }); return; }
      const source = await resolveWebDAVPath(sourcePath, user.userId);
      if (!source) { res.status(404).end(); return; }
      const destParts = dest.split('/').filter(Boolean);
      destParts.pop(); // remove filename, keep parent
      const destParentPath = '/' + destParts.join('/');
      const destParent = await resolveWebDAVPath(destParentPath, user.userId);
      let destFolderId: string | null = null;
      if (destParts.length > 0) {
        if (!destParent || !destParent.fileEntry.isFolder) { res.status(409).end(); return; }
        destFolderId = destParent.fileEntry.id;
      }
      const { deepCopyEntry } = require('./files');
      // We import the deepCopy logic inline
      try {
        const { v4: uuidv4 } = require('uuid');
        const entry = source.fileEntry;
        const newId = uuidv4();
        const now = new Date().toISOString();
        if (entry.isFolder) {
          await prepare(`INSERT INTO files (id, name, originalName, mimeType, size, path, folderId, userId, isFolder, createdAt, updatedAt) VALUES ($?, $?, $?, $?, $?, $?, $?, $?, $?, $?, $?)`).run(newId, entry.name, entry.name, 'application/folder', 0, '', destFolderId, user.userId, true, now, now);
          const children = await prepare('SELECT * FROM files WHERE folderId = $? AND userId = $? AND deletedAt IS NULL').all(entry.id, user.userId) as FileEntry[];
          for (const child of children) {
            await copyFileRecursive(child, newId, user.userId);
          }
        } else {
          const ext = pathModule.extname(entry.name);
          const safeName = `${newId}${ext}`;
          const userDir = pathModule.join(require('../middleware/upload').UPLOAD_DIR_PATH, user.userId);
          if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
          const newPath = pathModule.join(userDir, safeName).replace(/\\/g, '/');
          if (fs.existsSync(entry.path)) fs.copyFileSync(entry.path, newPath);
          await prepare(`INSERT INTO files (id, name, originalName, mimeType, size, path, folderId, userId, isFolder, createdAt, updatedAt) VALUES ($?, $?, $?, $?, $?, $?, $?, $?, $?, $?, $?)`).run(newId, safeName, entry.originalName, entry.mimeType, entry.size, newPath, destFolderId, user.userId, false, now, now);
        }
        res.status(201).end();
      } catch {
        res.status(500).end();
      }
    }

    // Helper: resolve a WebDAV path to a file/folder entry
    async function resolveWebDAVPath(webdavPath: string, userId: string): Promise<{ path: string; fileEntry: any; userId: string } | null> {
      const parts = webdavPath.split('/').filter(Boolean);
      let currentId: string | null = null;
      let currentEntry: any = null;
      if (parts.length === 0) {
        // Root path - return a virtual "home" entry
        return { path: '/', fileEntry: { id: '', name: 'home', isFolder: true }, userId };
      }
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (currentId === null) {
          // Look in root (folderId IS NULL)
          currentEntry = await prepare(
            'SELECT * FROM files WHERE userId = $? AND folderId IS NULL AND (name = $? OR originalName = $?) AND deletedAt IS NULL'
          ).get(userId, part, part);
        } else {
          currentEntry = await prepare(
            'SELECT * FROM files WHERE userId = $? AND folderId = $? AND (name = $? OR originalName = $?) AND deletedAt IS NULL'
          ).get(userId, currentId, part, part);
        }
        if (!currentEntry) return null;
        currentId = currentEntry.isFolder ? currentEntry.id : null;
      }
      return currentEntry ? { path: webdavPath, fileEntry: currentEntry, userId } : null;
    }

    async function copyFileRecursive(entry: any, destFolderId: string, userId: string): Promise<void> {
      const { v4: uuidv4 } = require('uuid');
      const newId = uuidv4();
      const now = new Date().toISOString();
      if (entry.isFolder) {
        await prepare(`INSERT INTO files (id, name, originalName, mimeType, size, path, folderId, userId, isFolder, createdAt, updatedAt) VALUES ($?, $?, $?, $?, $?, $?, $?, $?, $?, $?, $?)`).run(newId, entry.name, entry.name, 'application/folder', 0, '', destFolderId, userId, true, now, now);
        const children = await prepare('SELECT * FROM files WHERE folderId = $? AND userId = $? AND deletedAt IS NULL').all(entry.id, userId) as FileEntry[];
        for (const child of children) await copyFileRecursive(child, newId, userId);
      } else {
        const ext = pathModule.extname(entry.name);
        const safeName = `${newId}${ext}`;
        const userDir = pathModule.join(require('../middleware/upload').UPLOAD_DIR_PATH, userId);
        if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
        const newPath = pathModule.join(userDir, safeName).replace(/\\/g, '/');
        if (fs.existsSync(entry.path)) fs.copyFileSync(entry.path, newPath);
        await prepare(`INSERT INTO files (id, name, originalName, mimeType, size, path, folderId, userId, isFolder, createdAt, updatedAt) VALUES ($?, $?, $?, $?, $?, $?, $?, $?, $?, $?, $?)`).run(newId, safeName, entry.originalName, entry.mimeType, entry.size, newPath, destFolderId, userId, false, now, now);
      }
    }

    function parseBasicAuth(req: Request): { username: string; password: string } | null {
      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Basic ')) return null;
      const base64 = authHeader.substring(6);
      const decoded = Buffer.from(base64, 'base64').toString('utf-8');
      const colonIdx = decoded.indexOf(':');
      if (colonIdx === -1) return null;
      return { username: decoded.substring(0, colonIdx), password: decoded.substring(colonIdx + 1) };
    }

    function generatePropfindResponse(entries: any[], basePath: string): string {
      let xml = '<?xml version="1.0" encoding="utf-8"?>\n<D:multistatus xmlns:D="DAV:">\n';
      for (const entry of entries) {
        const href = entry.path || basePath;
        const isFolder = entry.fileEntry.isFolder;
        const name = entry.fileEntry.originalName || entry.fileEntry.name || 'root';
        const size = entry.fileEntry.size || 0;
        const modTime = entry.fileEntry.updatedAt || entry.fileEntry.createdAt || new Date().toISOString();
        const created = entry.fileEntry.createdAt || modTime;
        xml += `<D:response>
<D:href>${href}</D:href>
<D:propstat>
<D:prop>
<D:displayname>${escapeXml(name)}</D:displayname>
<D:resourcetype>${isFolder ? '<D:collection/>' : ''}</D:resourcetype>
<D:getcontentlength>${size}</D:getcontentlength>
<D:getlastmodified>${new Date(modTime).toUTCString()}</D:getlastmodified>
<D:creationdate>${new Date(created).toISOString()}</D:creationdate>
<D:getcontenttype>${isFolder ? 'httpd/unix-directory' : (entry.fileEntry.mimeType || 'application/octet-stream')}</D:getcontenttype>
</D:prop>
<D:status>HTTP/1.1 200 OK</D:status>
</D:propstat>
</D:response>\n`;
      }
      xml += '</D:multistatus>';
      return xml;
    }

    function escapeXml(s: string): string {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    }

    // Mount WebDAV handler on router
    router.use((req: Request, res: Response, next) => {
      const method = req.method;
      let webdavPath = req.path;
      if (webdavPath.startsWith('/')) webdavPath = webdavPath;

      switch (method) {
        case 'PROPFIND': handlePropfind(req, res, webdavPath, req.headers['depth'] as string || '1'); return;
        case 'GET':
        case 'HEAD':
          handleGet(req, res, webdavPath); return;
        case 'PUT': handlePut(req, res, webdavPath); return;
        case 'DELETE': handleDelete(req, res, webdavPath); return;
        case 'MKCOL': handleMkcol(req, res, webdavPath); return;
        case 'MOVE': handleMove(req, res, webdavPath); return;
        case 'COPY': handleCopy(req, res, webdavPath); return;
        default: next();
      }
    });

    console.log('WebDAV enabled at /webdav');
  } catch (err) {
    console.warn('WebDAV setup failed:', err);
  }
}

// WebDAV settings info
router.get('/info', async (req: Request, res: Response) => {
  const user = req.user as any;
  const host = req.get('host') || 'localhost:4000';
  const protocol = req.protocol || 'http';
  res.json({
    url: `${protocol}://${host}/webdav`,
    username: user?.username || 'unknown',
    instructions: {
      windows: `Map network drive: ${protocol}://${host}/webdav (use your email and password)`,
      mac: 'Finder → Go → Connect to Server → enter the URL above',
      linux: `sudo mount -t davfs ${protocol}://${host}/webdav /mnt/nexuscloud`,
    },
  });
});

import pathModule from 'path';
import fs from 'fs';
import { recalculateUsedStorage } from '../database';

export default router;
