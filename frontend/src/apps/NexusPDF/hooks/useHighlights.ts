import { useState, useCallback, useEffect, useRef } from 'react';
import { pdfApi, HighlightData } from '../services/pdfApi';

const COLOR_MAP: Record<string, string> = {
  yellow: '#FFD700',
  green: '#4ADE80',
  blue: '#60A5FA',
  pink: '#F472B6',
  purple: '#A78BFA',
};

export function useHighlights(fileId: string, containerRef: React.RefObject<HTMLDivElement | null>, currentPage?: number) {
  const [highlights, setHighlights] = useState<HighlightData[]>([]);
  const [selectedText, setSelectedText] = useState('');
  const [hlColor, setHlColor] = useState('yellow');
  const [showPopup, setShowPopup] = useState(false);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const [currentRects, setCurrentRects] = useState<{ x: number; y: number; width: number; height: number }[]>([]);
  const selCleanup = useRef<(() => void) | null>(null);

  const loadHighlights = useCallback(async () => {
    try {
      const data = await pdfApi.getHighlights(fileId);
      setHighlights(data);
    } catch { /* ignore */ }
  }, [fileId]);

  useEffect(() => { loadHighlights(); }, [loadHighlights]);

  const handleTextSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setShowPopup(false);
      setSelectedText('');
      return;
    }

    const text = sel.toString().trim();
    if (!text) return;

    const range = sel.getRangeAt(0);
    const container = containerRef.current;
    if (!container) return;

    let found = false;
    let node = range.startContainer;
    while (node) {
      if (node instanceof HTMLElement && container.contains(node)) {
        found = true;
        break;
      }
      if (node === container) { found = true; break; }
      node = node.parentNode as Node;
    }
    if (!found) return;

    const containerRect = container.getBoundingClientRect();
    const rects = range.getClientRects();
    const pageRects = Array.from(rects).map(r => ({
      x: r.left - containerRect.left,
      y: r.top - containerRect.top,
      width: r.width,
      height: r.height,
    }));

    const midX = pageRects.reduce((s, r) => s + r.x + r.width / 2, 0) / pageRects.length;
    const midY = pageRects.reduce((s, r) => s + r.y, 0) / pageRects.length;

    setSelectedText(text);
    setCurrentRects(pageRects);
    setShowPopup(true);
    setPopupPos({ x: midX, y: midY - 50 });
  }, [containerRef]);

  useEffect(() => {
    const onMouseUp = () => setTimeout(handleTextSelection, 50);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPopup(false);
        setSelectedText('');
      }
    };

    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchend', onMouseUp);
    document.addEventListener('keydown', onKeyDown);
    selCleanup.current = () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchend', onMouseUp);
      document.removeEventListener('keydown', onKeyDown);
    };
    return () => selCleanup.current?.();
  }, [handleTextSelection]);

  const applyHighlight = useCallback(async (color?: string) => {
    const c = color || hlColor;
    if (!selectedText) return;
    try {
      const hl = await pdfApi.addHighlight(fileId, {
        pageNumber: currentPage || 0,
        color: c,
        text: selectedText,
        rects: currentRects,
      });
      setHighlights(prev => [...prev, hl]);
      window.getSelection()?.removeAllRanges();
      setSelectedText('');
      setShowPopup(false);
    } catch {
      // ignore
    }
  }, [fileId, selectedText, hlColor, currentRects, currentPage]);

  const removeHighlight = useCallback(async (id: string) => {
    try {
      await pdfApi.deleteHighlight(id);
      setHighlights(prev => prev.filter(h => h.id !== id));
    } catch { /* ignore */ }
  }, []);

  const getHighlightColor = useCallback((color: string) => {
    return COLOR_MAP[color] || COLOR_MAP.yellow;
  }, []);

  return {
    highlights, selectedText, hlColor, showPopup, popupPos, currentRects,
    setHlColor, applyHighlight, removeHighlight, getHighlightColor,
  };
}
