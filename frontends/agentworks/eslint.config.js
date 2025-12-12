import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      prettierConfig,
    ],
    plugins: {
      prettier: prettierPlugin,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'prettier/prettier': 'error',

      // UI 规范强制
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none', // 允许 catch 块中的未使用变量
        },
      ],

      // any 类型：降级为警告（逐步修复）
      '@typescript-eslint/no-explicit-any': 'warn',

      // 禁止console（生产环境）
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // React Hooks 规则
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // ========================================
      // 深色模式规范：禁止硬编码颜色类
      // ========================================
      // 使用语义化类替代：
      //   bg-white → bg-surface
      //   bg-gray-50 → bg-surface-base
      //   text-gray-900 → text-content
      //   border-gray-200 → border-stroke
      // ========================================
      'no-restricted-syntax': [
        'warn',
        // 禁止纯 bg-white（匹配 bg-white 后跟空格或字符串结尾）
        // 允许透明度变体 bg-white/10 等
        {
          selector:
            'JSXAttribute[name.name="className"] Literal[value=/bg-white[\\s"\']/]',
          message:
            '禁止使用 bg-white，请使用 bg-surface（深色模式自动适配）。如需透明白色效果可用 bg-white/10',
        },
        {
          selector:
            'JSXAttribute[name.name="className"] TemplateElement[value.raw=/bg-white[\\s`]/]',
          message:
            '禁止使用 bg-white，请使用 bg-surface（深色模式自动适配）。如需透明白色效果可用 bg-white/10',
        },
      ],
    },
  },
]);
