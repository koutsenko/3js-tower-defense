# 3js Tower Defense

Минимальный walking skeleton браузерной Tower Defense на TypeScript, Three.js и
Vite.

Проект реализует полный игровой сеанс: запуск игры, строительство башен,
прохождение одной автоматически запускаемой волны, победу или поражение и
перезапуск в исходное состояние. Игровые правила отделены от Three.js и
браузерного представления, поэтому основная симуляция детерминирована и
тестируется без WebGL.

## Требования к окружению

- Node.js `^22.22.2`, `^24.15.0` или `>=26.0.0`;
- npm;
- desktop browser;
- мышь или тачпад;
- viewport не менее `1280×720`.

Рекомендуемая версия Node.js указана в [`.nvmrc`](.nvmrc) — `24.15.0`.

## Установка, запуск, сборка и тестирование

Установить зависимости:

```bash
npm install
```

Запустить Vite development server с hot reload:

```bash
npm run dev
```

Локальный адрес приложения Vite выведет в терминал.

Создать production-сборку в каталоге `dist/`:

```bash
npm run build
```

Запустить полный набор автоматических тестов:

```bash
npm test
```

## Playwright

Playwright используется для опциональной проверки основного игрового цикла и
создания acceptance-скриншотов. Для обычного запуска, сборки и автоматических
тестов этот шаг не требуется.

Перед первым запуском установите Chromium для Playwright:

```bash
npx playwright install chromium
```

Запустите acceptance-сценарий:

```bash
npm run capture:acceptance
```

Команда запускает приложение в Chromium, воспроизводит сценарии `Victory`,
`Defeat` и `Restart` и сохраняет скриншоты в
[`specs/001-core-loop/artifacts/acceptance/`](specs/001-core-loop/artifacts/acceptance/).
Существующие файлы с теми же именами перезаписываются.
