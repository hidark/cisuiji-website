import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json';

export default defineConfig({
  plugins: [
    crx({ manifest })
  ],
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html'
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5174
    }
  }
});