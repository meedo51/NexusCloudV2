import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { prepare } from '../../database';
import path from 'path';
import fs from 'fs';

const router = Router();

router.use(authenticateToken);

router.get('/documents', async (req: Request, res: Response) => {
  const files = await prepare(
    "SELECT f.id, f.name, f.size, f.mimeType, f.createdAt, pm.pageCount FROM files f LEFT JOIN pdf_metadata pm ON pm.fileId = f.id WHERE f.userId = $? AND f.mimeType IN ('application/pdf', 'application/pdf+docupro') AND f.deletedAt IS NULL ORDER BY f.createdAt DESC"
  ).all((req as any).user.id);
  res.json(files);
});

router.get('/documents/:fileId', async (req: Request, res: Response) => {
  const file = await prepare('SELECT * FROM files WHERE id = $? AND userId = $?').get(req.params.fileId, (req as any).user.id);
  if (!file) return res.status(404).json({ error: 'File not found' });
  res.json(file);
});

router.post('/merge', async (req: Request, res: Response) => {
  const { fileIds } = req.body;
  if (!fileIds || fileIds.length < 2) return res.status(400).json({ error: 'At least two files required' });
  const { PDFDocument } = require('pdf-lib');
  const mergedPdf = await PDFDocument.create();
  for (const fid of fileIds) {
    const file = await prepare('SELECT * FROM files WHERE id = $? AND userId = $?').get(fid, (req as any).user.id);
    if (!file || !(file as any).path || !fs.existsSync((file as any).path)) continue;
    const srcBytes = fs.readFileSync((file as any).path);
    const srcPdf = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
    const srcPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
    srcPages.forEach((p: any) => mergedPdf.addPage(p));
  }
  const mergedBytes = await mergedPdf.save();
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  const outName = `merged-${Date.now()}.pdf`;
  const outPath = path.join(uploadDir, outName);
  fs.writeFileSync(outPath, mergedBytes);
  const fileId = require('uuid').v4();
  await prepare(
    'INSERT INTO files (id, userId, name, path, size, mimeType, extension, folderId, createdAt, updatedAt) VALUES ($?, $?, $?, $?, $?, $?, $?, $?, NOW(), NOW())'
  ).run(fileId, (req as any).user.id, `Merged-${Date.now()}.pdf`, outPath, mergedBytes.length, 'application/pdf', 'pdf', null);
  await prepare(
    'INSERT INTO pdf_metadata (fileId, pageCount, createdAt) VALUES ($?, $?, NOW())'
  ).run(fileId, mergedPdf.getPageCount());
  res.status(201).json({ message: 'PDFs merged', fileId, path: `/pdf/${fileId}` });
});

router.post('/annotate', async (req: Request, res: Response) => {
  const { fileId, annotations } = req.body;
  if (!fileId) return res.status(400).json({ error: 'fileId required' });
  const existing = await prepare('SELECT * FROM docupro_pdf_annotations WHERE fileId = $? AND userId = $?').get(fileId, (req as any).user.id);
  if (existing) {
    await prepare('UPDATE docupro_pdf_annotations SET annotations = $?, updatedAt = NOW() WHERE fileId = $?').run(JSON.stringify(annotations || []), fileId);
  } else {
    await prepare(
      'INSERT INTO docupro_pdf_annotations (id, fileId, userId, annotations, createdAt, updatedAt) VALUES ($?, $?, $?, $?, NOW(), NOW())'
    ).run(require('uuid').v4(), fileId, (req as any).user.id, JSON.stringify(annotations || []));
  }
  res.json({ message: 'Annotations saved' });
});

router.get('/annotations/:fileId', async (req: Request, res: Response) => {
  const rows = await prepare('SELECT * FROM docupro_pdf_annotations WHERE fileId = $? AND userId = $?').get(req.params.fileId, (req as any).user.id);
  res.json({ annotations: rows ? JSON.parse((rows as any).annotations) : [] });
});

router.post('/extract-text', async (req: Request, res: Response) => {
  const { fileId } = req.body;
  if (!fileId) return res.status(400).json({ error: 'fileId required' });
  const file = await prepare('SELECT * FROM files WHERE id = $? AND userId = $?').get(fileId, (req as any).user.id);
  if (!file || !(file as any).path || !fs.existsSync((file as any).path)) return res.status(404).json({ error: 'File not found' });
  const pdfParse = require('pdf-parse');
  const buf = fs.readFileSync((file as any).path);
  const data = await pdfParse(buf);
  res.json({ text: data.text, pageCount: data.numpages });
});

export default router;
