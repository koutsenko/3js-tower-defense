# Technical Design: 001 Core Loop

**Feature:** `001-core-loop`  
**Status:** Approved

**Source of truth:** `spec.md`

## 1. Design goals

Предлагается реализовать минимальный законченный Tower Defense core loop как
browser application на TypeScript, Vite и Three.js. Игровые правила должны быть
детерминированными и исполняться без зависимости от WebGL или DOM, а rendering
и UI должны только отображать состояние и отправлять команды в game runtime.

Design сохраняет границы утверждённой specification: один уровень, один тип
башни, один тип монстра, 20-секундная подготовка после запуска игры и одна
конечная волна. Дополнительные gameplay-механики, camera controls, external
assets и UI framework не вводятся.

Specification не задаёт скорость видимого снаряда, хотя она влияет на
разрешение атак и баланс `AC-013`. Design фиксирует её как технический balance
parameter `PROJECTILE_SPEED = 8` клеток в секунду. Значение должно быть покрыто
детерминированным balance test и не изменяет описанные в `FR-008` правила
назначения цели и нанесения урона.

## 2. Architecture overview

### 2.1 Runtime flow

`GameRuntime` является единственным владельцем изменяемого gameplay state.
Browser input передаётся в runtime как команды, а presentation получает только
readonly snapshot и transient events. Three.js objects и DOM elements не входят
в authoritative state.

```text
Mouse input ──> UI adapter ──> dispatch(command) ──> GameRuntime
                                                     │
requestAnimationFrame ──> application loop ──> advance(fixedStep)
                                                     │
                                  ┌──────────────────┴───────────────┐
                                  │                                  │
                           readonly snapshot                  transient events
                                  │                                  │
                           ┌──────┴──────┐                    visual feedback
                           │             │
                     Three.js scene   HTML/CSS HUD
```

`dispatch` синхронно проверяет и применяет одну command. Animation loop может
выполнить от нуля до нескольких fixed simulation steps перед очередным render,
после чего renderer и HUD получают актуальный snapshot. Events дополняют
snapshot только одноразовыми visual cues и не являются источником gameplay
данных.

| Component | Responsibility | Must not own |
|---|---|---|
| Application composition root | Создание компонентов, browser clock и порядок вызовов | Gameplay rules |
| `GameRuntime` | Commands, authoritative state, simulation и events | DOM и Three.js objects |
| `LevelConfig` / `GameConfig` | Level geometry и balance parameters | Mutable session state |
| Three.js renderer | Проекция snapshot в scene и world-space feedback | Gameplay decisions |
| DOM UI | HUD, controls и presentation messages | Authoritative counters |

### 2.2 Key design decisions

Статус `Accepted` означает, что решение утверждено как часть этого technical
design.

| Question | Considered alternatives | Decision | Rationale | Status |
|---|---|---|---|---|
| Toolchain | Vite; no-build; Webpack | TypeScript, Vite and Three.js | Простой development workflow, production build и стандартные ES module imports | Accepted |
| Simulation clock | Variable delta; fixed timestep; hybrid | Fixed `1/60 s` gameplay steps with frame-driven rendering | Детерминированные timing rules и tests без привязки к FPS | Accepted |
| Advancement across boundaries | Требовать только точный fixed step; применять полный delta после due events; хронологически разбивать interval | `advance(deltaSeconds)` хронологически обрабатывает interval по lifecycle, spawn и gameplay boundaries | Сущности получают только фактический active time, а результат не зависит от разбиения gameplay time | Accepted |
| Buildable cells | Заданные площадки; все клетки вне route | Все незанятые клетки вне route | Больше вариантов размещения при простом и видимом правиле | Accepted |
| Visual direction | Functional placeholder geometry; defined art style; external assets | Functional placeholder geometry из простых Three.js primitives | Только различимость gameplay elements без определения финального art style | Accepted |
| HUD and final state | Three.js UI; HTML/CSS; hybrid | HTML/CSS overlay, world-space feedback в Three.js | Чёткий responsive text при сохранении привязанных к миру индикаторов | Accepted |
| Presentation synchronization | Только events; только snapshots; snapshots plus events | Snapshot для состояния, events для одноразовых эффектов | Восстановимое представление без потери shot, hit и session-end cues | Accepted |
| UI language | Russian; English; localization layer | English без localization layer | Один согласованный набор labels при localization вне scope | Accepted |

## 3. Technology and project structure

### 3.1 Toolchain

- TypeScript с ES modules и strict type checking.
- Vite для development server и production build.
- Three.js для сцены, камеры, picking и functional placeholder geometry.
- Vanilla TypeScript и HTML/CSS для HUD и controls.
- Vitest для unit и integration tests без WebGL.
- ESLint и Prettier для static analysis и formatting checks.

`package.json` должен предоставлять согласованные repository commands:

- `npm run dev` — Vite development server;
- `npm run build` — TypeScript check и production Vite build в `dist/`;
- `npm test` — полный Vitest run;
- `npm run lint` — ESLint и `prettier --check`.

Сгенерированный npm lockfile хранится в repository. `node_modules/` и `dist/`
игнорируются.

### 3.2 Modules and dependency direction

Runtime code размещается под `src/` и разделяется по ответственности:

```text
src/
  config/       level geometry and balance values
  game/         state, commands, systems and runtime
  rendering/    Three.js scene and state projection
  ui/           DOM HUD, feedback and mouse input
```

`config` и `game` не импортируют Three.js, DOM APIs или browser clock. Модули
`rendering` и `ui` могут зависеть от readonly snapshot и публичных команд
`game`, но game runtime не вызывает presentation code. Application composition
root создаёт runtime, renderer и UI, затем связывает их в animation loop.

### 3.3 Naming of temporal operations

Имена gameplay-функций отражают роль операции в обработке simulation
boundaries:

- `get` читает уже существующее значение state без прогнозирования,
  существенного вычисления или мутации;
- `calculate` детерминированно вычисляет значение из расписания, config или
  переданных аргументов;
- `predict` условно вычисляет будущий gameplay event или boundary из current
  state; результат может потерять актуальность после другого события;
- `is`, `has`, `can` проверяют фактическое состояние на текущей boundary;
- `select` выбирает entity из фактически доступных кандидатов;
- `schedule` сохраняет будущее событие или время для последующего
  использования;
- `resolve` применяет уже наступившее событие и связанные изменения
  authoritative state;
- `advance` и `move` продвигают state на переданный интервал времени.

`predict` не обозначает вероятностный результат. Prediction является точным
для current state и config, но условным относительно последующих gameplay
events. После обработки ближайшей boundary старые predictions отбрасываются, а
новые вычисляются из обновлённого state.

Application fixed step `1/60 s` является внешней порцией gameplay time, а не
единственным событием мира. Один вызов `advance` может пересечь несколько
внутренних boundaries. Runtime на каждой итерации определяет ближайшую
boundary, продвигает state только до неё, применяет due events и заново
вычисляет predictions для остатка interval.

Примеры утверждённой терминологии:

- `calculateNextSpawnTime` — вычисление следующей отметки spawn schedule;
- `predictNextTargetingBoundaryTime` — условный прогноз следующего targeting
  boundary;
- `isMonsterInTowerRange` — проверка фактического состояния на достигнутой
  boundary;
- `resolveProjectileHits` — применение уже наступивших попаданий.

Методика не требует объединять predictors в общий `predictions.ts` и не
фиксирует размещение приватных helpers по файлам (`CR-002`).

## 4. Level and balance configuration

### 4.1 Coordinates and route

Уровень задаётся data-only `LevelConfig`:

- grid: `12 × 8` клеток;
- размер клетки в world coordinates: `1`;
- grid coordinate `(x, y)` отображается в Three.js plane как `(x, 0, y)`;
- route waypoints:
  `(0, 1) → (8, 1) → (8, 4) → (3, 4) → (3, 6) → (11, 6)`;
- entrance: `(0, 1)`;
- exit/base: `(11, 6)`;
- длина centerline route: `26` клеток.

Route состоит из включённых в перечисленные axis-aligned segments клеток. Все
27 route cells запрещены для строительства. Все остальные 69 cells внутри
grid разрешены, если не заняты башней и у игрока достаточно монет. Decorative
objects не добавляют скрытых ограничений на строительство. Это обеспечивает
несколько вариантов размещения и сохраняет route неизменным (`FR-002`,
`FR-003`, `AC-015`).

Позиция монстра определяется scalar `routeProgress` и линейной интерполяцией
по segments. На повороте остаток пройденной за active sub-interval дистанции
переносится на следующий segment, поэтому скорость остаётся равной одной клетке
в секунду.

### 4.2 Balance parameters

Все правила хранятся в одном readonly `GameConfig`, отдельно от rendering:

| Parameter | Value | Source |
|---|---:|---|
| `STARTING_COINS` | 100 | `FR-004` |
| `TOWER_COST` | 50 | `FR-004` |
| `PREPARATION_DURATION` | 20 s | `FR-005` |
| `STARTING_BASE_HP` | 3 | `FR-010` |
| `WAVE_SIZE` | 10 | `FR-006` |
| `SPAWN_INTERVAL` | 2 s | `FR-006` |
| `MONSTER_HP` | 100 | `FR-006` |
| `MONSTER_SPEED` | 1 cell/s | `FR-006` |
| `TOWER_RANGE` | 3 cells | `FR-007` |
| `SHOT_COOLDOWN` | 1 s | `FR-007` |
| `PROJECTILE_DAMAGE` | 25 | `FR-008` |
| `KILL_REWARD` | 10 | `FR-009` |
| `PROJECTILE_SPEED` | 8 cells/s | design parameter |

Радиус башни вычисляется как Euclidean distance между tower cell center и
текущей interpolated monster position. Точка на границе `distance <= 3`
считается находящейся в радиусе.

Расстановка башен на `(6, 3)` и `(5, 5)` является initial candidate для
balance fixture `FR-016` и `AC-013`. Она считается подтверждённой только после
того, как deterministic simulation test завершит волну состоянием `Victory`
без дальнейшего строительства. Если candidate не проходит test, level route,
design balance parameters или fixture должны быть пересмотрены в этом document
без ослабления `FR-016`. Расстановка не показывается игроку.

## 5. Game model and public interfaces

### 5.1 State

`GameState` содержит только сериализуемые gameplay data:

```ts
type SessionStatus =
  | 'Ready'
  | 'Preparation'
  | 'WaveActive'
  | 'Victory'
  | 'Defeat';

interface GameState {
  status: SessionStatus;
  simulationTime: number;
  phaseStartedAt: number;
  coins: number;
  baseHp: number;
  spawnedCount: number;
  killedCount: number;
  escapedCount: number;
  towers: TowerState[];
  monsters: MonsterState[];
  projectiles: ProjectileState[];
}
```

Entity identifiers — monotonically increasing integers, локальные для session.
`Restart` начинает identifiers заново. `remainingCount` является derived value
`WAVE_SIZE - killedCount - escapedCount`; поэтому оно включает ещё не
появившихся монстров (`FR-012`).

В `Ready` таймер подготовки не запущен. Успешный `StartGame` устанавливает
`Preparation` и `phaseStartedAt = simulationTime`. Во время `Preparation`
оставшееся время является derived value
`max(0, PREPARATION_DURATION - (simulationTime - phaseStartedAt))`. При
автоматическом переходе в `WaveActive` значение `phaseStartedAt` фиксирует
точный момент начала волны и становится базой для spawn schedule.

Tower хранит cell, `nextShotAt` и id. Monster хранит `spawnIndex`, HP,
`routeProgress` и id. Projectile хранит id, `targetId` и текущую grid/world
position. Presentation-specific mesh, color, tooltip и animation data в
`GameState` не входят.

### 5.2 Commands and results

UI взаимодействует с runtime только командами:

```ts
type GameCommand =
  | { type: 'BuildTower'; cell: GridCell }
  | { type: 'StartGame' }
  | { type: 'Restart' };

type BuildRejectionCode =
  | 'SESSION_ENDED'
  | 'GAME_NOT_STARTED'
  | 'OUT_OF_BOUNDS'
  | 'PATH_CELL'
  | 'OCCUPIED'
  | 'INSUFFICIENT_FUNDS';

type BuildValidation =
  | { ok: true }
  | { ok: false; code: BuildRejectionCode };

type CommandRejectionCode =
  | BuildRejectionCode
  | 'INVALID_SESSION_STATE';

type CommandResult =
  | { ok: true }
  | { ok: false; code: CommandRejectionCode };
```

`dispatch(command)` возвращает typed result. Успешная команда атомарно изменяет
state. Отклонённая `BuildTower` возвращает rejection code и не изменяет ни один
gameplay field. Проверки выполняются в указанном выше порядке, чтобы при
совпадении условий причина была детерминированной.

`BuildTower` допустима только в `Preparation` и `WaveActive`. В `Ready` она
отклоняется с `GAME_NOT_STARTED`; terminal states по-прежнему дают
`SESSION_ENDED`. `StartGame` допустима только в `Ready` и не требует наличия
башни. Она переводит session в `Preparation`, запускает 20-секундный таймер и
сразу становится недоступной. После запуска и после завершения session
повторная `StartGame` отклоняется с `INVALID_SESSION_STATE`. `Restart` допустима
только в `Victory` и `Defeat`; в остальных состояниях она также отклоняется с
`INVALID_SESSION_STATE`. Любая команда, недопустимая в текущем состоянии, не
изменяет gameplay state и не создаёт events. UI отражает контракт через enabled
state кнопки `Start` только в `Ready` и доступность `Restart` только в terminal
overlay (`FR-004`, `FR-005`, `FR-015`).

Публичная runtime boundary:

```ts
interface GameRuntime {
  dispatch(command: GameCommand): CommandResult;
  advance(deltaSeconds: number): readonly GameEvent[];
  getSnapshot(): Readonly<GameState>;
  validateBuild(cell: GridCell): BuildValidation;
}
```

`GameEvent` сообщает presentation layer о game start, automatic wave start,
build, spawn, shot, hit, kill, escape и session end. События используются
только для visual feedback; authoritative HUD values и scene entities всегда
берутся из snapshot.

`advance(deltaSeconds)` принимает любой конечный неотрицательный interval:

- положительное значение продвигает gameplay time на указанный interval;
- `0` не запускает gameplay systems и только возвращает накопленные
  command-events;
- отрицательное, `NaN` или бесконечное значение выбрасывает `RangeError`, не
  изменяя gameplay state и не извлекая накопленные events;
- сущность получает simulation updates только за часть interval после её
  создания и до её resolution;
- events возвращаются в хронологическом порядке; при одинаковом timestamp
  используется утверждённый system order, а однотипные monster events
  упорядочиваются по `spawnIndex`.

Для одинаковой последовательности commands один крупный вызов `advance` и
эквивалентная последовательность меньших вызовов должны давать эквивалентное
authoritative state и одинаковую объединённую последовательность events. Это
свойство далее называется partition invariance.

## 6. Deterministic simulation

### 6.1 Clock

Gameplay обновляется fixed timestep `1/60 s`. Animation loop накапливает
browser frame time и вызывает `advance(1 / 60)` необходимое число раз, затем
один раз renders scene. Вклад одного browser frame ограничивается 250 ms,
чтобы background tab или debugger stop не вызывали spiral of death. Управляемая
игроком pause или speed control не создаётся.

Fixed step является штатным application cadence, а не ограничением публичного
runtime contract. Headless tests и другие допустимые callers могут передавать
любой конечный неотрицательный interval. Runtime обязан хронологически разбить
его по всем пересечённым boundaries, чтобы сохранить partition invariance и не
начислить entity время до создания либо после resolution.

Таймер подготовки использует тот же gameplay clock, а не отдельный DOM timer.
Поэтому переход к волне воспроизводим в headless tests и не зависит от FPS.
Состояния `Ready`, `Victory` и `Defeat` не продвигают phase lifecycle; countdown
начинается только после успешной `StartGame`.

Renderer может интерполировать visual positions между предыдущим и текущим
snapshot, но interpolation не влияет на range, targeting, collision или event
timing.

### 6.2 Interval processing and system order

Каждый положительный вызов `advance` обрабатывает gameplay interval от текущего
`simulationTime` до целевого времени хронологически:

1. в `Ready` или terminal state не продвигать clock и не выполнять phase либо
   gameplay systems;
2. определить ближайшую lifecycle, spawn, cooldown, collision или terminal
   boundary, но не дальше конца interval;
3. продвинуть только уже активные entities до этой boundary; movement каждого
   monster и projectile использует только фактическую продолжительность этого
   sub-interval;
4. установить `simulationTime` в точное время boundary;
5. применить все due transitions и discrete systems в фиксированном порядке:
   `wave-start` → spawn → escape → `Defeat` → targeting и shot → projectile hit,
   death и reward → `Victory`;
6. при нескольких monster transitions одного типа использовать порядок
   `spawnIndex`;
7. при terminal transition немедленно прекратить обработку systems и остатка
   interval;
8. повторять шаги 2–7 до исчерпания interval.

Entity, созданная на правой границе interval, имеет нулевой active time в этом
вызове. Monster поэтому создаётся с `routeProgress = 0`, а новый projectile не
получает движение до следующего положительного sub-interval. Discrete decision,
не требующий течения времени, выполняется на самой boundary: готовая tower может
выстрелить в monster сразу после его spawn.

Успешная `StartGame` только начинает `Preparation` и не создаёт monster. Первый
monster создаётся на boundary, где истекают 20 секунд и состояние становится
`WaveActive`, с `routeProgress = 0`. Следующие monsters имеют сроки появления
`phaseStartedAt + 2`, `+4`, …, `+18` секунд. Preparation и часть interval до
scheduled spawn не входят в active time monster. Готовая tower может выпустить
projectile в первого monster на той же boundary. Построенная во время волны
tower немедленно участвует в targeting на boundary успешной покупки и при
наличии допустимой цели выпускает первый projectile (`FR-005`–`FR-007`,
`FR-011`, `AC-009`).

Если monster достигает exit на той же boundary, на которой projectile мог бы в
него попасть, exit разрешается первым: monster считается escaped, а назначенный
ему projectile удаляется без эффекта. При достижении `Defeat` никакие
последующие systems этой boundary и остатка interval не выполняются.

### 6.3 Targeting and projectiles

Башня, для которой `simulationTime >= nextShotAt`, выбирает живого monster в
Euclidean range с максимальным `routeProgress`. При равном progress выбирается
меньший `spawnIndex`. После shot устанавливается
`nextShotAt = simulationTime + SHOT_COOLDOWN`; отсутствие target не сдвигает
готовность и не создаёт искусственной задержки.

Projectile в каждом положительном active sub-interval движется со скоростью
`PROJECTILE_SPEED` напрямую к текущей позиции назначенного живого target. Выход
target из tower range не влияет на projectile. Если расстояние до target не
превышает travel distance этого sub-interval, projectile достигает target и
наносит ровно 25 damage.

При death target либо его достижении exit все назначенные ему unresolved
projectiles удаляются без retargeting, damage, reward или иных gameplay
effects. Kill transition с HP выше нуля до 0 выполняется ровно один раз и
атомарно обновляет `killedCount`, `remainingCount` и coins (`FR-008`, `FR-009`).

### 6.4 Session completion and restart

`Defeat` устанавливается сразу при переходе base HP к 0. `Victory`
устанавливается после разрешения десятого monster при положительном base HP.
Оба terminal states блокируют spawn, movement, building, attacks и economy
updates. Существующие scene entities могут остаться визуально замороженными под
final overlay, но gameplay state больше не изменяется.

`Restart` заменяет state результатом `createInitialState()`, очищает runtime
accumulator, events и presentation-only notifications. Renderer удаляет все
entity objects, которых нет в новом snapshot. Новый state имеет status `Ready`,
доступную `StartGame`, незапущенный preparation timer и запрещённое до старта
строительство (`FR-015`, `AC-012`).

## 7. Rendering, input and UI

### 7.1 Three.js scene

Scene использует functional placeholder geometry из простых Three.js
primitives:

- простые плоские cells для границ level;
- контрастные cells для route;
- простые и визуально различимые entrance и exit/base markers;
- различимые primitive meshes для tower и monster;
- простой primitive для projectile;
- camera-facing HP bar над каждым живым monster.

Форма, цвет и движение placeholders служат только читаемости уровня, пути,
башен, монстров, снарядов, входа и выхода и обязательной gameplay feedback.
Renderer не добавляет фэнтезийные, декоративные или стилистически определяющие
детали и не задаёт финальный art style. Визуальное направление, production
models, textures и полноценные animations будут определяться позднее за
пределами `001-core-loop`; движение monsters и projectiles остаётся только
функциональным отображением gameplay state.

Renderer хранит отображение `entityId → Object3D` и на каждом frame создаёт,
обновляет или удаляет objects по snapshot. HP bar отражает отношение текущего
HP к 100 и не является источником игровых данных.

Orthographic camera фиксирована над центром grid под isometric angle. Camera
frustum пересчитывается при resize по projected bounds всей сетки с запасом
для tower height, HP bars и projectiles. Camera position и direction при этом
не меняются, controls не создаются. Canvas занимает пространство ниже HUD;
при viewport `1280×720` camera fit должен одновременно показывать весь level и
активные entities (`AC-015`, `NFR-001`).

### 7.2 Mouse input and placement feedback

Raycaster пересекает ground plane и преобразует hit point в `GridCell`. При
hover UI вызывает `validateBuild`:

- допустимая клетка подсвечивается зелёным;
- недопустимая клетка подсвечивается красным;
- рядом с cursor показывается краткая English reason;
- при уходе cursor за grid highlight и hint скрываются.

Клик по допустимой клетке отправляет `BuildTower`. Клик по недопустимой клетке
показывает кратковременный English toast с returned rejection reason. Hint и
toast — presentation state, поэтому их изменение не нарушает требование об
отсутствии изменений игрового состояния при отказе (`FR-003`, `AC-003`).

### 7.3 HUD and final overlay

HTML/CSS HUD расположен в верхней полосе и остаётся видимым одновременно с
canvas. Он показывает English labels:

- `Coins`;
- `Base HP`;
- `Remaining`;
- `Tower cost`;
- `Status`;
- `Wave starts in` во время подготовки;
- action `Start`.

HUD обновляется после каждого command и simulation tick из current snapshot.
Status label показывает `Ready`, `Preparation` или `Wave active`; terminal
result показывается отдельным centered overlay. Сразу после `StartGame`
preparation countdown показывает `20 s`, затем выводит округлённое вверх
неотрицательное derived значение и исчезает при переходе в `WaveActive`. До
`Start` он не отображается как активный. `Start` enabled только в `Ready` и
disabled сразу после первого запуска независимо от числа башен.

Final overlay показывает `Victory` либо `Defeat`, `Killed`, `Escaped`,
`Coins remaining` и action `Restart`. Overlay перехватывает mouse input, чтобы
terminal session нельзя было изменить иначе чем через `Restart` (`FR-013`,
`FR-014`). Система локализации не создаётся.

## 8. Verification strategy

### 8.1 Automated tests

Gameplay tests используют config и runtime напрямую, без browser и WebGL:

- initial `Ready` state, enabled Start, blocked pre-start build и successful
  build после запуска игры (`AC-001`–`AC-003`);
- каждый build rejection и полная неизменность gameplay state (`AC-003`);
- single-use `StartGame`, ровно 20 секунд `Preparation`, отсутствие monsters до
  границы, automatic wave transition, spawn at 0/2/…/18 seconds относительно
  начала волны, route movement и wave size (`AC-004`);
- нулевой `routeProgress` на точной wave/spawn boundary, корректный active time
  при пересечении одной или нескольких boundaries и partition invariance между
  coarse interval и эквивалентными fixed steps (`AC-004`);
- отклонение отрицательного, `NaN` и бесконечного `deltaSeconds` без мутаций и
  извлечения events, а также drain command-events без gameplay systems через
  `advance(0)`;
- Euclidean range boundary, furthest-progress target, immediate first shot и
  exact one-second cooldown (`AC-005`);
- homing after range exit, exact damage и cancellation for resolved targets
  (`AC-006`);
- atomic kill reward и escape/base damage transitions (`AC-007`, `AC-008`);
- отсутствие преждевременного escape при interval, пересекающем spawn boundary
  (`AC-008`);
- purchase and immediate attack from a new tower during active wave (`AC-009`);
- immediate freeze on `Defeat` and correct `Victory` resolution
  (`AC-010`, `AC-011`);
- full session reset including entities, counters, preparation timer,
  identifiers, enabled Start и blocked build (`AC-012`);
- initial balance candidate with towers at `(6, 3)` and `(5, 5)`, built during
  preparation with no later purchases, expected to end in `Victory`; failure
  requires design balance revision rather than acceptance of the implementation
  (`AC-013`);
- derived remaining count includes unspawned monsters; preparation countdown
  starts at 20, never increases and reaches zero at automatic transition
  (`AC-014`).

UI/presenter tests в DOM environment проверяют HUD values, Start enabled только
в `Ready`, preparation countdown, rejection text, terminal statistics и Restart
dispatch. Rendering logic проверяется на корректное создание и удаление scene
objects по snapshot; pixel-perfect output не входит в automated acceptance.

### 8.2 Manual browser acceptance

Перед завершением feature обязательна проверка в desktop browser при
`1280×720`:

- весь route, entrance, exit и все buildable cells находятся в кадре;
- hover feedback и каждая rejection reason читаемы;
- до `Start` строительство недоступно, а само действие `Start` доступно без
  предварительно построенной башни;
- после `Start` виден 20-секундный countdown, башни можно строить, monsters не
  появляются, а по истечении countdown волна начинается без дополнительного
  действия;
- towers, moving monsters, HP bars и in-flight projectiles видимы;
- строительство на заработанные coins работает во время wave;
- `Victory` и `Defeat` полностью замораживают gameplay;
- `Restart` визуально и логически возвращает initial state.

Verification gate для implementation: `npm test`, `npm run lint`,
`npm run build` и описанная manual browser проверка.

## 9. Requirement coverage

| Design area | Requirements and acceptance criteria |
|---|---|
| State, commands and lifecycle | `FR-001`, `FR-005`, `FR-013`–`FR-015`; `AC-001`, `AC-004`, `AC-010`–`AC-012`, `AC-014` |
| Level, building and camera | `FR-002`–`FR-004`, `NFR-001`; `AC-001`–`AC-003`, `AC-015` |
| Spawn and monster movement | `FR-006`, `FR-010`; `AC-004`, `AC-008`, `AC-014`, `AC-015` |
| Targeting and projectiles | `FR-007`, `FR-008`; `AC-005`, `AC-006`, `AC-015` |
| Economy and active-wave building | `FR-009`–`FR-011`; `AC-007`, `AC-009` |
| HUD and final presentation | `FR-012`, `FR-014`; `AC-010`, `AC-011`, `AC-014` |
| Two-tower balance fixture | `FR-016`; `AC-013` |

## 10. Design assumptions and scope boundaries

Если assumption ниже не следует непосредственно из approved specification, оно
считается design decision с указанным в разделе 2.2 статусом, а не отдельным
product requirement.

- UI использует только English text; localization остаётся out of scope.
- Все клетки grid вне route являются buildable; hidden blockers отсутствуют.
- Fixed camera не имеет pan, rotate или zoom controls.
- Финальное visual direction, production models, textures и полноценные
  animations не определяются; sound и music не используются.
- Projectile hit определяется достижением target position, без отдельного
  collision radius.
- Background-tab catch-up ограничивается, но пользовательская pause mechanic не
  вводится.
- Этот document определяет design. Task decomposition и implementation должны
  начинаться только после отдельного явного перехода пользователя к
  соответствующему этапу.
