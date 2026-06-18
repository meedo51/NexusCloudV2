import { useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';

interface UseAutoSaveProps {
  editor: Editor | null;
  documentId: string;
  onSave: (content: string, meta: { wordCount: number; characterCount: number }) => void;
  delay?: number;
}

export function useAutoSave({ editor, documentId, onSave, delay = 30000 }: UseAutoSaveProps) {
  const savedContentRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        const content = editor.getHTML();
        if (content !== savedContentRef.current) {
          savedContentRef.current = content;
          
          
          onSave(content, { wordCount: editor.storage.characterCount?.words?.() || 0, characterCount: editor.storage.characterCount?.characters?.() || 0 });
        }
      }, delay);
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [editor, documentId, onSave, delay]);
}



