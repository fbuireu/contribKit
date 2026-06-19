# Deterministic Randomness (Mulberry32)

Some UI surfaces need a contribution grid that *looks* plausible before real data has loaded: skeleton/placeholder grids, the mini-grid, and the error page's decorative calendar. Rather than `Math.random()` (which would flicker on every render and can't be tested), ContribKit uses a **seeded** PRNG: Mulberry32. It lives in `web/src/ui/utils/mulberry.ts`.

---

## Why seeded

- **Deterministic:** the same seed always yields the same sequence, so a placeholder grid is stable across re-renders and identical between SSR and hydration (no layout flicker, no mismatch).
- **Testable:** a fixed seed gives a fixed output, so the PRNG and anything built on it can be unit-tested.
- **Tiny & fast:** Mulberry32 is a single-`uint32`-state generator, ideal for non-cryptographic visual use.

> Mulberry32 is **not** cryptographically secure. It is only used for visual placeholder data, never for anything security-sensitive.

---

## The algorithm

```ts
export const mulberry32 = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;            // Weyl increment
    let hash = state;
    hash = Math.imul(hash ^ (hash >>> 15), hash | 1);
    hash ^= hash + Math.imul(hash ^ (hash >>> 7), hash | 61);
    return ((hash ^ (hash >>> 14)) >>> 0) / 0x1_00_00_00_00;
  };
};
```

It advances an internal state by a fixed odd increment, runs it through two `Math.imul` mixing steps, and normalizes the final `uint32` to a float in `[0, 1)`.

In the source the magic numbers are named constants:

| Constant | Value | Role |
|----------|-------|------|
| `WEYL_INCREMENT` | `0x6d2b79f5` | per-step state advance (a Weyl sequence) |
| `FIRST_MIX_SHIFT` / `FIRST_ODD_MASK` | `15` / `1` | first `imul` mix |
| `SECOND_MIX_SHIFT` / `SECOND_ODD_MASK` | `7` / `61` | second `imul` mix |
| `FINAL_MIX_SHIFT` | `14` | final xorshift before normalizing |
| `UINT32_RANGE` | `0x1_00_00_00_00` | divisor that maps the `uint32` into `[0, 1)` |

Mulberry32 holds a single 32-bit state, giving a period of 2³². That's far more than enough for a few hundred placeholder cells, and the whole generator compiles to a handful of integer ops.

---

## Where it's used

| Caller | Purpose |
|--------|---------|
| `ui/components/grid/calendar.ts` | seeded placeholder levels for the loading grid |
| `ui/components/grid/mini-grid.ts` | the small decorative grid |
| `ui/components/error/ContributionCode.astro` | the calendar art on error pages |

Each caller picks a seed, calls `mulberry32(seed)`, then draws from the returned function to assign placeholder levels.

---

## See also

- **[Calendar Grid](Calendar-Grid)** is the real, data-driven grid this stands in for.
- **[SVG Rendering](SVG-Rendering)** covers how levels become colored cells.
