# Repository Guidelines

## Project Overview

This repository contains a browser-based Three.js tower-defense game written in
TypeScript. The implemented core loop is specified under
`specs/001-core-loop/`; read its approved artifacts before changing gameplay
behavior or architecture.

Keep repository guidance durable. Feature behavior, balance values, task
statuses, and acceptance evidence belong in the corresponding `specs/`
artifacts rather than this file.

## Project Structure & Module Organization

- `src/app/` — application composition and the fixed-step browser loop.
- `src/config/` — data-only level geometry and gameplay balance configuration.
- `src/game/` — deterministic gameplay state, commands, systems, and runtime.
- `src/rendering/` — Three.js scene creation and snapshot projection.
- `src/ui/` — DOM HUD, overlays, placement input, and player feedback.
- `tests/` — Vitest suites mirroring the runtime module boundaries.
- `specs/<NNN-feature-name>/` — approved requirements, design, implementation
  tasks, change requests, and generated review or acceptance artifacts.
- `dist/` — generated production output; never commit it.

Keep gameplay rules independent from WebGL and the DOM. Store level geometry
and balance values separately from mutable session state. Prefer small,
single-purpose modules and introduce shared abstractions only when their
responsibility is clear across multiple callers.

## Architecture Boundaries

- `src/config/` and `src/game/` must not import Three.js, DOM APIs, or browser
  clocks.
- `GameState` is the authoritative gameplay state. Rendering and UI consume
  readonly snapshots and send commands through the runtime boundary.
- The application composition root owns integration between runtime,
  rendering, UI, and the animation loop.
- Gameplay time is measured in seconds. The browser normally advances the game
  in fixed `1/60 s` steps, but `advance(deltaSeconds)` must correctly process
  any valid non-negative interval.
- Split gameplay intervals chronologically at lifecycle, spawn, targeting,
  projectile, escape, and terminal boundaries. Preserve partition invariance:
  equivalent total gameplay time and commands must produce equivalent state
  regardless of interval partitioning.
- Keep transient rendering data, meshes, DOM elements, and browser timing out
  of authoritative gameplay state.

The detailed core-loop architecture and temporal naming convention are defined
in `specs/001-core-loop/plan.md` and
`specs/001-core-loop/changes/CR-002.md`.

## Build, Test, and Development Commands

- `npm install` — install dependencies from the committed lockfile.
- `npm run dev` — start the Vite development server with hot reload.
- `npm run build` — run the TypeScript check and create the production build in
  `dist/`.
- `npm test` — run all Vitest tests once.
- `npm run lint` — run ESLint and verify Prettier formatting.
- `npm run capture:acceptance` — build the local acceptance evidence with
  Playwright for `001-core-loop`.
- `npm run report:identifiers` — regenerate the local HTML identifier-frequency
  report under `specs/001-core-loop/artifacts/`.

Commit `package-lock.json`. Never commit `node_modules/`, `dist/`, coverage
output, local environment files, or machine-specific configuration.

## Coding Style & Naming Conventions

Use two-space indentation for TypeScript, JavaScript, JSON, and CSS. Prefer ES
modules and explicit imports. Run ESLint and Prettier before committing.

- Classes and Three.js scene objects: `PascalCase`.
- Functions and variables: `camelCase`.
- Module-level constants: `UPPER_SNAKE_CASE`.
- Asset filenames: `kebab-case`, for example `stone-tower.glb`.
- Include units in names when a scalar would otherwise be ambiguous, for
  example `deltaSeconds` or `durationMs`.

Use these prefixes for gameplay temporal operations:

- `get` — read an existing value without prediction, substantial calculation,
  or mutation;
- `calculate` — deterministically calculate a value from a schedule,
  configuration, or explicit arguments;
- `predict` — conditionally calculate a future gameplay event or boundary from
  current state; discard and recalculate the result after intervening events;
- `is`, `has`, `can` — inspect actual state at the current boundary;
- `select` — choose from candidates that are actually available now;
- `schedule` — persist a future event or time for later use;
- `resolve` — apply an event that is due and mutate authoritative state;
- `advance`, `move` — progress state through a supplied time interval.

Do not use `predict` to imply probability. Predictions in this codebase are
deterministic for current state and configuration but conditional on no earlier
event invalidating them.

## Testing Guidelines

Use Vitest for unit and integration tests, jsdom for DOM behavior, and
Playwright for browser acceptance capture. Place tests under `tests/` using
`*.test.ts` and mirror the corresponding source responsibility.

Prioritize deterministic coverage for:

- lifecycle and interval boundaries;
- spawning, movement, and escape;
- targeting, cooldowns, projectiles, damage, and rewards;
- building validation and economy rules;
- terminal outcomes and restart;
- snapshot projection, UI feedback, and rendering reconciliation.

Mock or control time and rendering boundaries instead of requiring a browser
for gameplay-logic tests. Preserve coarse-versus-partitioned equivalence tests
for time-dependent systems. Every bug fix should include a regression test
where practical. Reference applicable requirement and acceptance-criterion IDs
in feature implementation tests.

Run `npm test`, `npm run lint`, and `npm run build` for gameplay or architecture
changes. Visual and interactive changes additionally require manual browser
verification; update acceptance captures when their evidence is affected.

## Commit & Pull Request Guidelines

Use concise Conventional Commit subjects, such as
`feat: add enemy pathfinding`, `fix: preserve projectile timing`, or
`docs: clarify targeting boundaries`.

Keep commits and pull requests focused. Pull requests should explain the
player-visible or architectural change, list verification commands, link
related issues or change requests, and call out new dependencies or asset
licenses. Include screenshots or a short capture for visual, UI, animation, or
rendering changes.

Do not rewrite shared branch history unless explicitly requested. Prefer
`--force-with-lease` over an unrestricted force push when an approved history
rewrite is necessary.

## Security & Configuration

Do not commit secrets, credentials, local environment files, or third-party
assets without compatible licenses. Provide safe defaults in `.env.example`
when configuration is introduced. Validate configuration at its construction
boundary and avoid repeatedly checking immutable invariants in hot gameplay
paths.

## Specification-Driven Development

- Follow the GitHub Spec Kit convention of `spec.md`, `plan.md`, and `tasks.md`
  without installing or using the Spec Kit CLI framework.
- Store each feature under `specs/<NNN-feature-name>/`.
- Use `spec.md` for approved requirements and acceptance criteria, `plan.md`
  for the technical design derived from the specification, and `tasks.md` for
  the implementation checklist derived from both.
- Identify functional requirements as `FR-XXX` and acceptance criteria as
  `AC-XXX`.
- Treat the approved `spec.md` as the source of truth for product behavior.
  Keep `plan.md`, `tasks.md`, implementation, and tests consistent with it.
- Before design, read `spec.md`; before task decomposition, read `spec.md` and
  `plan.md`; before implementation, read all three feature artifacts.
- The user controls transitions between requirements, design, task
  decomposition, and implementation. Do not advance without explicit approval.
- Do not silently resolve ambiguous requirements during implementation. Stop
  and ask for a product decision.
- Update and approve the specification before changing documented behavior.
- For a change discovered after approval, record impact and migration under
  `specs/<NNN-feature-name>/changes/CR-NNN.md`, then update approved artifacts
  in their required order.
- Reference requirement and acceptance-criterion IDs in implementation tasks
  and tests.
- Require manual browser verification for visual and interactive behavior.

For the current feature, use:

- `specs/001-core-loop/spec.md` — approved behavior;
- `specs/001-core-loop/plan.md` — approved architecture;
- `specs/001-core-loop/tasks.md` — implementation and verification status;
- `specs/001-core-loop/changes/` — approved change requests.

## Language

- Repository instructions, code identifiers, filenames, and APIs use English.
- Specifications, plans, tasks, and change requests use Russian prose with
  English technical identifiers.
- Code comments may use Russian when they explain domain or mathematical intent
  for the current project audience; keep identifiers and API terminology in
  English.
- Do not translate approved requirements in ways that change their meaning.
