import fs from 'fs';
import path from 'path';

export async function extractText(filePath: string, mimeType: string, fileName: string): Promise<string | null> {
  if (!fs.existsSync(filePath)) return null;

  try {
    // TXT files
    if (mimeType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.csv') || fileName.endsWith('.json') || fileName.endsWith('.xml') || fileName.endsWith('.yaml') || fileName.endsWith('.yml') || fileName.endsWith('.log')) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content.substring(0, 100000); // Limit to 100KB
    }

    // PDF files
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      try {
        const pdfParse = require('pdf-parse');
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        return data.text ? data.text.substring(0, 100000) : null;
      } catch {
        return null;
      }
    }

    // DOCX files
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
      try {
        const mammoth = require('mammoth');
        const dataBuffer = fs.readFileSync(filePath);
        const result = await mammoth.extractRawText({ buffer: dataBuffer });
        return result.value ? result.value.substring(0, 100000) : null;
      } catch {
        return null;
      }
    }

    // HTML files
    if (mimeType === 'text/html' || fileName.endsWith('.html') || fileName.endsWith('.htm')) {
      const content = fs.readFileSync(filePath, 'utf-8');
      // Strip HTML tags
      const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return text.substring(0, 100000);
    }

    return null;
  } catch {
    return null;
  }
}

export function shouldExtract(mimeType: string, fileName: string): boolean {
  const extractableMimes = ['text/', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const extractableExts = ['.txt', '.md', '.csv', '.json', '.xml', '.yaml', '.yml', '.log', '.pdf', '.docx', '.html', '.htm'];
  if (extractableMimes.some(m => mimeType.startsWith(m))) return true;
  const ext = path.extname(fileName).toLowerCase();
  return extractableExts.includes(ext);
}
