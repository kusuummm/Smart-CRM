import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Vite plugin to generate 404.html, 200.html, and _redirects in dist/ for seamless SPA reloads on Render, Netlify, Surge, etc.
const spaFallbackPlugin = () => ({
  name: 'spa-fallback',
  closeBundle() {
    try {
      const distDir = path.resolve(__dirname, 'dist');
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        // Copy index.html to 404.html so Render static site serves the SPA on deep reloads
        fs.copyFileSync(indexPath, path.join(distDir, '404.html'));
        // Copy index.html to 200.html for hosts supporting 200 fallback
        fs.copyFileSync(indexPath, path.join(distDir, '200.html'));

        // Ensure _redirects file has /* /index.html 200
        const redirectsPath = path.join(distDir, '_redirects');
        fs.writeFileSync(redirectsPath, '/*    /index.html   200\n', 'utf8');
        console.log('SPA fallbacks (404.html, 200.html, _redirects) generated in dist/');
      }
    } catch (e) {
      console.warn('Could not generate SPA fallback files:', e);
    }
  },
});

export default defineConfig({
  plugins: [react(), spaFallbackPlugin()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    chunkSizeWarningLimit: 1200,
  },
});
