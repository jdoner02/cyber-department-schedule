import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'data/**',
      'public/**',
      '*.min.*',
      'tsconfig.tsbuildinfo',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Browser + React app code
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },

  // React Fast Refresh: apply only to component/page entrypoints (avoid warning on context/modules)
  {
    files: [
      'src/App.tsx',
      'src/main.tsx',
      'src/components/**/*.{tsx,jsx}',
      'src/pages/**/*.{tsx,jsx}',
    ],
    plugins: {
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Node.js scripts and tooling
  {
    files: [
      'scripts/**/*.{ts,tsx,js,jsx}',
      'e2e/**/*.{ts,tsx,js,jsx}',
      '*.{js,ts}',
    ],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Vitest globals (describe/it/expect) for TypeScript tests
  {
    files: ['src/**/*.{test,spec}.{ts,tsx}'],
    languageOptions: {
      globals: globals.jest,
    },
  }
);
