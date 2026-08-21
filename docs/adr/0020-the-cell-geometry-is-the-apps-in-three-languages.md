# 20. The Cell geometry is the app's, in three languages

Date: 2026-08-21

## Status

Accepted. Does not contradict [16](0016-cell-size-is-a-named-choice-in-the-app-and-fixed-geometry-on-the-web.md), which is about who *chooses* a Cell Size; this is about how a Cell of a given size is *drawn*.

## Context

A Cell is drawn by five renderers: the app's on-screen grid, its SVG Export, its PNG Export, the Android home-screen widget, and the web's `svgStringRenderer` (which the browser preview shares through `renderCellShape`). Each had grown its own copy of the same three numbers, and the copies had diverged.

The dot radius and the hex vertices agreed everywhere. The rounded corner did not. The app's exports and the Android widget scaled it with the Cell Size, at `cell * 0.2`, while the web wrote a fixed `2.5` at every size. Nothing detected the difference, because nothing compared them: an SVG the app exports and an SVG the endpoint renders are two files nobody diffs, and the widget is a bitmap.

Two ways out. Give the web the app's ratio, which changes what the published Embed looks like. Or give the app the web's constant, which breaks the app's own Cell Size feature: at `compact` a fixed `2.5` corner on a smaller cell is visibly rounder, and at `large` it is visibly squarer, so the shape a person picked would stop being the shape they saw.

The second option is not really available. The first one is a visible change to output that is already sitting in other people's READMEs.

## Decision

**The formulas live in one module per language, and the app's ratio is the one that is right.**

`CellGeometryService` in `app/lib/domain/services/` owns `cornerRadiusFor`, `dotRadiusFor` and `hexVerticesFor`, over `cornerRadiusRatio` (0.2), `dotBaseRadius` (1.4), `dotReferenceCellSize` (10.0) and `hexVertexCount` (6). `svg-geometry.ts` in `web/src/domain/services/` is the same three formulas over the same first three constants, and `calendarLayout` is the single call every web renderer takes its whole geometry from.

**The published Embed's rounded corner moved from 2.5 to 2.0**, because `SVG_DEFAULT_CELL_SIZE` is 10 and 10 times 0.2 is 2. That was accepted rather than worked around. A per-client constant would have kept the old pixel and re-created the divergence it was there to remove.

**Kotlin is the third copy and cannot be made a reference.** `drawCell` in `ContribKitWidgetProvider.kt` spells `0.2f`, `1.4f`, `10f` and `6` as literals, because a widget provider runs in the Android process with no access to Dart. Changing a constant in the Dart or the TypeScript produces no compile error and no failing test there.

## Consequences

- **A Cell Shape's maths belongs in the geometry module, never in a renderer.** Five renderers with their own copies is the state this replaced, and it took two passes to find, because a wrong corner radius looks like a design choice.
- **The pairing with Kotlin is prose and a code review, and that is a real gap.** `app/test/ui/features/widget/dart_kotlin_seam_test.dart` covers the strings that cross that boundary and cannot cover the numbers, because the widget renders to a bitmap this project has no way to assert on. If the Cell ever looks wrong on the home screen and right everywhere else, this is where to look first.
- **Reversing this is a second visible change, not an undo.** Every Embed already in a README re-rendered with a 2.0 corner the first time its cache expired. Putting 2.5 back would move them again.
- **It constrains the Embed's geometry, not its size.** `SVG_DEFAULT_CELL_SIZE` stays a fixed number fed by three presets and the SVG endpoint still takes no size parameter, which is [16](0016-cell-size-is-a-named-choice-in-the-app-and-fixed-geometry-on-the-web.md) and is unaffected.
- Where it bites: `app/lib/domain/CLAUDE.md` under `CellGeometryService`, `web/src/domain/CLAUDE.md` under the Cell maths gotcha, and `docs/wiki/SVG-Rendering.md`.
