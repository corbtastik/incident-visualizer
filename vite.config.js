import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom' },
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      "/live": "http://localhost:4000",
      "/search": "http://localhost:4000"
    }
  }
});
