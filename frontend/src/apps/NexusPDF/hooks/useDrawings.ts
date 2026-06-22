import { useState, useCallback, useEffect, useRef } from 'react';
import { pdfApi, DrawingData } from '../services/pdfApi';

export function useDrawings(fileId: string, currentPage: number) {
  const [drawings, setDrawings] = useState<DrawingData[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStroke = useRef<{ x: number; y: number }[]>([]);
  const strokesRef = useRef<{ x: number; y: number }[][]>([]);

  const loadDrawings = useCallback(async () => {
    try {
      const data = await pdfApi.getDrawings(fileId, currentPage);
      setDrawings(data);
      strokesRef.current = data.flatMap(d => d.strokes);
    } catch { /* ignore */ }
  }, [fileId, currentPage]);

  useEffect(() => { loadDrawings(); }, [loadDrawings]);

  const addPoint = useCallback((x: number, y: number) => {
    if (!isDrawing) return;
    currentStroke.current.push({ x, y });
  }, [isDrawing]);

  const startStroke = useCallback((x: number, y: number) => {
    currentStroke.current = [{ x, y }];
    setIsDrawing(true);
  }, []);

  const endStroke = useCallback(async () => {
    if (currentStroke.current.length < 2) {
      currentStroke.current = [];
      setIsDrawing(false);
      return;
    }
    const stroke = [...currentStroke.current];
    strokesRef.current.push(stroke);

    try {
      await pdfApi.addDrawing(fileId, {
        pageNumber: currentPage,
        strokes: strokesRef.current,
      });
      await loadDrawings();
    } catch { /* ignore */ }

    currentStroke.current = [];
    setIsDrawing(false);
  }, [fileId, currentPage, loadDrawings]);

  const clearPageDrawings = useCallback(async () => {
    try {
      const existing = await pdfApi.getDrawings(fileId, currentPage);
      for (const d of existing) {
        await pdfApi.deleteDrawing(d.id);
      }
      strokesRef.current = [];
      setDrawings([]);
    } catch { /* ignore */ }
  }, [fileId, currentPage]);

  return {
    drawings, isDrawing, currentStroke,
    startStroke, addPoint, endStroke,
    clearPageDrawings, setIsDrawing,
  };
}
