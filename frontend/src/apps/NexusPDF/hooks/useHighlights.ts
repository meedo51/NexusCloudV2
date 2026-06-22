import { useState, useCallback, useEffect, useRef } from 'react';
import { pdfApi, HighlightData } from '../services/pdfApi';
import { getPageEl, rectsViewportToPage, getToolbarPosition } from '../utils/pdfCoordinates';

export function useHighlights(
  fileId: string,
  textLayerRef: React.RefObject<HTMLDivElement | null>,
  pageContainerRef: React.RefObject<HTMLDivElement | null>,
  currentPage?: number,
  zoom?: number,
) {
  const [highlights, setHighlights] = useState<HighlightData[]>([]);
  const [selectedText, setSelectedText] = useState('');
  const [hlColor, setHlColor] = useState('yellow');
  const [showPopup, setShowPopup] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
  const [currentRects, setCurrentRects] = useState<{ x: number; y: number; width: number; height: number }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

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
    const tl = textLayerRef.current;
    if (!tl) return;

    let inside = false;
    let node: Node | null = range.startContainer;
    while (node) {
      if (node === tl) { inside = true; break; }
      node = node.parentNode;
    }
    if (!inside) { setShowPopup(false); setSelectedText(''); return; }

    const pageEl = getPageEl(tl.parentElement!);
    if (!pageEl) return;

    const rectsList = range.getClientRects();
    if (!rectsList.length) return;

    const vpRects = Array.from(rectsList);
    const pageRects = rectsViewportToPage(vpRects, pageEl, zoom || 1);
    const pos = getToolbarPosition(range, 10);

    setSelectedText(text);
    setCurrentRects(pageRects);
    setToolbarPos(pos);
    setShowPopup(true);
  }, [textLayerRef, zoom]);

  useEffect(() => {
    const onMouseUp = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(handleTextSelection, 100);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setShowPopup(false); setSelectedText(''); }
    };

    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keydown', onKeyDown);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
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
    } catch { /* ignore */ }
  }, [fileId, selectedText, hlColor, currentRects, currentPage]);

  const removeHighlight = useCallback(async (id: string) => {
    try {
      await pdfApi.deleteHighlight(id);
      setHighlights(prev => prev.filter(h => h.id !== id));
    } catch { /* ignore */ }
  }, []);

  const dismissPopup = useCallback(() => {
    setShowPopup(false);
    setSelectedText('');
  }, []);

  return {
    highlights, selectedText, hlColor, showPopup, toolbarPos, currentRects,
    setHlColor, applyHighlight, removeHighlight, dismissPopup,
  };
}
