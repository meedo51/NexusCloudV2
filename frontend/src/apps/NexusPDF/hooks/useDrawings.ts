import { useState, useCallback, useEffect } from 'react';
import { pdfApi, DrawingData } from '../services/pdfApi';

export function useDrawings(fileId: string, currentPage: number) {
  const [drawings, setDrawings] = useState<DrawingData[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#00F0FF');
  const [brushSize, setBrushSize] = useState(3);

  const loadDrawings = useCallback(async () => {
    try {
      const data = await pdfApi.getDrawings(fileId, currentPage);
      setDrawings(data);
    } catch { /* ignore */ }
  }, [fileId, currentPage]);

  useEffect(() => { loadDrawings(); }, [loadDrawings]);

  const saveStroke = useCallback(async (strokes: { x: number; y: number }[][]) => {
    try {
      await pdfApi.addDrawing(fileId, {
        pageNumber: currentPage,
        strokes,
      });
      await loadDrawings();
    } catch { /* ignore */ }
  }, [fileId, currentPage, loadDrawings]);

  const clearPageDrawings = useCallback(async () => {
    try {
      const existing = await pdfApi.getDrawings(fileId, currentPage);
      for (const d of existing) {
        await pdfApi.deleteDrawing(d.id);
      }
      setDrawings([]);
    } catch { /* ignore */ }
  }, [fileId, currentPage]);

  return {
    drawings, isDrawing, color, brushSize,
    setIsDrawing, setColor, setBrushSize,
    saveStroke, clearPageDrawings, loadDrawings,
  };
}
