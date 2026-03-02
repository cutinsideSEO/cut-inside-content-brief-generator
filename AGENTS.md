# Repository Guidelines

## Project Structure & Module Organization
This is a Vite + React + TypeScript app with Supabase-backed backend generation.

- UI and app orchestration: `App.tsx`, `AppWrapper.tsx`, `components/`, `hooks/`, `contexts/`
- Domain services: `services/` (Supabase, batch jobs, generation, articles, auth)
- Shared types/utilities: `types/`, `utils/`, `lib/`, `constants.ts`
- Backend functions: `supabase/functions/` (Edge Functions and shared backend modules)
- Tests: unit tests in `tests/`, end-to-end tests in `e2e/`
- QA and operational scripts: `scripts/qa/`, docs in `docs/`

## Build, Test, and Development Commands
Use npm scripts from `package.json`:

- `npm run dev` - start local Vite dev server
- `npm run build` - production build
- `npm run preview` - preview built app
- `npm run test:unit` - run Vitest unit suite
- `npm run test:e2e` - run Playwright E2E suite
- `npm run qa:gate:core` - build + unit + backend QA checks
- `npm run qa:gate:full` - full release gate (core + migration E2E)

## Coding Style & Naming Conventions
- Language: TypeScript (`.ts`/`.tsx`)
- Indentation: 2 spaces; keep semicolon usage consistent with surrounding files
- Components: `PascalCase` filenames (e.g., `BatchProgressPanel.tsx`)
- Hooks: `useXxx` naming in `hooks/`
- Services/utilities: `camelCase` module names in `services/` and `utils/`
- UI standard: always use `shadcn/ui` components and conventions for new UI work; avoid introducing parallel component systems
- Prefer small, focused functions; reuse `_shared` backend helpers in `supabase/functions/_shared/`

## Testing Guidelines
- Frameworks: Vitest (unit), Playwright (E2E)
- Unit test files: `*.test.ts` (see `tests/services/`)
- E2E specs: `*.spec.ts` (see `e2e/`)
- Before merging backend-generation changes, run:
  - `npm run qa:gate:core`
  - Relevant E2E flow(s), or `npm run qa:gate:e2e:migration`

## Commit & Pull Request Guidelines
- Follow Conventional Commit style seen in history: `feat:`, `fix:`, `chore:`
- Keep commits scoped and descriptive (example: `fix: stale job heartbeat for article queue`)
- PRs should include:
  - What changed and why
  - Test evidence (commands run + results)
  - Screenshots for UI changes (store in `screenshots/` when relevant)
  - Notes on Supabase function deployments if backend code changed

## Security & Configuration Tips
- Use `.env.local` (see `.env.local.example`) for local config.
- Never expose provider secrets in client code.
- DataForSEO and generation processing should remain server-side via Supabase Edge Functions.
