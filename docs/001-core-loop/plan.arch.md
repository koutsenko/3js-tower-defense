# Архитектурные практики в `001-core-loop`

Этот документ фиксирует анализ архитектурных практик и паттернов, найденных в
[`plan.md`](../../specs/001-core-loop/plan.md). Он является справочным
материалом и не заменяет `spec.md` или technical design.

При классификации важно различать полноценную реализацию паттерна, его
облегчённую разновидность и простое сходство по форме.

## 1. Ports and Adapters / Hexagonal Architecture

В design игровое ядро изолировано от внешних технологий:

- `game` и `config` не импортируют Three.js, DOM APIs или browser clock;
- browser UI преобразует ввод в команды;
- renderer и HUD получают данные через публичную границу `GameRuntime`;
- gameplay logic можно запускать и тестировать без браузера и WebGL.

Приблизительное соответствие ролей:

```text
Mouse / Browser UI -> driving adapter
GameRuntime API    -> application port
GameRuntime        -> application core
Three.js renderer  -> presentation adapter
```

Это сильное сходство с Ports and Adapters, хотя design не определяет отдельные
интерфейсы портов для каждой внешней зависимости.

Источник: Alistair Cockburn,
[Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/).

## 2. Presentation–Domain Separation

`GameRuntime` владеет игровыми правилами, а Three.js и HTML/CSS отображают их
результат. Renderer не принимает gameplay decisions, UI не владеет
authoritative counters, а presentation-specific data не входит в `GameState`.

Это соответствует практикам:

- Presentation–Domain Separation;
- Separated Presentation;
- частично Passive View.

Термин MVC менее точен: design не выделяет классический MVC controller и не
описывает обычное двустороннее взаимодействие Model–View. `GameState` также
является game/domain model, а не Presentation Model.

Источники:

- Martin Fowler,
  [Presentation Domain Separation](https://martinfowler.com/bliki/PresentationDomainSeparation.html);
- Martin Fowler,
  [Presentation Model](https://martinfowler.com/eaaDev/PresentationModel.html).

## 3. Composition Root

Application composition root создаёт runtime, renderer и UI, а затем связывает
их в animation loop. Это единое место около entry point, где собирается граф
объектов приложения.

DI container для реализации паттерна не обязателен: ручная сборка объектов в
`main.ts` также является Composition Root.

Источник: Mark Seemann,
[Composition Root](https://blog.ploeh.dk/2011/07/28/CompositionRoot/).

## 4. Single Source of Truth / Authoritative State

`GameRuntime` является единственным владельцем изменяемого gameplay state. HUD,
Three.js objects и visual effects не хранят авторитетные копии coins, HP или
entities, а проецируют состояние runtime.

Это сочетает практики:

- Single Source of Truth;
- authoritative state;
- unidirectional data flow.

Design не использует Redux буквально, но следует тому же принципу управления
состоянием.

Источник: Redux,
[Three Principles: Single source of truth](https://redux.js.org/understanding/thinking-in-redux/three-principles).

## 5. Command Pattern

UI не вызывает gameplay operations напрямую, а создаёт значения-команды:

```ts
{ type: 'BuildTower', cell }
{ type: 'StartWave' }
{ type: 'Restart' }
```

Команды передаются в `dispatch`, поэтому намерение пользователя представлено
как data, input отделён от исполнения, а изменения проходят через единую
boundary.

Это облегчённый Command Pattern. Вместо классов с методом `execute()` design
использует TypeScript discriminated union, но назначение паттерна сохраняется.

Источник: Robert Nystrom,
[Command](https://gameprogrammingpatterns.com/command.html).

## 6. Command/Query Separation и CQRS-like boundary

Публичный API разделяет операции изменения и чтения:

```ts
dispatch(command)  // change
getSnapshot()      // read
validateBuild()    // read
```

Это напоминает Command Query Responsibility Segregation, но не является
полноценным CQRS:

- write model и read model не разделены;
- snapshot читается из того же `GameState`;
- нет отдельных хранилищ и асинхронных projections;
- нет eventual consistency.

Точное название для design — command/query separation на уровне API или
CQRS-inspired boundary.

Источник и критерий отличия: Martin Fowler,
[CQRS](https://martinfowler.com/bliki/CQRS.html).

## 7. Finite State Machine

Сессия имеет конечный набор состояний:

```ts
type SessionStatus =
  | 'Preparation'
  | 'WaveActive'
  | 'Victory'
  | 'Defeat';
```

Допустимые команды и simulation behavior зависят от текущего состояния,
переходы ограничены, а terminal states останавливают gameplay changes. Это
конечный автомат — Finite State Machine.

Это пока не объектный GoF State Pattern: отдельные state objects отсутствуют,
и runtime не делегирует им поведение.

Источник: Robert Nystrom,
[State](https://gameprogrammingpatterns.com/state.html).

## 8. Game Loop

Приложение постоянно обрабатывает input, продвигает simulation и выполняет
render, не блокируясь в ожидании пользовательского ввода:

```text
input -> commands -> simulation updates -> render
```

Это классический Game Loop, отделяющий ход игрового времени от поступления
input и скорости процессора.

Источник: Robert Nystrom,
[Game Loop](https://gameprogrammingpatterns.com/game-loop.html).

## 9. Fixed Timestep with Accumulator

Design использует:

- simulation step `1/60 s`;
- accumulator browser frame time;
- от нуля до нескольких simulation steps на render frame;
- ограничение вклада одного frame значением `250 ms`;
- visual interpolation между предыдущим и текущим snapshot;
- защиту от `spiral of death`.

Это наиболее точное соответствие конкретной известной практике. Совпадают как
алгоритм, так и характерные параметры и терминология.

Источник: Glenn Fiedler,
[Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/).

## 10. Deterministic Simulation / Deterministic Update Order

Для воспроизводимого результата design задаёт:

- фиксированный timestep;
- фиксированный порядок systems;
- порядок обработки monsters по `spawnIndex`;
- tie-breaker при одинаковом `routeProgress`;
- порядок разрешения escape и projectile hit;
- немедленное прекращение tick после `Defeat`.

Целевая инварианта:

```text
same initial state
+ same command sequence
= same result
```

Фиксированный порядок важен, поскольку systems последовательно изменяют одно
состояние. Это deterministic simulation, но не deterministic lockstep
networking: network input log, rollback и state hashes не предусмотрены.

Связанный источник: Robert Nystrom,
[Update Method](https://gameprogrammingpatterns.com/update-method.html).

## 11. System Pipeline / Phased Update

Simulation tick разбит на упорядоченные фазы:

```text
spawn
-> movement and escape
-> defeat check
-> targeting and firing
-> projectile resolution
-> victory check
```

Это можно назвать phased update loop, system pipeline или deterministic system
schedule.

Design похож на ECS system scheduling, но не является ECS architecture:

- entities представлены конкретными state types;
- независимые component collections не определены;
- нет queries по комбинациям components;
- ECS storage не описан.

Связанный источник: Robert Nystrom,
[Update Method](https://gameprogrammingpatterns.com/update-method.html).

## 12. Snapshot Projection / Reconciliation

Renderer хранит соответствие `entityId -> Object3D` и на каждом frame создаёт,
обновляет или удаляет objects согласно readonly snapshot.

Это сочетает практики:

- state projection;
- reconciliation;
- retained presentation synchronized from authoritative model.

Three.js scene является материализованной проекцией gameplay state. Она может
быть восстановлена по snapshot и не используется как источник игровых данных.
Это не отдельный классический GoF pattern; концептуально решение близко к
Presentation Model и unidirectional UI.

## 13. Snapshot + Transient Events

Design разделяет два вида информации:

- snapshot описывает, что истинно сейчас;
- events описывают, что только что произошло: `shot`, `hit`, `kill`,
  `session-end` и другие visual cues.

Events не являются источником gameplay data, поэтому это не Event Sourcing. При
Event Sourcing состояние должно восстанавливаться из сохранённого event log.

Это также не полный Event Queue Pattern: `advance()` синхронно возвращает массив
events, а отдельный отложенный FIFO processor не описан. Точнее называть решение
transient event stream или notification events.

Источники:

- Martin Fowler,
  [Focusing on Events](https://martinfowler.com/eaaDev/EventNarrative.html);
- Robert Nystrom,
  [Event Queue](https://gameprogrammingpatterns.com/event-queue.html).

## 14. Minimal State / Derived Data

`remainingCount` не хранится независимо, а вычисляется:

```ts
WAVE_SIZE - killedCount - escapedCount
```

Это minimal state / derived state: значения, которые можно однозначно получить
из исходного состояния, не дублируются. Так уменьшается риск рассинхронизации
счётчиков.

Источник: Redux,
[Deriving Data with Selectors](https://redux.js.org/usage/deriving-data-selectors).

## 15. Data-Driven Configuration

Level geometry и balance parameters вынесены в readonly `LevelConfig` и
`GameConfig`, отдельно от rendering и mutable session state.

Это data-driven design в умеренном смысле:

- правила получают параметры из конфигурации;
- уровень описывается данными;
- balance можно тестировать и менять без изменения renderer;
- design-time definitions отделены от session instances.

Это не полноценная data-oriented architecture и не Type Object Pattern.

## 16. Headless Domain Testing

Gameplay tests запускают config и runtime напрямую, без browser и WebGL. Это
практики headless testing, framework-independent domain testing и testable core.

Подход непосредственно поддерживается Ports and Adapters: application core
должно быть возможно тестировать отдельно от UI и runtime devices.

В design проверки разделены по границам ответственности:

- gameplay rules — automated tests;
- DOM presentation — UI/presenter tests;
- visual и interactive behavior — manual browser acceptance.

## 17. Executable Specification / Acceptance Tests

Automated tests сформулированы как проверки `AC-001`–`AC-014`, а не как тесты
конкретных методов или классов. Balance test, например, должен подтвердить
победу с двумя стартовыми башнями.

Это сочетает:

- specification by example;
- executable acceptance criteria;
- requirements-based testing.

Тесты проверяют обещанное product behavior и допускают изменение внутренней
реализации без переписывания требований.

## 18. Requirements Traceability Matrix

Раздел `Requirement coverage` связывает design areas с `FR-*` и `AC-*`, а
verification strategy ссылается на соответствующие acceptance criteria.

Получается цепочка:

```text
requirement -> design area -> verification/test
```

Это облегчённая Requirements Traceability Matrix.

Источник: NASA,
[Requirements Verification Matrix](https://www.nasa.gov/reference/appendix-d-requirements-verification-matrix/).

## 19. ADR-lite / Architecture Decision Log

Таблица design decisions содержит:

- рассматриваемый вопрос;
- alternatives;
- proposed decision;
- rationale;
- status `Proposed`.

Это формат, близкий к Architecture Decision Record, но несколько решений
собраны в одном document вместо отдельных ADR files. Точное название — embedded
decision log или ADR-lite.

Источник: Martin Fowler,
[Architecture Decision Record](https://martinfowler.com/bliki/ArchitectureDecisionRecord.html).

## Итоговая архитектурная формула

Design можно кратко описать так:

```text
Ports and Adapters
  + authoritative serializable state
  + command-driven input
  + FSM session lifecycle
  + fixed-timestep deterministic game loop
  + ordered system pipeline
  + snapshot-based presentation
  + transient visual events
  + requirements-driven verification
```

Наиболее сильные и однозначные соответствия:

1. Fixed Timestep with Accumulator.
2. Game Loop.
3. Ports and Adapters / Presentation–Domain Separation.
4. Composition Root.
5. Command Pattern.
6. Finite State Machine.
7. Single Source of Truth.
8. Requirements Traceability.

CQRS, Event Queue, Event Sourcing, MVC и ECS являются соседними концепциями, но
не реализованы в design полностью и не должны использоваться как его точные
названия без соответствующих оговорок.
