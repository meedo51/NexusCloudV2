import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { prepare } from '../database';

const router = Router();

// List user documents
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const docs = await prepare(
    'SELECT * FROM documents WHERE ownerId = $1 ORDER BY updatedAt DESC'
  ).all(userId);
  res.json(docs);
});

// Create document
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const { name, content, templateId, folderId } = req.body as {
    name?: string; content?: string; templateId?: string; folderId?: string;
  };
  const docName = name || templateId || 'Untitled Document';
  const docContent = content || '';
  const doc = await prepare(
    `INSERT INTO documents (name, content, ownerId, folderId, templateId)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`
  ).get(docName, docContent, userId, folderId || null, templateId || null);
  res.status(201).json(doc);
});

// Get document
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const docId = req.params.id as string;
  const doc = await prepare(
    'SELECT * FROM documents WHERE id = $1 AND ownerId = $2'
  ).get(docId, userId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json(doc);
});

// Update document content
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId as string;
    const docId = req.params.id as string;
    const { content, name, wordCount, characterCount } = req.body as {
      content?: string; name?: string; wordCount?: number; characterCount?: number;
    };
    const existing = await prepare(
      'SELECT * FROM documents WHERE id = $? AND ownerId = $?'
    ).get(docId, userId) as any;
    if (!existing) return res.status(404).json({ error: 'Document not found' });

    // Save version backup (best-effort)
    try {
      await prepare(
        `INSERT INTO document_versions (documentId, content, versionNumber, wordCount, savedBy)
         VALUES ($?, $?, $?, $?, $?)`
      ).run(docId, existing.content, existing.version, existing.wordCount, userId);
    } catch (verr: any) {
      console.error('Version backup failed (non-fatal):', verr.message);
    }

    const newVersion = existing.version + 1;
    const updated = await prepare(
      `UPDATE documents SET
        content = COALESCE($?, content),
        name = COALESCE($?, name),
        wordCount = COALESCE($?, wordCount),
        characterCount = COALESCE($?, characterCount),
        version = $?,
        updatedAt = NOW()
       WHERE id = $? RETURNING *`
    ).get(
      content ?? null, name ?? null,
      wordCount ?? null, characterCount ?? null,
      newVersion, docId
    );
    res.json(updated);
  } catch (err: any) {
    console.error('Document update error:', err.message, err.stack);
    res.status(500).json({ error: 'Document update failed', detail: err.message });
  }
});

// Delete document
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const docId = req.params.id as string;
  await prepare('DELETE FROM documents WHERE id = $1 AND ownerId = $2').run(docId, userId);
  res.json({ message: 'Document deleted' });
});

// Get version history
router.get('/:id/versions', authenticateToken, async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const docId = req.params.id as string;
  const versions = await prepare(
    'SELECT * FROM document_versions WHERE documentId = $1 ORDER BY versionNumber DESC'
  ).all(docId);
  res.json(versions);
});

// Restore version
router.post('/:id/restore', authenticateToken, async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const docId = req.params.id as string;
  const { versionId } = req.body as { versionId: string };
  const version = await prepare(
    'SELECT * FROM document_versions WHERE id = $1 AND documentId = $2'
  ).get(versionId, docId) as any;
  if (!version) return res.status(404).json({ error: 'Version not found' });
  const updated = await prepare(
    `UPDATE documents SET content = $1, wordCount = $2, version = version + 1, updatedAt = NOW()
     WHERE id = $3 RETURNING *`
  ).get(version.content, version.wordCount, docId);
  res.json(updated);
});

// Export document
router.post('/:id/export', authenticateToken, async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const docId = req.params.id as string;
  const { format } = req.body as { format?: string };
  const doc = await prepare(
    'SELECT * FROM documents WHERE id = $1 AND ownerId = $2'
  ).get(docId, userId) as any;
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const exportFormat = format || 'html';
  const filename = doc.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const exportDir = process.env.EXPORT_DIR || './exports';
  const fs = await import('fs');
  const path = await import('path');
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

  const extMap: Record<string, string> = { html: 'html', pdf: 'pdf', md: 'md', txt: 'txt' };
  const ext = extMap[exportFormat] || 'html';
  const filePath = path.join(exportDir, `${filename}_${docId.slice(0, 8)}.${ext}`);
  fs.writeFileSync(filePath, doc.content, 'utf-8');
  res.json({ message: 'Exported', path: filePath, format: exportFormat });
});

// List templates
router.get('/templates', (_req: Request, res: Response) => {
  const templates = [
    { id: 'blank', name: 'Blank Document', category: 'general', content: '' },
    { id: 'resume', name: 'Resume', category: 'professional', content: '<h1>Your Name</h1><p>Email | Phone | LinkedIn</p><hr><h2>Experience</h2><h3>Job Title - Company</h3><p>Description</p><h2>Education</h2><h3>Degree - School</h3><p>Year - Year</p><h2>Skills</h2><ul><li>Skill 1</li><li>Skill 2</li></ul>' },
    { id: 'letter', name: 'Cover Letter', category: 'professional', content: '<p>Date</p><p>Hiring Manager<br>Company Name</p><p>Dear Hiring Manager,</p><p>I am writing to express my interest in...</p><p>Sincerely,<br>Your Name</p>' },
    { id: 'report', name: 'Report', category: 'business', content: '<h1>Report Title</h1><h2>Executive Summary</h2><p>Summary here.</p><h2>Findings</h2><p>Content.</p><h2>Conclusion</h2><p>Conclusion here.</p>' },
    { id: 'invoice', name: 'Invoice', category: 'business', content: '<h1>INVOICE</h1><p><strong>Invoice #:</strong> 001</p><p><strong>Date:</strong> 2025-01-01</p><hr><table><tr><th>Item</th><th>Qty</th><th>Price</th></tr><tr><td>Service</td><td>1</td><td>$0.00</td></tr></table><hr><p><strong>Total: $0.00</strong></p>' },
    { id: 'notes', name: 'Meeting Notes', category: 'personal', content: '<h1>Meeting Notes</h1><p><strong>Date:</strong> <br><strong>Attendees:</strong></p><h2>Agenda</h2><ol><li>Topic 1</li><li>Topic 2</li></ol><h2>Action Items</h2><ul><li><span>Item 1</span></li><li><span>Item 2</span></li></ul>' },
    { id: 'todo', name: 'To-Do List', category: 'personal', content: '<h1>To-Do List</h1><ul data-type="taskList"><li data-type="taskItem" data-checked="false">Task 1</li><li data-type="taskItem" data-checked="false">Task 2</li><li data-type="taskItem" data-checked="false">Task 3</li></ul>' },
    { id: 'blog', name: 'Blog Post', category: 'writing', content: '<h1>Blog Post Title</h1><p>By Author Name</p><p>Introduction paragraph...</p><h2>Section 1</h2><p>Content here.</p><h2>Section 2</h2><p>More content.</p><p>Conclusion.</p>' },
    { id: 'proposal', name: 'Project Proposal', category: 'business', content: '<h1>Project Proposal</h1><h2>Overview</h2><p>Brief description.</p><h2>Goals</h2><ul><li>Goal 1</li><li>Goal 2</li></ul><h2>Timeline</h2><table><tr><th>Phase</th><th>Duration</th></tr><tr><td>Phase 1</td><td>Week 1-2</td></tr><tr><td>Phase 2</td><td>Week 3-4</td></tr></table><h2>Budget</h2><p>$0.00</p>' },
    { id: 'essay', name: 'Essay', category: 'academic', content: '<h1>Title</h1><p>Introduction with thesis statement.</p><h2>Body Paragraph 1</h2><p>Topic sentence and supporting evidence.</p><h2>Body Paragraph 2</h2><p>Topic sentence and supporting evidence.</p><h2>Conclusion</h2><p>Restate thesis and summarize.</p><p>References</p>' },
    { id: 'readme', name: 'README', category: 'technical', content: '<h1>Project Name</h1><p>Description of the project.</p><h2>Installation</h2><pre><code>npm install</code></pre><h2>Usage</h2><pre><code>npm start</code></pre><h2>License</h2><p>MIT</p>' },
  ];
  res.json(templates);
});

export default router;


