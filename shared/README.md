# shared

Single source of truth for data consumed by both `web` and `app`.

**Edit the JSON files here, and never edit the copies under [`app/assets/`](../app/assets).**

- **`web`** imports these directly via the `@shared` alias at build time, so changes are picked up automatically.
- **`app` (Flutter)** can only bundle assets that live inside its own package, so it uses copies at `app/assets/*.json`. Those copies are generated from the files here:
  - automatically on commit (lefthook `pre-commit` runs `scripts/sync-shared-assets.mjs --stage` whenever a `shared/*.json` is staged),
  - in CI before the release build,
  - manually during local dev with `pnpm sync:assets`.

If you edit a file here and want to see it in a local `flutter run` before committing, run `pnpm sync:assets`.
