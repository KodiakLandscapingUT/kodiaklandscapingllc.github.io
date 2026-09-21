import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Express API in ../server (see server/.env for its PORT)
const apiTarget = process.env.API_URL ?? 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
});
