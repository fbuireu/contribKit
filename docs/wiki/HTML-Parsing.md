# HTML Parsing

Once the contributions HTML is fetched (see **[Fetching Contributions](Fetching-Contributions)**), ContribKit extracts the data with a handful of regexes over the rendered page. The parser lives in `infrastructure/github/github-html-contributions-repository.ts`.

This is deliberately the **only** place that knows GitHub's HTML structure. If GitHub changes the markup, only these patterns need updating.

> **Why regex and not a DOM parser?** The renderer runs inside a Cloudflare Worker, where there's no DOM and bundle size/cold-start matter. A handful of focused regexes over the response text is faster, dependency-free, and easy to pin to exactly the two element shapes GitHub emits.

---

## What the page contains

GitHub renders each day as a `<td>` carrying data attributes, and exposes the exact count through a separate `<tool-tip>` element linked by `id`:

```html
<td class="ContributionCalendar-day" id="contribution-day-component-1-2"
    data-date="2024-01-02" data-level="2"> … </td>
...
<tool-tip for="contribution-day-component-1-2">4 contributions on January 2nd.</tool-tip>
```

---

## The regexes

| Pattern | Captures |
|---------|----------|
| `TD_REGEX` | each contribution-day `<td>`'s attribute string |
| `DATE_REGEX` | `data-date="YYYY-MM-DD"` |
| `LEVEL_REGEX` | `data-level="0..4"` |
| `ID_REGEX` | the `<td>`'s `id` |
| `TIP_REGEX` | each `<tool-tip for="…">N` → maps id → exact count |

---

## The two-pass parse

1. **Cells:** iterate every contribution-day `<td>`, pulling `date`, `level`, and `id`. A cell is kept only when it has both a date and a level.
2. **Tooltips:** iterate every `<tool-tip>` and build a `Map<id, count>`.
3. **Enrich:** for each day, attach the exact `count` by looking up its `id` in the map; `level` is run through `clampLevel` to guarantee it's in `0`–`4`. Days whose id isn't in the map (or that have no id) get `count: null`.
4. **Total:** if any counts were found, sum them; otherwise `total` is `null`.

The result is `{ days, total }`, where each day is `{ date, level, count }`.

### Worked example

Given the markup above, the cell pass yields `{ date: "2024-01-02", level: 2, id: "…-1-2" }`, and the tooltip pass yields `{ "…-1-2" => 4 }`. Enrichment joins them by `id` into `{ date: "2024-01-02", level: 2, count: 4 }`. If GitHub omitted the tooltip, `count` would be `null` but `level` would still be `2`. `total` sums every resolved `count`.

---

## Failure behavior

If the pass produces **zero** days, the repository returns `parse("Could not parse contributions")` rather than an empty (and misleading) calendar. That typically means GitHub changed the page structure; see **[Troubleshooting](Troubleshooting)**.

---

## See also

- **[Fetching Contributions](Fetching-Contributions)** covers where the HTML comes from.
- **[Calendar Grid](Calendar-Grid)** covers turning parsed days into a fixed grid.
