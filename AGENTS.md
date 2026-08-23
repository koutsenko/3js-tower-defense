# Repository Guidelines

## Project Structure & Module Organization

This repository is currently an empty Git scaffold; no application, test, or build files have been committed. As the Three.js tower-defense project is initialized, keep runtime code under `src/`, static files under `public/` or `assets/`, and automated tests under `tests/` (or beside source files as `*.test.js`). Organize gameplay by responsibility, for example `src/game/`, `src/rendering/`, `src/ui/`, and `src/config/`. Keep level data and balance values separate from rendering code so they can be tested without WebGL.

## Build, Test, and Development Commands

No package scripts are configured yet. When adding the JavaScript toolchain, expose these standard commands through `package.json` and keep this guide synchronized:

- `npm install` — install locked dependencies.
- `npm run dev` — start the local development server with hot reload.
- `npm run build` — produce the optimized distribution in `dist/`.
- `npm test` — run the complete automated test suite.
- `npm run lint` — check formatting and static-analysis rules.

Commit the generated lockfile, but never commit `node_modules/` or `dist/`.

## Coding Style & Naming Conventions

Use two-space indentation for JavaScript, TypeScript, JSON, and CSS. Prefer ES modules, small single-purpose modules, and explicit imports. Name classes and Three.js scene objects with `PascalCase`, functions and variables with `camelCase`, constants with `UPPER_SNAKE_CASE`, and asset files with `kebab-case` (for example, `stone-tower.glb`). Configure ESLint and Prettier when the initial toolchain is introduced; run both before opening a pull request.

## Testing Guidelines

No testing framework or coverage threshold exists yet. Add tests with the first gameplay systems, using `*.test.js` or `*.test.ts`. Prioritize deterministic tests for pathfinding, targeting, damage, wave timing, and economy rules. Mock time and rendering boundaries instead of requiring a browser for game-logic tests. Every bug fix should include a regression test where practical.

## Commit & Pull Request Guidelines

The repository has no commit history from which to infer conventions. Use concise Conventional Commit subjects such as `feat: add enemy pathfinding` or `fix: stop towers targeting defeated enemies`. Pull requests should explain the player-visible change, list verification commands, and link related issues. Include screenshots or a short capture for visual, UI, animation, or rendering changes. Keep each pull request focused and call out new dependencies or asset licenses.

## Security & Configuration

Do not commit secrets, local environment files, or third-party assets without compatible licenses. Provide safe defaults in `.env.example` whenever configuration is introduced.

## Specification-Driven Development

- Follow the GitHub Spec Kit convention of `spec.md`, `plan.md`, and `tasks.md` feature artifacts without installing or using the Spec Kit CLI framework.
- Store each feature under `specs/<NNN-feature-name>/`.
- Use `spec.md` for approved requirements and acceptance criteria, `plan.md` for the technical design derived from the specification, and `tasks.md` for the implementation checklist derived from both.
- Treat each feature's approved `spec.md` as the source of truth for product behavior. Keep `plan.md` and `tasks.md` consistent with it.
- Before design, read the feature's `spec.md`; before task decomposition, read `spec.md` and `plan.md`; before implementation, read all three feature artifacts.
- The user controls transitions between requirements, design, task decomposition, and implementation. Do not advance to the next stage without explicit approval.
- Do not resolve ambiguous requirements silently in implementation; stop and ask.
- Update and approve the specification before changing documented behavior.
- Reference requirement and acceptance-criterion IDs in implementation tasks and tests.
- Keep game rules independent from Three.js rendering where practical.
- Require manual browser verification for visual and interactive behavior.

## Language

- Repository instructions, code identifiers, filenames, and APIs use English.
- Specifications use Russian prose with English technical identifiers.
- Do not translate approved requirements in ways that change their meaning.
