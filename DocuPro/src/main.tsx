import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
      <Toaster position="bottom-right" toastOptions={{
        style: { background: '#1a1d24', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
      }} />
    </HashRouter>
  </React.StrictMode>
);
