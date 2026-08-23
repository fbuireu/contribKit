# 12. The light-theme palette variant is app-only

Date: 2026-07-26

## Status

Accepted. A known gap, recorded rather than fixed.

## Context

Every palette in [`shared/palettes.json`](../../shared/palettes.json) defines six colours: one per contribution level, plus `noneLight`, a lighter variant of the empty-cell colour for use against a light background. The app reads it. The web does not: it types a palette as five colours and always paints empty cells with the dark `none`, so a light-theme visitor sees dark grey squares on a light page.

The obvious fix does not generalise. The SVG endpoint cannot apply it at all: an embed is rendered once and displayed inside someone else's README, which may be light or dark, and the server has no way to know which. Picking either variant is wrong for half the audience.

## Decision

`noneLight` is consumed by the app and ignored by the web. The SVG endpoint stays on a single palette; the transparent default lets the host page show through, which is the closest thing to a correct answer available to it.

Giving the endpoint an explicit theme parameter is the alternative that was not taken. It would make the embed correct at the cost of a parameter every embedder has to know to set.

## Consequences

- **The gap is only closable where the theme is actually known**, which is the client-rendered previews on the site itself. Doing that means threading the active theme into the renderers and repainting the grid when the theme toggle flips: real work, worth doing on its own rather than bundled into an unrelated fix.
- Until then a shared token is consumed by one client and ignored by the other. Anyone reading `shared/palettes.json` and expecting six colours everywhere should read this first.
- The glossary's **Palette** entry describes all six colours, because the domain has six. The web's five-colour type is the thing that is behind, not the glossary.
