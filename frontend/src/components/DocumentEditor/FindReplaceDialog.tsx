import { useState, useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiChevronUp, FiChevronDown, FiEdit3 } from 'react-icons/fi';
import { findReplacePluginKey, searchText as findInDoc } from '../../extensions/FindReplaceExtension';

interface FindReplaceDialogProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function FindReplaceDialog({ editor, isOpen, onClose }: FindReplaceDialogProps) {
  const [search, setSearch] = useState('');
  const [replace, setReplace] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [results, setResults] = useState<{ from: number; to: number }[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showReplace, setShowReplace] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectMatch = useCallback((match: { from: number; to: number }) => {
    if (!editor) return;
    const sel = TextSelection.create(editor.state.doc, match.from, match.to);
    editor.view.dispatch(editor.state.tr.setSelection(sel));
    editor.view.focus();
  }, [editor]);

  const updatePluginState = useCallback((matches: { from: number; to: number }[], idx: number) => {
    if (!editor) return;
    editor.view.dispatch(editor.state.tr.setMeta(findReplacePluginKey, {
      results: matches,
      options: { searchText: search, replaceText: replace, caseSensitive, activeIndex: idx },
    }));
  }, [editor, search, replace, caseSensitive]);

  const updateResults = useCallback((searchText: string, sensitive: boolean) => {
    if (!editor) {
      setResults([]);
      setActiveIndex(0);
      return;
    }
    if (!searchText) {
      setResults([]);
      setActiveIndex(0);
      updatePluginState([], 0);
      return;
    }
    const matches = findInDoc(editor.state.doc, searchText, sensitive);
    setResults(matches);
    setActiveIndex(0);
    updatePluginState(matches, 0);
    if (matches.length > 0) {
      selectMatch(matches[0]);
    }
  }, [editor, updatePluginState, selectMatch]);

  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateResults(search, caseSensitive);
    }, 150);
    return () => clearTimeout(timer);
  }, [search, caseSensitive, updateResults]);

  const navigateMatch = useCallback((direction: 'next' | 'prev') => {
    if (!editor || results.length === 0) return;
    const newIndex = direction === 'next'
      ? (activeIndex + 1) % results.length
      : (activeIndex - 1 + results.length) % results.length;
    setActiveIndex(newIndex);
    const match = results[newIndex];
    updatePluginState(results, newIndex);
    selectMatch(match);
  }, [editor, results, activeIndex, updatePluginState, selectMatch]);

  const replaceCurrent = useCallback(() => {
    if (!editor || results.length === 0 || !replace) return;
    const match = results[activeIndex];
    editor.chain().focus().insertContentAt(
      { from: match.from, to: match.to },
      replace
    ).run();
    const newResults = [...results];
    newResults.splice(activeIndex, 1);
    setResults(newResults);
    if (newResults.length > 0) {
      const newIndex = Math.min(activeIndex, newResults.length - 1);
      setActiveIndex(newIndex);
      const next = newResults[newIndex];
      updatePluginState(newResults, newIndex);
      selectMatch(next);
    } else {
      updatePluginState([], 0);
    }
    editor.view.focus();
  }, [editor, results, activeIndex, search, replace, caseSensitive, updatePluginState, selectMatch]);

  const replaceAll = useCallback(() => {
    if (!editor || results.length === 0 || !replace) return;
    let tr = editor.state.tr;
    const sorted = [...results].sort((a, b) => b.from - a.from);
    for (const match of sorted) {
      tr = tr.replaceWith(match.from, match.to, editor.state.schema.text(replace));
    }
    editor.view.dispatch(tr.setMeta(findReplacePluginKey, {
      results: [],
      options: { searchText: '', replaceText: replace, caseSensitive, activeIndex: 0 },
    }));
    setResults([]);
    setActiveIndex(0);
    editor.view.focus();
  }, [editor, results, replace, caseSensitive]);

  const clearSearch = useCallback(() => {
    setSearch('');
    setResults([]);
    setActiveIndex(0);
    updatePluginState([], 0);
    editor?.view.focus();
  }, [editor, updatePluginState]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed top-20 right-4 z-50 w-80"
        >
          <div className="glass-strong rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
              <span className="text-xs text-white/60 font-medium">
                {results.length > 0 ? `${activeIndex + 1} of ${results.length} matches` : 'Find'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowReplace(!showReplace)}
                  className={`p-1.5 rounded-lg text-xs transition-all ${
                    showReplace ? 'text-cyan bg-cyan/10' : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                  title="Toggle replace"
                >
                  <FiEdit3 size={13} />
                </button>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
                  <FiX size={14} />
                </button>
              </div>
            </div>

            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') navigateMatch(e.shiftKey ? 'prev' : 'next');
                      if (e.key === 'Escape') onClose();
                    }}
                    placeholder="Find..."
                    className="w-full px-3 py-1.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none border border-white/5 focus:border-cyan/30 transition-colors"
                  />
                  {search && (
                    <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                      <FiX size={13} />
                    </button>
                  )}
                </div>
                <div className="flex gap-0.5">
                  <button
                    onClick={() => navigateMatch('prev')}
                    disabled={results.length === 0}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed"
                    title="Previous match (Shift+Enter)"
                  >
                    <FiChevronUp size={15} />
                  </button>
                  <button
                    onClick={() => navigateMatch('next')}
                    disabled={results.length === 0}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed"
                    title="Next match (Enter)"
                  >
                    <FiChevronDown size={15} />
                  </button>
                </div>
              </div>

              <button
                onClick={() => setCaseSensitive(!caseSensitive)}
                className={`text-xs px-2 py-1 rounded-lg transition-all ${
                  caseSensitive ? 'bg-cyan/10 text-cyan' : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                Aa
              </button>

              {showReplace && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="space-y-2 pt-1"
                >
                  <input
                    type="text"
                    value={replace}
                    onChange={e => setReplace(e.target.value)}
                    placeholder="Replace with..."
                    className="w-full px-3 py-1.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none border border-white/5 focus:border-cyan/30 transition-colors"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={replaceCurrent}
                      disabled={results.length === 0}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-cyan/10 text-cyan text-xs font-medium hover:bg-cyan/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      Replace
                    </button>
                    <button
                      onClick={replaceAll}
                      disabled={results.length === 0}
                      className="flex-1 px-3 py-1.5 rounded-xl glass text-white/60 text-xs hover:text-white hover:bg-white/5 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      Replace All
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
