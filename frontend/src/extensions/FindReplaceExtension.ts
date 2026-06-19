import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Extension } from '@tiptap/react';

export interface FindReplaceOptions {
  searchText: string;
  replaceText: string;
  caseSensitive: boolean;
  activeIndex: number;
}

const defaultOptions: FindReplaceOptions = {
  searchText: '',
  replaceText: '',
  caseSensitive: false,
  activeIndex: 0,
};

export const findReplacePluginKey = new PluginKey<{ results: { from: number; to: number }[]; options: FindReplaceOptions }>('findReplace');

export const FindReplaceExtension = Extension.create({
  name: 'findReplace',

  addOptions() {
    return { ...defaultOptions };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: findReplacePluginKey,
        state: {
          init() {
            return { results: [], options: { ...defaultOptions } };
          },
          apply(tr, prev) {
            const meta = tr.getMeta(findReplacePluginKey);
            if (meta) {
              return { results: meta.results || prev.results, options: meta.options || prev.options };
            }
            if (tr.docChanged && prev.results.length > 0) {
              return { results: [], options: prev.options };
            }
            return prev;
          },
        },
        props: {
          decorations(state) {
            const pluginState = findReplacePluginKey.getState(state);
            if (!pluginState || !pluginState.options.searchText || pluginState.results.length === 0) {
              return DecorationSet.empty;
            }
            const decorations: Decoration[] = [];
            pluginState.results.forEach((result, index) => {
              const isActive = index === pluginState.options.activeIndex;
              decorations.push(
                Decoration.inline(result.from, result.to, {
                  class: isActive
                    ? 'find-replace-active'
                    : 'find-replace-match',
                })
              );
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

export function searchText(doc: any, search: string, caseSensitive: boolean): { from: number; to: number }[] {
  if (!search) return [];
  const text = doc.textBetween(0, doc.content.size, '\n', '');
  const flags = caseSensitive ? 'g' : 'gi';
  const results: { from: number; to: number }[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
  while ((match = regex.exec(text)) !== null) {
    results.push({ from: match.index, to: match.index + match[0].length });
    if (!regex.global) break;
  }
  return results;
}
