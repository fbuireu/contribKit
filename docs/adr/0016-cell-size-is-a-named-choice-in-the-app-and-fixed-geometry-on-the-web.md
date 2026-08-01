# 16. Cell Size is a named choice in the app and fixed geometry on the web

Date: 2026-07-30

## Status

Accepted.

## Context

The glossary defines **Cell Size** as "how large each Cell is drawn, and the gap left between neighbours. Chosen from a small set of named sizes rather than typed as a number." The app implements exactly that: `CellSize` is an enum of `compact` / `normal` / `large`, each mapping to a pixel size and a gap, persisted by name so the stored value survives a change to the pixels behind it.

The web does not have the concept at all. `SvgRenderOptions` in `web/src/domain/services/types.ts` carries `cellSize?: number` and `cellGap?: number`, defaulting to `SVG_DEFAULT_CELL_SIZE` and `SVG_DEFAULT_CELL_GAP`. Those numbers are not a user choice: they come from three fixed presets in `web/src/ui/components/grid/grid-presets.ts` — hero, customize and export — each tuned to the space its surface has. The SVG endpoint's query schema accepts `palette`, `shape` and `background`, and nothing else.

So a domain word that the glossary states is never a number is, in one client's domain layer, a number. That reads like drift, and every reviewer who notices it will reach for the same two fixes.

## Decision

Cell Size is a **user-facing choice in the app only**. The web renderer takes pixel geometry, because that is what it is: a layout parameter chosen by the surface doing the rendering, not a preference expressed by a person.

Both obvious fixes were rejected. Adding a `size` query parameter to the SVG endpoint would make the embed's geometry a public contract — a README embed is sized by the markup around it, and the parameter would exist to be got wrong. Replacing the three presets with named sizes would force one vocabulary onto three surfaces whose constraints have nothing in common; "normal" in a hero banner and "normal" in an export are not the same number, and pretending otherwise is how a token stops meaning anything.

## Consequences

- **The glossary entry stands as written**, because it describes the product concept and the app is the only client that offers it. This is the same shape as [12](0012-light-theme-palette-variant-is-app-only.md): a domain word the app realises and the web deliberately does not.
- `cellSize` in `web/src/domain/services/types.ts` is geometry, not the domain's Cell Size, and is not evidence of drift. Renaming it to something like `pixelSize` would remove the collision at the price of a churn-only diff through the renderer, the presets and their tests; the name is left alone and explained here instead.
- **A size parameter on the SVG endpoint would supersede this ADR, not merely extend it.** If it is ever added, the glossary's Cell Size entry has to be revisited in the same commit, because at that point the concept exists in both clients and the two vocabularies have to agree.
- The app's stored key is the enum's `name`, so the pixel values behind `compact` / `normal` / `large` can be retuned without a migration. Renaming a *case* is the migration-requiring change, and falls under the stored-key rule in the maintenance contract.
