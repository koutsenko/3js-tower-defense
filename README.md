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
- desktop browser;
- мышь или тачпад.

## Установка, запуск, сборка и тестирование

```bash
npm install                         # Установить зависимости
npm run dev                         # Запустить Vite development server с hot reload
npm run build                       # Создать production-сборку в каталоге dist/
npm test                            # Запустить полный набор автоматических тестов
npx playwright install chromium     # Опционально установить Chromium для Playwright
npm run capture:acceptance          # Опционально создать acceptance-скриншоты
```

Локальный адрес приложения Vite выведет в терминал.

## Playwright

Playwright используется для опциональной проверки основного игрового цикла и
создания acceptance-скриншотов. Для обычного запуска, сборки и автоматических
тестов этот шаг не требуется.

Команда `npm run capture:acceptance` запускает приложение в Chromium,
воспроизводит сценарии `Victory`, `Defeat` и `Restart` и сохраняет скриншоты в
[`specs/001-core-loop/artifacts/acceptance/`](specs/001-core-loop/artifacts/acceptance/).
Существующие файлы с теми же именами перезаписываются.
