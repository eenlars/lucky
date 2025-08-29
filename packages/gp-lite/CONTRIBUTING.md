# Contributing to lite-gp

Thanks for your interest in improving lite-gp! This guide helps you get productive quickly and sets expectations for code quality.

## Development Setup

- Requirements: Node 18+, Bun 1.x, pnpm or npm.
- Install deps at repo root, then within this package if needed.
- Useful scripts in this package:
  - `bun run tsc` – typecheck
  - `bun run test` – run unit tests
  - `bun run lint` – ESLint (TypeScript)
  - `bun run format` – Prettier (2 spaces, no semicolons)

## Coding Standards

- TypeScript only, no runtime dependencies.
- Keep the public API surface small and focused.
- Prefer pure functions and small, composable utilities.
- Document exported types and functions with TSDoc.
- Avoid one-letter variable names; keep names descriptive.
- Maintain determinism: all randomness comes from the provided RNG.

## Tests

- Framework: Vitest. All tests must pass on CI.
- Location: `__tests__/*.test.ts`
- Patterns: unit-first; prefer deterministic tests with seeded RNG.

## Performance

- Keep tight loops allocation-free when possible.
- Avoid unnecessary copies in hot paths.
- Provide micro-optimizations only when they are measured to matter.

## Releases

- Follow SemVer. Breaking changes bump MAJOR and must be clearly documented in `CHANGELOG.md` and `README.md`.
- Keep release automation lightweight:
  1) Bump version in `packages/lite-gp/package.json` and update `CHANGELOG.md`.
  2) Commit and push to main.
  3) Tag the commit as `lite-gp-vX.Y.Z` and push tags: `git tag lite-gp-vX.Y.Z && git push --tags`.
  4) GitHub Action `lite-gp Release` will build and publish to npm using `NPM_TOKEN`.
  - Optional: trigger manually with `workflow_dispatch` and `dry_run=true` to preview the publish.

## Security & Disclosure

- See `SECURITY.md` for reporting vulnerabilities.

## Questions

Open a discussion or an issue with a minimal reproduction.
