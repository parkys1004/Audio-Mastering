import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env for browser. MUST stringify the object to produce a valid JS object literal in the bundle.
      'process.env': JSON.stringify(env),
    },
    build: {
      chunkSizeWarningLimit: 1600,
    },
  };
});