# Implementation Tasks: 001 Core Loop

**Feature:** `001-core-loop`

**Status:** Ready

**Sources:** approved `spec.md` and approved `plan.md`

## 1. Правила выполнения

- Выполнять задачи в порядке `T-001`–`T-017` с учётом явно указанных
  dependencies.
- Не начинать задачу, пока не завершены все её dependencies и их checks.
- Менять статус задачи на `Complete` только после успешного прохождения всех её
  checks.
- Использовать статус `Blocked`, когда для завершения задачи требуется
  утверждённое изменение specification или design.
- Gameplay rules держать вне Three.js, DOM и browser clock.
- Добавлять automated tests вместе с соответствующей gameplay или presentation
  задачей, а не откладывать их до финальной проверки.
- При расхождении implementation с `spec.md` или `plan.md` остановиться и
  согласовать изменение design; не менять документированное поведение молча.
- Для visual implementation использовать только functional placeholder geometry
  из простых Three.js primitives без определения final art style.

## 2. Foundation

### T-001 — Инициализировать toolchain и структуру приложения

**Статус:** Complete.

**Связи:** прямых `FR`/`AC` нет; задача обеспечивает verification для всех
acceptance criteria и поддерживает `NFR-001`.

**Dependencies:** нет.

**Предполагаемые файлы:** `package.json`, `package-lock.json`, `tsconfig.json`,
`vite.config.ts`, `eslint.config.js`, Prettier config, `.gitignore`, `index.html`,
`src/main.ts`, `src/styles.css`.

**Реализация:**

- настроить TypeScript с ES modules и strict type checking;
- добавить Vite, Three.js, Vitest с DOM environment, ESLint и Prettier;
- создать каталоги `src/config/`, `src/game/`, `src/rendering/`, `src/ui/` и
  `tests/`;
- предоставить scripts `dev`, `build`, `test` и `lint` согласно repository
  guidelines;
- сохранить lockfile и исключить `node_modules/` и `dist/`.

**Проверки:**

- `npm install` завершается успешно;
- smoke test запускается через `npm test`;
- `npm run lint` и `npm run build` завершаются успешно.

### T-002 — Реализовать level и balance configuration

**Статус:** Complete.

**Связи:** `FR-002`–`FR-010`, `FR-016`; поддерживает `AC-002`–`AC-009`,
`AC-013`, `AC-015`.

**Dependencies:** `T-001`.

**Предполагаемые файлы:** `src/config/gameConfig.ts`,
`src/config/levelConfig.ts`, `src/game/grid.ts`,
`tests/config/levelConfig.test.ts`.

**Реализация:**

- определить grid `12 × 8`, cell size `1`, route waypoints, entrance `(0, 1)` и
  exit `(11, 6)`;
- вычислить route cells из axis-aligned segments и предоставить readonly
  `LevelConfig`;
- определить все утверждённые balance constants, включая
  `PREPARATION_DURATION = 20 s` и `PROJECTILE_SPEED = 8 cells/s`;
- не добавлять rendering data или mutable session state в config.

**Проверки:**

- route непрерывен, имеет длину centerline `26` и содержит 27 route cells;
- внутри grid остаётся 69 buildable cells, route и buildable sets не
  пересекаются;
- все coordinates и balance values точно соответствуют `plan.md`.

### T-003 — Определить domain model и публичную runtime boundary

**Статус:** Complete.

**Связи:** `FR-001`, `FR-004`–`FR-006`, `FR-010`, `FR-012`, `FR-015`;
`AC-001`, `AC-014`.

**Dependencies:** `T-002`.

**Предполагаемые файлы:** `src/game/types.ts`, `src/game/state.ts`,
`src/game/selectors.ts`, `src/game/events.ts`, `tests/game/state.test.ts`.

**Реализация:**

- определить `SessionStatus`, entity states, `GameCommand`, rejection/result
  types, `GameEvent` и `GameRuntime` из `plan.md`;
- представить events как discriminated union для game start, wave start, build,
  spawn, shot, hit, kill, escape и session end с необходимыми entity IDs;
- реализовать `createInitialState()`, session-local monotonically increasing IDs
  и readonly snapshot boundary;
- вычислять `remainingCount` и preparation countdown как derived values.

**Проверки:**

- initial state имеет status `Ready`, 100 coins, 3 base HP, 10 remaining и
  пустые entity collections;
- preparation countdown до `StartGame` не активен;
- внешний код не может изменить authoritative state через snapshot.

## 3. Headless gameplay core

### T-004 — Реализовать строительство и validation

**Статус:** Complete.

**Связи:** `FR-003`, `FR-004`, `FR-011`; `AC-002`, `AC-003`, часть `AC-009`.

**Dependencies:** `T-003`.

**Предполагаемые файлы:** `src/game/building.ts`,
`src/game/GameRuntime.ts`, `tests/game/building.test.ts`.

**Реализация:**

- реализовать `validateBuild` и обработку `BuildTower`;
- проверять причины в порядке `SESSION_ENDED`, `GAME_NOT_STARTED`,
  `OUT_OF_BOUNDS`, `PATH_CELL`, `OCCUPIED`, `INSUFFICIENT_FUNDS`;
- успешной командой атомарно создавать tower и списывать 50 coins;
- разрешать строительство только в `Preparation` и `WaveActive`.

**Проверки:**

- каждая rejection reason покрыта отдельным test case;
- rejected command не меняет ни одно gameplay field и не создаёт events;
- successful build создаёт ровно одну tower и списывает ровно 50 coins.

### T-005 — Реализовать запуск игры и preparation lifecycle

**Статус:** Pending.

**Переоткрыта:** требуется привести lifecycle boundary и публичный
`advance(deltaSeconds)` в соответствие с утверждённым
[`CR-001`](changes/CR-001.md).

**Связи:** `FR-001`, `FR-005`, `FR-006`, `FR-012`; `AC-004`, часть `AC-014`.

**Dependencies:** `T-003`, `T-004`.

**Предполагаемые файлы:** `src/game/GameRuntime.ts`,
`src/game/lifecycle.ts`, `tests/game/lifecycle.test.ts`.

**Реализация:**

- `StartGame` должна переводить `Ready → Preparation`, фиксировать
  `phaseStartedAt` и создавать `game-start` event;
- через ровно 20 gameplay seconds автоматически выполнять
  `Preparation → WaveActive` и создавать `wave-start` event;
- фиксировать точное время lifecycle boundary и передавать wave systems только
  остаток interval после `wave-start`;
- принимать любой конечный неотрицательный `deltaSeconds`, использовать
  `advance(0)` только для drain command-events и отклонять остальные значения с
  `RangeError` без мутаций или извлечения events;
- не создавать monsters непосредственно командой `StartGame`;
- отклонять `StartGame` вне `Ready` с `INVALID_SESSION_STATE` без мутаций и
  events.

**Проверки:**

- сразу после `StartGame` countdown равен 20 секундам и не увеличивается;
- до 20-секундной границы monsters отсутствуют;
- повторный `StartGame` оставляет полный state без изменений;
- `phaseStartedAt` фиксирует точную boundary независимо от размера interval;
- preparation-часть interval не передаётся wave systems;
- transition timing воспроизводим при fixed simulation steps и эквивалентном
  coarse interval;
- invalid `deltaSeconds` не меняет state и не извлекает накопленные events, а
  `advance(0)` не запускает gameplay systems.

### T-006 — Реализовать spawn, route movement и escape

**Статус:** Pending.

**Изменение:** разблокирована после утверждения
[`CR-001`](changes/CR-001.md).

**Связи:** `FR-006`, `FR-010`, `FR-012`; `AC-004`, `AC-008`, часть `AC-014`.

**Dependencies:** `T-002`, `T-005`.

**Предполагаемые файлы:** `src/game/spawning.ts`, `src/game/movement.ts`,
`tests/game/monsters.test.ts`.

**Реализация:**

- создавать 10 monsters в `0/2/…/18` секунд относительно wave start;
- задавать каждому monster 100 HP, `spawnIndex`, ID и `routeProgress`;
- двигать monsters по route со скоростью `1 cell/s`, перенося остаток движения
  между segments;
- хронологически разбивать interval по wave и spawn boundaries;
- двигать каждого monster только за его active time после scheduled spawn и до
  resolution;
- сохранять partition invariance и хронологический порядок events;
- разрешать достижение exit в порядке `spawnIndex`.

**Проверки:**

- первый monster появляется на boundary автоматического запуска wave с
  `routeProgress = 0`;
- spawn schedule и wave size точны;
- пересечение одной или нескольких spawn boundaries начисляет каждому monster
  только собственный active time;
- coarse interval и эквивалентные fixed steps дают эквивалентные snapshot и
  последовательность events;
- escape удаляет monster, уменьшает base HP ровно на 1, увеличивает
  `escapedCount` и не начисляет coins;
- monster не достигает exit преждевременно из-за времени до scheduled spawn.

### T-007 — Реализовать targeting и firing

**Статус:** Pending.

**Связи:** `FR-007`, `FR-011`; `AC-005`, часть `AC-009`.

**Dependencies:** `T-004`, `T-006`.

**Предполагаемые файлы:** `src/game/targeting.ts`, `src/game/firing.ts`,
`tests/game/targeting.test.ts`.

**Реализация:**

- выбирать живого monster в Euclidean range `<= 3` с максимальным
  `routeProgress`;
- при равном progress выбирать меньший `spawnIndex`;
- готовой tower стрелять немедленно и устанавливать cooldown ровно 1 секунду;
- учитывать cooldown и target availability на хронологических gameplay
  boundaries с сохранением partition invariance;
- отсутствие target не должно сдвигать готовность tower.

**Проверки:**

- покрыты range boundary, furthest-progress selection и tie-breaker;
- первый shot выполняется без задержки, последующие — с точным cooldown;
- coarse interval и эквивалентные fixed steps дают одинаковые target и shot
  events;
- tower, построенная во время wave, участвует со следующей simulation boundary.

### T-008 — Реализовать projectiles, damage и kill economy

**Статус:** Pending.

**Связи:** `FR-008`, `FR-009`; `AC-006`, `AC-007`, часть `AC-009`.

**Dependencies:** `T-007`.

**Предполагаемые файлы:** `src/game/projectiles.ts`, `src/game/combat.ts`,
`tests/game/projectiles.test.ts`.

**Реализация:**

- двигать homing projectile к назначенной живой цели со скоростью `8 cells/s`;
- учитывать только active time projectile после shot и до resolution;
- при достижении цели наносить ровно 25 damage без retargeting;
- при death или escape цели удалять все назначенные unresolved projectiles без
  gameplay effects;
- выполнять kill transition и reward атомарно и только один раз.

**Проверки:**

- projectile продолжает homing после выхода цели из tower range;
- invalidated projectile не изменяет HP, coins или counters;
- kill удаляет monster, увеличивает `killedCount` и начисляет ровно 10 coins;
- escape на одной boundary имеет приоритет перед projectile hit;
- coarse interval и эквивалентные fixed steps дают одинаковые projectile, hit и
  kill events.

### T-009 — Реализовать terminal outcomes и Restart

**Статус:** Pending.

**Связи:** `FR-001`, `FR-010`, `FR-013`–`FR-015`; `AC-008`, `AC-010`–`AC-012`.

**Dependencies:** `T-005`, `T-006`, `T-008`.

**Предполагаемые файлы:** `src/game/completion.ts`,
`src/game/GameRuntime.ts`, `tests/game/completion.test.ts`.

**Реализация:**

- немедленно устанавливать `Defeat` при переходе base HP к 0;
- устанавливать `Victory` после resolution всех 10 monsters при положительном
  base HP;
- немедленно прекращать обработку systems и остатка interval после terminal
  transition;
- блокировать в terminal state spawn, movement, building, attacks и economy;
- разрешать `Restart` только из `Victory` и `Defeat` и полностью создавать новый
  `Ready` state;
- отклонять ранний `Restart` с `INVALID_SESSION_STATE` без мутаций и events.

**Проверки:**

- terminal freeze покрывает текущую boundary, остаток interval и последующие
  вызовы `advance`;
- coarse interval и эквивалентные fixed steps дают одинаковые terminal outcome,
  `simulationTime`, counters и последовательность events;
- reset очищает entities, counters, timers, accumulator, events и ID sequence;
- после reset `StartGame` снова доступна, а строительство заблокировано до неё.

### T-010 — Подтвердить two-tower balance fixture

**Статус:** Pending.

**Связи:** `FR-016`; `AC-013`.

**Dependencies:** `T-009`.

**Предполагаемые файлы:** `tests/game/balance.test.ts`; при неуспехе — только
согласованное обновление `plan.md`.

**Реализация:**

- после `StartGame` построить towers на `(6, 3)` и `(5, 5)` во время
  preparation;
- не выполнять последующих покупок и прогнать deterministic session до
  terminal state.

**Проверки:**

- ожидаемый outcome — `Victory`;
- outcome, counters и remaining coins одинаковы при штатных fixed steps и при
  другом допустимом разбиении того же gameplay time;
- если fixture не проходит, остановить implementation и вынести изменение
  route, balance parameters или fixture на повторное утверждение design;
- не подбирать значения и не ослаблять `FR-016` молча.

## 4. Browser presentation

### T-011 — Реализовать fixed-step application loop

**Статус:** Pending.

**Связи:** поддерживает timing в `FR-005`–`FR-008` и freeze в `FR-013`;
`AC-004`–`AC-006`, `AC-010`, `AC-011`.

**Dependencies:** `T-009`.

**Предполагаемые файлы:** `src/app/fixedStepLoop.ts`,
`src/app/createApplication.ts`, `tests/app/fixedStepLoop.test.ts`.

**Реализация:**

- накапливать browser frame time и ограничивать вклад одного frame до `250 ms`;
- выполнять simulation steps по `1/60 s`;
- агрегировать events всех steps, render один раз и передавать interpolation
  alpha только presentation layer.

**Проверки:**

- разные frame deltas дают тот же gameplay result, что эквивалентное число
  fixed steps;
- interpolation не влияет на gameplay calculations;
- terminal state не продвигает simulation behavior.

### T-012 — Создать functional placeholder level scene и fixed camera

**Статус:** Pending.

**Связи:** `FR-002`, `FR-003`; `AC-015`; `NFR-001`.

**Dependencies:** `T-002`, `T-011`.

**Предполагаемые файлы:** `src/rendering/SceneRenderer.ts`,
`src/rendering/camera.ts`, `src/rendering/placeholders.ts`.

**Реализация:**

- отобразить границы level, route cells, entrance, exit и buildable cells
  простыми Three.js primitives;
- настроить fixed orthographic camera под isometric angle;
- пересчитывать frustum при resize по projected bounds с запасом для active
  entities;
- не использовать external assets, fantasy details, textures или production
  animation.

**Проверки:**

- scene создаётся без external assets;
- при `1280×720` весь level попадает во frustum;
- placeholders различимы, но не определяют final art style.

### T-013 — Реализовать snapshot reconciliation активных entities

**Статус:** Pending.

**Связи:** `FR-006`, `FR-008`, `FR-012`; `AC-006`, `AC-014`, `AC-015`.

**Dependencies:** `T-008`, `T-009`, `T-012`.

**Предполагаемые файлы:** `src/rendering/entityReconciler.ts`,
`src/rendering/healthBars.ts`, `tests/rendering/reconciliation.test.ts`.

**Реализация:**

- поддерживать mapping `entityId → Object3D`;
- создавать, обновлять и удалять placeholder towers, monsters и projectiles по
  readonly snapshot;
- показывать camera-facing HP bar над каждым живым monster;
- использовать events только для transient feedback.

**Проверки:**

- reconciliation корректно обрабатывает build, spawn, hit, kill, escape и
  restart;
- HP bar соответствует текущему HP от 100 до значения выше 0;
- scene objects не используются как authoritative gameplay data.

### T-014 — Реализовать mouse placement и rejection feedback

**Статус:** Pending.

**Связи:** `FR-003`, `FR-004`, `FR-011`; `AC-002`, `AC-003`, `AC-009`,
`AC-015`; `NFR-001`.

**Dependencies:** `T-004`, `T-012`, `T-013`.

**Предполагаемые файлы:** `src/ui/PlacementController.ts`,
`src/ui/buildFeedback.ts`, `tests/ui/placement.test.ts`.

**Реализация:**

- преобразовывать raycast ground-plane hit в `GridCell`;
- показывать green/red hover через `validateBuild`;
- показывать краткую English reason рядом с cursor и toast при rejected click;
- отправлять `BuildTower` только через runtime command boundary.

**Проверки:**

- mouse input не обходит runtime validation;
- feedback очищается при уходе cursor за grid;
- pre-start и terminal clicks не меняют gameplay state;
- каждая rejection reason имеет читаемое UI mapping.

### T-015 — Реализовать HUD, Start и final overlay

**Статус:** Pending.

**Связи:** `FR-005`, `FR-012`, `FR-014`, `FR-015`; `AC-001`, `AC-004`,
`AC-010`–`AC-012`, `AC-014`; `NFR-001`.

**Dependencies:** `T-005`, `T-009`, `T-011`.

**Предполагаемые файлы:** `src/ui/HudView.ts`,
`src/ui/FinalOverlay.ts`, `tests/ui/hud.test.ts`.

**Реализация:**

- выводить `Coins`, `Base HP`, `Remaining`, `Tower cost` и `Status`;
- показывать `Wave starts in` с округлённым вверх countdown только в
  `Preparation`;
- разрешать `Start` только в `Ready`;
- показывать terminal outcome, `Killed`, `Escaped`, `Coins remaining` и
  `Restart`; terminal overlay должен перехватывать mouse input.

**Проверки:**

- DOM tests покрывают все status transitions, countdown и disabled state;
- HUD обновляется после каждого влияющего command или simulation tick;
- final statistics и `Restart` dispatch соответствуют snapshot.

### T-016 — Собрать browser application

**Статус:** Pending.

**Связи:** интеграционное покрытие `FR-001`–`FR-015`; `AC-001`–`AC-012`,
`AC-014`, `AC-015`; `NFR-001`.

**Dependencies:** `T-011`–`T-015`.

**Предполагаемые файлы:** `src/main.ts`, `src/app/createApplication.ts`,
`index.html`, `src/styles.css`.

**Реализация:**

- composition root создаёт config, runtime, renderer и UI;
- связать mouse commands, fixed-step loop, readonly snapshots, transient events
  и resize;
- расположить HTML/CSS HUD одновременно с canvas;
- не добавлять UI framework, assets или gameplay rules в presentation layer.

**Проверки:**

- production build запускается без external assets;
- browser smoke проходит цикл
  `Ready → Preparation → WaveActive → terminal → Ready`;
- renderer и UI не владеют authoritative counters или entities.

## 5. Final verification

### T-017 — Выполнить complete acceptance gate

**Статус:** Pending.

**Связи:** все `FR-001`–`FR-016`, `AC-001`–`AC-015`, `NFR-001`.

**Dependencies:** `T-010`, `T-016`.

**Предполагаемые файлы:** этот `tasks.md` для фиксации результата; screenshot
или capture используются только как verification evidence, не как runtime
assets.

**Реализация:**

- выполнить полный automated verification gate;
- выполнить manual browser acceptance при viewport `1280×720`;
- зафиксировать команды и результат проверки в handoff или pull request.

**Проверки:**

- `npm test`, `npm run lint` и `npm run build` проходят;
- вручную подтверждены видимость route, entrance, exit, buildable cells и active
  entities;
- подтверждены pre-start build block, 20-секундная preparation, automatic wave
  start и строительство во время active wave;
- hover/rejection feedback читаемы;
- `Victory` и `Defeat` замораживают gameplay, а `Restart` полностью возвращает
  initial state.

## 6. Requirement coverage

| Requirement | Tasks |
|---|---|
| `FR-001` | `T-003`, `T-005`, `T-009`, `T-016`, `T-017` |
| `FR-002` | `T-002`, `T-012`, `T-017` |
| `FR-003` | `T-002`, `T-004`, `T-012`, `T-014`, `T-017` |
| `FR-004` | `T-002`, `T-003`, `T-004`, `T-014`, `T-017` |
| `FR-005` | `T-002`, `T-003`, `T-005`, `T-011`, `T-015`, `T-017` |
| `FR-006` | `T-002`, `T-003`, `T-005`, `T-006`, `T-013`, `T-017` |
| `FR-007` | `T-002`, `T-007`, `T-011`, `T-017` |
| `FR-008` | `T-002`, `T-008`, `T-011`, `T-013`, `T-017` |
| `FR-009` | `T-002`, `T-008`, `T-017` |
| `FR-010` | `T-002`, `T-003`, `T-006`, `T-009`, `T-017` |
| `FR-011` | `T-004`, `T-007`, `T-014`, `T-017` |
| `FR-012` | `T-003`, `T-005`, `T-006`, `T-013`, `T-015`, `T-017` |
| `FR-013` | `T-009`, `T-011`, `T-016`, `T-017` |
| `FR-014` | `T-009`, `T-015`, `T-016`, `T-017` |
| `FR-015` | `T-003`, `T-009`, `T-015`, `T-016`, `T-017` |
| `FR-016` | `T-002`, `T-010`, `T-017` |
| `NFR-001` | `T-001`, `T-012`, `T-014`–`T-017` |

| Acceptance Criterion | Tasks |
|---|---|
| `AC-001` | `T-003`, `T-015`, `T-016`, `T-017` |
| `AC-002` | `T-004`, `T-014`, `T-016`, `T-017` |
| `AC-003` | `T-004`, `T-014`, `T-016`, `T-017` |
| `AC-004` | `T-005`, `T-006`, `T-011`, `T-015`–`T-017` |
| `AC-005` | `T-007`, `T-011`, `T-017` |
| `AC-006` | `T-008`, `T-011`, `T-013`, `T-017` |
| `AC-007` | `T-008`, `T-017` |
| `AC-008` | `T-006`, `T-009`, `T-017` |
| `AC-009` | `T-004`, `T-007`, `T-008`, `T-014`, `T-017` |
| `AC-010` | `T-009`, `T-011`, `T-015`–`T-017` |
| `AC-011` | `T-009`, `T-011`, `T-015`–`T-017` |
| `AC-012` | `T-009`, `T-015`–`T-017` |
| `AC-013` | `T-002`, `T-010`, `T-017` |
| `AC-014` | `T-003`, `T-005`, `T-006`, `T-013`, `T-015`–`T-017` |
| `AC-015` | `T-002`, `T-012`–`T-014`, `T-016`, `T-017` |
