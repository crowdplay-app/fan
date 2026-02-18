import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Set base to repo name for GitHub Pages deployment
  base: '/fan/',
  server: {
    port: 5174,
  },
  build: {
    outDir: 'dist',
  },
});
