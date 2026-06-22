import { useState, useCallback, useEffect } from 'react';
import { pdfApi, NoteData } from '../services/pdfApi';

export function useNotes(fileId: string, currentPage: number) {
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [notePosition, setNotePosition] = useState({ x: 80, y: 80 });

  const loadNotes = useCallback(async () => {
    try {
      const data = await pdfApi.getNotes(fileId, currentPage);
      setNotes(data);
    } catch { /* ignore */ }
  }, [fileId, currentPage]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const addNote = useCallback(async () => {
    if (!noteContent.trim()) return;
    try {
      const note = await pdfApi.addNote(fileId, {
        pageNumber: currentPage,
        content: noteContent,
        x: notePosition.x,
        y: notePosition.y,
      });
      setNotes(prev => [note, ...prev]);
      setNoteContent('');
      setIsAddingNote(false);
      return note;
    } catch {
      return null;
    }
  }, [fileId, currentPage, noteContent, notePosition]);

  const removeNote = useCallback(async (id: string) => {
    try {
      await pdfApi.deleteNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch { /* ignore */ }
  }, []);

  return {
    notes, isAddingNote, noteContent, notePosition,
    setIsAddingNote, setNoteContent, setNotePosition,
    addNote, removeNote,
  };
}
