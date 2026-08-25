import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  eslint.configs.recommended,
  prettier,
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommended],
  },
  {
    files: [
      'src/main.ts',
      'src/app/**/*.ts',
      'src/rendering/**/*.ts',
      'src/ui/**/*.ts',
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['**/*.test.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ['src/config/**/*.ts', 'src/game/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...[
          'window',
          'document',
          'navigator',
          'performance',
          'requestAnimationFrame',
          'cancelAnimationFrame',
          'setTimeout',
          'clearTimeout',
          'setInterval',
          'clearInterval',
        ].map((name) => ({
          name,
          message:
            'Gameplay and config modules must remain independent of browser APIs and clocks.',
        })),
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'three',
              message:
                'Gameplay and config modules must remain renderer-independent.',
            },
          ],
          patterns: [
            {
              group: ['three/*'],
              message:
                'Gameplay and config modules must remain renderer-independent.',
            },
          ],
        },
      ],
    },
  },
);
