/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        watch: {
          ignored: ['**/screenshots/**', '**/test-results/**', '**/playwright-report/**', '**/e2e/**'],
        },
      },
      plugins: [react(), tailwindcss()],
      define: {},
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./tests/setup.ts'],
        include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        exclude: ['e2e/**', 'playwright-report/**', 'test-results/**'],
        coverage: {
          provider: 'v8',
          reporter: ['text', 'json', 'html'],
        },
      },
    };
});
