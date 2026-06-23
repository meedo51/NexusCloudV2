import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/docupro/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
