import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/setupTests.ts',
    css: true,
    pool: 'threads',
    exclude: [
      'node_modules/**',
      'dist/**',
      'public/content-player/**',
      'android/**',
    ],
    coverage: {
      provider: 'v8',
      // lcov is what SonarCloud consumes (sonar.javascript.lcov.reportPaths).
      reporter: ['text', 'json', 'html', 'lcov'],
      // Report on every source file, not just the ones a test happened to
      // import. Without this the percentage flatters itself locally while
      // SonarCloud, which sees the untested files too, reports far lower.
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'src/setupTests.ts',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'src/main.tsx',
        // Type-only modules: interfaces and unions compile away, so there is
        // no executable code to cover.
        'src/types/**',
        'src/**/__mocks__/**',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'capacitor-read-native-setting': path.resolve(__dirname, './src/__mocks__/capacitor-read-native-setting.ts'),
    },
  },
});
