interface StatusBarProps {
  line: number;
  column: number;
  lineCount: number;
  language: string;
  encoding: string;
  spacesOrTabs: string;
  isDirty: boolean;
}

export default function StatusBar({ line, column, lineCount, language, encoding, spacesOrTabs, isDirty }: StatusBarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 glass-strong rounded-xl mt-2 flex-shrink-0 text-[11px] text-white/40">
      <div className="flex items-center gap-4">
        <span>{language}</span>
        <span>{encoding}</span>
        <span>{spacesOrTabs}</span>
      </div>
      <div className="flex items-center gap-4">
        {isDirty && <span className="text-coral font-medium animate-pulse">Unsaved</span>}
        <span>Ln {line}, Col {column}</span>
        <span>{lineCount} lines</span>
      </div>
    </div>
  );
}
