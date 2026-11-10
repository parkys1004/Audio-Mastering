import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(() => {
  // NOTE: do NOT inject process.env into the client bundle (it would leak secrets).
  // Secrets such as GEMINI_API_KEY are read only by the serverless function in /api.
  return {
    plugins: [react()],
    build: {
      chunkSizeWarningLimit: 1600,
    },
  };
});