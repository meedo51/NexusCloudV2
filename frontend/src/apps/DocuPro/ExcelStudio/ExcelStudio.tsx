import { useState, useEffect, useCallback, useRef } from 'react';
import { FiPlus, FiTrash2, FiSave, FiUpload, FiChevronLeft, FiChevronRight, FiGrid } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { docuproApi } from '../shared/services/api';
import AppLayout from '../shared/components/AppLayout';

interface Spreadsheet {
  id: string;
  name: string;
  data: Record<string, string>;
  rowCount: number;
  colCount: number;
  updatedAt: string;
}

const COLUMNS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const DEFAULT_ROWS = 50;
const DEFAULT_COLS = 26;

export default function ExcelStudio() {
  const [sheets, setSheets] = useState<Spreadsheet[]>([]);
  const [activeSheet, setActiveSheet] = useState<Spreadsheet | null>(null);
  const [cellData, setCellData] = useState<Record<string, string>>({});
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadSheets(); }, []);

  const loadSheets = async () => {
    try {
      const res = await docuproApi.excel.list();
      setSheets(res.data.spreadsheets || []);
    } catch { toast.error('Failed to load spreadsheets'); }
  };

  const createSheet = async () => {
    try {
      const res = await docuproApi.excel.create({ name: 'Untitled Spreadsheet' });
      const sheet = res.data;
      sheet.data = {};
      setSheets(prev => [sheet, ...prev]);
      setActiveSheet(sheet);
      setCellData({});
    } catch { toast.error('Failed to create spreadsheet'); }
  };

  const loadSheet = async (sheet: Spreadsheet) => {
    try {
      const res = await docuproApi.excel.get(sheet.id);
      const data = res.data.data || {};
      setActiveSheet(res.data);
      setCellData(data);
    } catch { toast.error('Failed to load spreadsheet'); }
  };

  const saveSheet = async () => {
    if (!activeSheet) return;
    setSaving(true);
    try {
      await docuproApi.excel.update(activeSheet.id, { data: cellData });
      setSheets(prev => prev.map(s => s.id === activeSheet.id ? { ...s, data: cellData } : s));
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const deleteSheet = async (id: string) => {
    try {
      await docuproApi.excel.delete(id);
      setSheets(prev => prev.filter(s => s.id !== id));
      if (activeSheet?.id === id) setActiveSheet(null);
      toast.success('Spreadsheet deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const getCellRef = (col: number, row: number) => `${COLUMNS[col]}${row + 1}`;

  const getCellValue = (col: number, row: number): string => {
    const ref = getCellRef(col, row);
    const val = cellData[ref];
    if (!val || !val.startsWith('=')) return val || '';
    try {
      const formula = val.slice(1).toUpperCase();
      if (formula.startsWith('SUM(')) {
        const match = formula.match(/SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/);
        if (match) {
          const [_, c1, r1, c2, r2] = match;
          let sum = 0;
          const col1 = COLUMNS.indexOf(c1);
          const col2 = COLUMNS.indexOf(c2);
          for (let r = parseInt(r1) - 1; r < parseInt(r2); r++) {
            for (let c = col1; c <= col2; c++) {
              const v = parseFloat(cellData[`${COLUMNS[c]}${r + 1}`] || '');
              if (!isNaN(v)) sum += v;
            }
          }
          return sum.toString();
        }
      }
    } catch {}
    return val;
  };

  const handleCellClick = (col: number, row: number) => {
    const ref = getCellRef(col, row);
    setSelectedCell(ref);
    setEditValue(cellData[ref] || '');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleCellChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  const commitCell = () => {
    if (!selectedCell) return;
    setCellData(prev => {
      const next = { ...prev };
      if (editValue === '') delete next[selectedCell];
      else next[selectedCell] = editValue;
      return next;
    });
    setEditing(false);
  };

  const importCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const lines = text.split('\n').filter(Boolean);
      const data: Record<string, string> = {};
      lines.forEach((line, row) => {
        const cols = line.split(',');
        cols.forEach((val, col) => {
          if (col < DEFAULT_COLS) {
            data[`${COLUMNS[col]}${row + 1}`] = val.trim().replace(/^"|"$/g, '');
          }
        });
      });
      setCellData(data);
      toast.success(`Imported ${lines.length} rows`);
    };
    input.click();
  };

  const cols = activeSheet?.colCount || DEFAULT_COLS;
  const rows = activeSheet?.rowCount || DEFAULT_ROWS;

  return (
    <AppLayout title="Excel Studio">
      <div className="flex h-full">
        {sidebarOpen && (
          <aside className="w-64 border-r border-white/10 bg-white/[0.02] flex flex-col">
            <div className="p-3 border-b border-white/10 space-y-2">
              <button onClick={createSheet} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan/20 hover:bg-cyan/30 text-cyan text-sm transition-colors">
                <FiPlus size={16} /> New Spreadsheet
              </button>
              <button onClick={importCSV} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 text-sm transition-colors">
                <FiUpload size={16} /> Import CSV
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sheets.map(s => (
                <div key={s.id} onClick={() => loadSheet(s)} className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${activeSheet?.id === s.id ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white/80'}`}>
                  <span className="truncate flex-1">{s.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteSheet(s.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"><FiTrash2 size={14} /></button>
                </div>
              ))}
              {sheets.length === 0 && <p className="text-white/30 text-xs text-center py-8">No spreadsheets yet</p>}
            </div>
          </aside>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          {activeSheet ? (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/[0.02]">
                <input value={activeSheet.name} onChange={(e) => setActiveSheet(prev => prev ? { ...prev, name: e.target.value } : null)} className="bg-transparent text-sm text-white/80 border-none outline-none" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/30">{selectedCell}</span>
                  <button onClick={saveSheet} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 rounded text-xs bg-cyan/20 text-cyan hover:bg-cyan/30 transition-colors disabled:opacity-50">
                    <FiSave size={14} /> {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-1.5 border-b border-white/10 bg-white/[0.01]">
                <span className="text-xs text-white/40 font-mono w-16">{selectedCell || ''}</span>
                <input
                  ref={inputRef}
                  value={editValue}
                  onChange={handleCellChange}
                  onBlur={commitCell}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitCell(); }}
                  className="flex-1 bg-transparent text-sm text-white/80 border border-white/10 rounded px-2 py-1 outline-none focus:border-cyan/50 font-mono"
                  placeholder="Enter value or formula (e.g. =SUM(A1:A10))"
                />
              </div>
              <div className="flex-1 overflow-auto">
                <table className="border-collapse w-max min-w-full">
                  <thead>
                    <tr>
                      <th className="sticky top-0 left-0 z-20 w-10 h-8 bg-[#1a1d24] border border-white/10 text-xs text-white/40 font-mono" />
                      {Array.from({ length: cols }, (_, c) => (
                        <th key={c} className="sticky top-0 z-10 w-24 h-8 bg-[#1a1d24] border border-white/10 text-xs text-white/40 font-mono">{COLUMNS[c]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: rows }, (_, r) => (
                      <tr key={r}>
                        <td className="sticky left-0 z-10 w-10 h-7 bg-[#1a1d24] border border-white/10 text-xs text-white/40 font-mono text-center">{r + 1}</td>
                        {Array.from({ length: cols }, (_, c) => {
                          const ref = getCellRef(c, r);
                          const isSelected = selectedCell === ref;
                          const display = getCellValue(c, r);
                          return (
                            <td
                              key={c}
                              onClick={() => handleCellClick(c, r)}
                              className={`w-24 h-7 border border-white/10 px-1.5 text-xs font-mono cursor-pointer transition-colors ${isSelected ? 'bg-cyan/20 border-cyan/50' : 'hover:bg-white/5'} ${display.startsWith('=') ? 'text-green-400' : 'text-white/80'}`}
                            >
                              {display}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/30">
              <div className="text-center">
                <FiGrid size={48} className="mx-auto mb-4 opacity-30" />
                <p>Select a spreadsheet or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}


