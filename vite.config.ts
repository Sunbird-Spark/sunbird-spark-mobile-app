import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

function getBaseUrl(): string {
  try {
    const props = fs.readFileSync(
      path.resolve(__dirname, 'android/gradle.properties'),
      'utf-8'
    );
    const match = props.match(/^base_url=(.+)$/m);
    if (match) return match[1].trim();
  } catch { /* fallback below */ }
  return 'https://test.sunbirded.org';
}

// https://vitejs.dev/config/
export default defineConfig(() => {
  const baseUrl = getBaseUrl();

  return {
  server: {
    host: '::',
    port: 8080,
    proxy: {
      '/content/preview': {
        target: baseUrl,
        changeOrigin: true,
        secure: false,
      },
      '/assets/public': {
        target: baseUrl,
        changeOrigin: true,
        secure: false,
      },
      '/content-plugins': {
        target: baseUrl,
        changeOrigin: true,
        secure: false,
      },
      '/action': {
        target: baseUrl,
        changeOrigin: true,
        secure: false,
      }
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
};
});
