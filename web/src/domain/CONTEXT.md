# domain/

Pure TypeScript. Business core. No Astro, no Cloudflare, no `fetch`.

## Rules

- Zero external imports. Only TS stdlib types.
- Functional style: factory functions return readonly objects with a discriminating `_tag`. No classes.
- Value objects validate on construction. If a `Username` exists, it is valid.
- Errors are typed `Failure` discriminated unions. Never throw.
- Repositories are interfaces only; implementations live in `infrastructure/`.

## Layout

| Directory | Contents |
|---|---|
| `value-objects/` | `Username`, `Year`, `Palette`, `ShapeKind`, `ContributionLevel` — validated, immutable |
| `entities/` | `ContributionDay`, `ContributionCalendar` — identity by username + days |
| `repositories/` | `ContributionsRepository` — interface, no impl |
| `services/` | `SvgRenderer` (pure rendering function type), `svg-geometry` (layout constants + week/month-label helpers), `cell-shapes` (per-shape SVG cell markup shared by the server and client renderers), `calendar-grid` (53×7 grid building), `dates` (ISO date math) |
| `failures/` | `Failure` discriminated union (`NotFound`, `InvalidInput`, `Network`, `Parse`) |
