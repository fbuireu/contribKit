# 24. Calendar Labels are a web-only surface

Date: 2026-08-29

## Status

Accepted.

## Context

[`CONTEXT.md`](../../CONTEXT.md) defines **Calendar Labels** as "the month strip along the top of the Contribution Grid and the weekday strip down its side, which can be shown or hidden". It is a first-class term in the ubiquitous language.

The web implements all of it: `MONTH_LABELS` and `WEEKDAY_LABELS` in `web/src/domain/value-objects/calendar-labels.ts`, `CalendarLabelPlacement` and `monthLabelsFor` in `svg-geometry.ts`, and a `showLabels` flag threaded through `SvgRenderOptions` down to `svgStringRenderer`. The landing page passes `true` for the hero and `false` for the widget mock, so the show-or-hide half is real and used.

The app implements none of it. Grepping `app/lib` for a month or weekday label construct returns nothing. `ContributionGrid` renders bare columns of `ContributionCell`; `SvgExportRepository` emits a `<title>` and cells; `PngExportRepository` paints cells; the Kotlin widget merges columns and draws squares.

So a person exporting an SVG from the phone gets an unlabelled lattice while the web embed of the same calendar is labelled, and until this ADR nothing recorded that. A DDD symmetry audit found it beside four other one-sided concepts, and the other four were either already recorded ([ADR 0012](0012-light-theme-palette-variant-is-app-only.md) for `noneLight`, [ADR 0016](0016-cell-size-is-a-named-choice-in-the-app-and-fixed-geometry-on-the-web.md) for Cell Size) or have since been brought into line. This one was the only genuinely unbuilt half with no note anywhere.

## Decision

Calendar Labels stay a web-only surface, and this ADR is the record of that rather than a plan to close the gap.

The reason is the surface, not the model. A labelled grid needs room for a twelve-month strip across the top and a weekday strip down the side, and it needs the grid to be laid out at a width where those strips are legible. The web embed is a wide image dropped into a README, which is exactly that. The app's three surfaces are not:

- **The Viewer** scrolls the grid horizontally on a phone. A month strip pinned above a scrolling lattice is a different widget with its own synchronisation, not a label.
- **The Home Screen Widget** is about four centimetres wide and already merges weeks into as many columns as fit, so a month has no stable column to sit above.
- **The two Exports** are deliberately the cell lattice and nothing else. `ExportGeometryService` sizes the document as exactly `weeks x step` by `7 x step`; adding label strips changes every exported dimension and every pixel assertion that pins them.

Adding `MONTH_LABELS` and `WEEKDAY_LABELS` to `app/lib/domain/` without a renderer that reads them would create a token nothing consumes, which the root [`CLAUDE.md`](../../CLAUDE.md) names as a trap this repository has already fallen into once.

## Consequences

- **An SVG exported from the app and an SVG served by the web are not the same image**, and that is now a stated difference rather than a surprise. They agree on the cell lattice, the Palette, the Cell Shape and the geometry ([ADR 0020](0020-the-cell-geometry-is-the-apps-in-three-languages.md)); they differ on labels.
- **`showLabels` has no Dart counterpart**, and `SvgRenderOptions` keeps a field the app's `RenderOptions` does not carry. A reader diffing the two render option types will find it and should find this ADR.
- **If the app grows a labelled export**, this decision is what to revisit, and the work is a rendering feature: where the strips sit on a scrolled grid, whether the widget opts out, and what happens to the exported dimensions. It is not a modelling change, which is why it was wrong to make it silently during an audit.
- The glossary keeps its Calendar Labels entry. A term the ubiquitous language defines does not have to be implemented by every client, and [ADR 0016](0016-cell-size-is-a-named-choice-in-the-app-and-fixed-geometry-on-the-web.md) already set that precedent in the other direction.
