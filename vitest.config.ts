import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'src/**/*.test.ts',           // ユニットテスト（コロケーション）
      'tests/integration/**/*.integration.test.ts'  // インテグレーション（維持）
    ],
    globals: true,
    environment: 'node',
    watch: false,  // Disable watch mode by default to prevent hanging processes
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        'src/**/*.test.ts',      // コロケーションテストはカバレッジ除外
        'tests/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});