import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import WordStudio from './pages/WordStudio';
import ExcelStudio from './pages/ExcelStudio';
import PDFStudio from './pages/PDFStudio';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/word" element={<WordStudio />} />
      <Route path="/excel" element={<ExcelStudio />} />
      <Route path="/pdf" element={<PDFStudio />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
