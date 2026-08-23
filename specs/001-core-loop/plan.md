# Technical Design: 001 Core Loop

**Feature:** `001-core-loop`  
**Status:** Draft  
**Source of truth:** `spec.md`

## 1. Design goals

Реализовать минимальный законченный Tower Defense core loop как browser
application на TypeScript, Vite и Three.js. Игровые правила должны быть
детерминированными и исполняться без зависимости от WebGL или DOM, а rendering
и UI должны только отображать состояние и отправлять команды в game runtime.

Design сохраняет границы утверждённой specification: один уровень, один тип
башни, один тип монстра и одна конечная волна. Дополнительные gameplay-механики,
camera controls, external assets и UI framework не вводятся.

Specification не задаёт скорость видимого снаряда, хотя она влияет на
разрешение атак и баланс `AC-013`. Design фиксирует её как технический balance
parameter `PROJECTILE_SPEED = 8` клеток в секунду. Значение должно быть покрыто
детерминированным balance test и не изменяет описанные в `FR-008` правила
назначения цели и нанесения урона.

## 2. Technology and project structure

### 2.1 Toolchain

- TypeScript с ES modules и strict type checking.
- Vite для development server и production build.
- Three.js для сцены, камеры, picking и процедурной low-poly graphics.
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

### 2.2 Modules and dependency direction

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

## 3. Level and balance configuration

### 3.1 Coordinates and route

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
по segments. На повороте остаток пройденной за tick дистанции переносится на
следующий segment, поэтому скорость остаётся равной одной клетке в секунду.

### 3.2 Balance parameters

Все правила хранятся в одном readonly `GameConfig`, отдельно от rendering:

| Parameter | Value | Source |
|---|---:|---|
| `STARTING_COINS` | 100 | `FR-004` |
| `TOWER_COST` | 50 | `FR-004` |
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

Расстановка башен на `(6, 3)` и `(5, 5)` является эталонным balance fixture для
`FR-016` и `AC-013`. При неизменных config values она должна завершать волну
`Victory` без дальнейшего строительства. Расстановка не показывается игроку.

## 4. Game model and public interfaces

### 4.1 State

`GameState` содержит только сериализуемые gameplay data:

```ts
type SessionStatus =
  | 'Preparation'
  | 'WaveActive'
  | 'Victory'
  | 'Defeat';

interface GameState {
  status: SessionStatus;
  simulationTime: number;
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

Tower хранит cell, `nextShotAt` и id. Monster хранит `spawnIndex`, HP,
`routeProgress` и id. Projectile хранит id, `targetId` и текущую grid/world
position. Presentation-specific mesh, color, tooltip и animation data в
`GameState` не входят.

### 4.2 Commands and results

UI взаимодействует с runtime только командами:

```ts
type GameCommand =
  | { type: 'BuildTower'; cell: GridCell }
  | { type: 'StartWave' }
  | { type: 'Restart' };

type BuildRejectionCode =
  | 'SESSION_ENDED'
  | 'OUT_OF_BOUNDS'
  | 'PATH_CELL'
  | 'OCCUPIED'
  | 'INSUFFICIENT_FUNDS';
```

`dispatch(command)` возвращает typed result. Успешная команда атомарно изменяет
state. Отклонённая `BuildTower` возвращает rejection code и не изменяет ни один
gameplay field. Проверки выполняются в указанном выше порядке, чтобы при
совпадении условий причина была детерминированной.

`StartWave` допустима только в `Preparation` при наличии хотя бы одной башни.
После запуска и после завершения session повторный `StartWave` отклоняется.
UI отражает это через disabled state кнопки `Start` (`FR-005`).

Публичная runtime boundary:

```ts
interface GameRuntime {
  dispatch(command: GameCommand): CommandResult;
  advance(deltaSeconds: number): readonly GameEvent[];
  getSnapshot(): Readonly<GameState>;
  validateBuild(cell: GridCell): BuildValidation;
}
```

`GameEvent` сообщает presentation layer о build, spawn, shot, hit, kill, escape
и session end. События используются только для visual feedback; authoritative
HUD values и scene entities всегда берутся из snapshot.

## 5. Deterministic simulation

### 5.1 Clock

Gameplay обновляется fixed timestep `1/60 s`. Animation loop накапливает
browser frame time и вызывает `advance(1 / 60)` необходимое число раз, затем
один раз renders scene. Вклад одного browser frame ограничивается 250 ms,
чтобы background tab или debugger stop не вызывали spiral of death. Управляемая
игроком pause или speed control не создаётся.

Renderer может интерполировать visual positions между предыдущим и текущим
snapshot, но interpolation не влияет на range, targeting, collision или event
timing.

### 5.2 Tick order

Каждый active simulation tick выполняет системы в фиксированном порядке:

1. применить queued commands;
2. создать всех monsters, срок spawn которых наступил;
3. переместить живых monsters и разрешить достижение exit в порядке
   `spawnIndex`;
4. немедленно установить `Defeat`, если base HP достиг 0, и прекратить tick;
5. для каждой готовой башни выбрать target и создать projectile;
6. переместить projectiles, разрешить hits, deaths и rewards;
7. установить `Victory`, если все 10 monsters resolved и base HP выше 0.

Первый monster создаётся в tick обработки `StartWave`. Готовая башня может
выпустить в него projectile в том же tick. Построенная во время волны башня
также участвует в targeting в tick успешной покупки (`FR-007`, `FR-011`).

Если monster достигает exit в том же tick, в котором projectile мог бы в него
попасть, exit разрешается первым: monster считается escaped, а назначенный ему
projectile удаляется без эффекта. При достижении `Defeat` никакие последующие
системы этого tick не выполняются.

### 5.3 Targeting and projectiles

Башня, для которой `simulationTime >= nextShotAt`, выбирает живого monster в
Euclidean range с максимальным `routeProgress`. При равном progress выбирается
меньший `spawnIndex`. После shot устанавливается
`nextShotAt = simulationTime + SHOT_COOLDOWN`; отсутствие target не сдвигает
готовность и не создаёт искусственной задержки.

Projectile каждый tick движется со скоростью `PROJECTILE_SPEED` напрямую к
текущей позиции назначенного живого target. Выход target из tower range не
влияет на projectile. Если расстояние до target не превышает travel distance
текущего tick, projectile достигает target и наносит ровно 25 damage.

При death target либо его достижении exit все назначенные ему unresolved
projectiles удаляются без retargeting, damage, reward или иных gameplay
effects. Kill transition с HP выше нуля до 0 выполняется ровно один раз и
атомарно обновляет `killedCount`, `remainingCount` и coins (`FR-008`, `FR-009`).

### 5.4 Session completion and restart

`Defeat` устанавливается сразу при переходе base HP к 0. `Victory`
устанавливается после разрешения десятого monster при положительном base HP.
Оба terminal states блокируют spawn, movement, building, attacks и economy
updates. Существующие scene entities могут остаться визуально замороженными под
final overlay, но gameplay state больше не изменяется.

`Restart` заменяет state результатом `createInitialState()`, очищает runtime
accumulator, events и presentation-only notifications. Renderer удаляет все
entity objects, которых нет в новом snapshot (`FR-015`, `AC-012`).

## 6. Rendering, input and UI

### 6.1 Three.js scene

Scene использует только процедурную low-poly geometry и материалы:

- слегка чередующиеся grass tiles для grid;
- контрастные road tiles для route;
- визуально разные entrance и exit/base markers;
- один читаемый tower mesh и один monster mesh;
- emissive sphere projectile;
- camera-facing HP bar над каждым живым monster.

Renderer хранит отображение `entityId → Object3D` и на каждом frame создаёт,
обновляет или удаляет objects по snapshot. HP bar отражает отношение текущего
HP к 100 и не является источником игровых данных.

Orthographic camera фиксирована над центром grid под isometric angle. Camera
frustum пересчитывается при resize по projected bounds всей сетки с запасом
для tower height, HP bars и projectiles. Camera position и direction при этом
не меняются, controls не создаются. Canvas занимает пространство ниже HUD;
при viewport `1280×720` camera fit должен одновременно показывать весь level и
активные entities (`AC-015`, `NFR-001`).

### 6.2 Mouse input and placement feedback

Raycaster пересекает ground plane и преобразует hit point в `GridCell`. При
hover UI вызывает `validateBuild`:

- допустимая клетка подсвечивается зелёным;
- недопустимая клетка подсвечивается красным;
- рядом с cursor показывается краткая English reason;
- при уходе cursor за grid highlight и hint скрываются.

Клик по допустимой клетке отправляет `BuildTower`. Клик по недопустимой клетке
показывает English toast с returned rejection reason на 2.5 s. Hint и toast —
presentation state, поэтому их изменение не нарушает требование об отсутствии
изменений игрового состояния при отказе (`FR-003`, `AC-003`).

### 6.3 HUD and final overlay

HTML/CSS HUD расположен в верхней полосе и остаётся видимым одновременно с
canvas. Он показывает English labels:

- `Coins`;
- `Base HP`;
- `Remaining`;
- `Tower cost`;
- `Wave`;
- action `Start`.

HUD обновляется после каждого command и simulation tick из current snapshot.
Wave label показывает `Preparation` или `Wave active`; terminal result
показывается отдельным centered overlay. `Start` disabled до первой башни и
после первого запуска.

Final overlay показывает `Victory` либо `Defeat`, `Killed`, `Escaped`,
`Coins remaining` и action `Restart`. Overlay перехватывает mouse input, чтобы
terminal session нельзя было изменить иначе чем через `Restart` (`FR-013`,
`FR-014`). Система локализации не создаётся.

## 7. Verification strategy

### 7.1 Automated tests

Gameplay tests используют config и runtime напрямую, без browser и WebGL:

- initial state, Start availability и successful build (`AC-001`, `AC-002`);
- каждый build rejection и полная неизменность gameplay state (`AC-003`);
- single-use Start, spawn at 0/2/…/18 seconds, route movement и wave size
  (`AC-004`);
- Euclidean range boundary, furthest-progress target, immediate first shot и
  exact one-second cooldown (`AC-005`);
- homing after range exit, exact damage и cancellation for resolved targets
  (`AC-006`);
- atomic kill reward и escape/base damage transitions (`AC-007`, `AC-008`);
- purchase and immediate attack from a new tower during active wave (`AC-009`);
- immediate freeze on `Defeat` and correct `Victory` resolution
  (`AC-010`, `AC-011`);
- full session reset including entities, counters, timer and identifiers
  (`AC-012`);
- two towers at `(6, 3)` and `(5, 5)`, no later purchases, ending in `Victory`
  (`AC-013`);
- derived remaining count includes unspawned monsters (`AC-014`).

UI/presenter tests в DOM environment проверяют HUD values, Start disabled
states, rejection text, terminal statistics и Restart dispatch. Rendering
logic проверяется на корректное создание и удаление scene objects по snapshot;
pixel-perfect output не входит в automated acceptance.

### 7.2 Manual browser acceptance

Перед завершением feature обязательна проверка в desktop browser при
`1280×720`:

- весь route, entrance, exit и все buildable cells находятся в кадре;
- hover feedback и каждая rejection reason читаемы;
- towers, moving monsters, HP bars и in-flight projectiles видимы;
- HUD и Start доступны до и во время wave;
- строительство на заработанные coins работает во время wave;
- `Victory` и `Defeat` полностью замораживают gameplay;
- `Restart` визуально и логически возвращает initial state.

Verification gate для implementation: `npm test`, `npm run lint`,
`npm run build` и описанная manual browser проверка.

## 8. Requirement coverage

| Design area | Requirements and acceptance criteria |
|---|---|
| State, commands and lifecycle | `FR-001`, `FR-005`, `FR-013`–`FR-015`; `AC-001`, `AC-004`, `AC-010`–`AC-012` |
| Level, building and camera | `FR-002`–`FR-004`, `NFR-001`; `AC-002`, `AC-003`, `AC-015` |
| Spawn and monster movement | `FR-006`; `AC-004`, `AC-014`, `AC-015` |
| Targeting and projectiles | `FR-007`, `FR-008`; `AC-005`, `AC-006`, `AC-015` |
| Economy and active-wave building | `FR-009`–`FR-011`; `AC-007`–`AC-009` |
| HUD and final presentation | `FR-012`, `FR-014`; `AC-010`, `AC-011`, `AC-014` |
| Two-tower balance fixture | `FR-016`; `AC-013` |

## 9. Approved assumptions and scope boundaries

- UI использует только English text; localization остаётся out of scope.
- Все клетки grid вне route являются buildable; hidden blockers отсутствуют.
- Fixed camera не имеет pan, rotate или zoom controls.
- External models, textures, sound и music не используются.
- Projectile hit определяется достижением target position, без отдельного
  collision radius.
- Background-tab catch-up ограничивается, но пользовательская pause mechanic не
  вводится.
- Этот document определяет design. Task decomposition и implementation должны
  начинаться только после отдельного явного перехода пользователя к
  соответствующему этапу.
