import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom' },
  server: {
    proxy: {
      "/live": "http://localhost:4000"
    }
  }
});
