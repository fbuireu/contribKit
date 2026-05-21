// Mulberry32 PRNG (Tommy Ettinger, 2017).
//
// Deterministic pseudo-random number generator: same seed → same sequence of
// floats in [0, 1). Used to keep SSR + client renders consistent on the
// GitHub-fetch fallback path, and to seed decorative grids in widget mockups.
// NOT cryptographically secure.

// Weyl sequence step — odd 32-bit constant tuned empirically by the algorithm
// author. Adding it on every call walks the internal state through every
// 32-bit value exactly once before repeating (period = 2^32).
const WEYL_INCREMENT = 0x6d2b79f5;

// Bit-mixing parameters. Three avalanche rounds: each combines an xor-shift
// with a multiplication by an odd value (OR-mask forces the low bit to 1 so
// the multiplication stays invertible mod 2^32 — no information lost).
const FIRST_MIX_SHIFT = 15;
const FIRST_ODD_MASK = 1;
const SECOND_MIX_SHIFT = 7;
const SECOND_ODD_MASK = 61;
const FINAL_MIX_SHIFT = 14;

// 2^32 — divides an unsigned 32-bit integer into [0, 1).
const UINT32_RANGE = 0x1_00_00_00_00;

export const mulberry32 = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state += WEYL_INCREMENT;
    let t = state;
    t = Math.imul(t ^ (t >>> FIRST_MIX_SHIFT), t | FIRST_ODD_MASK);
    t ^= t + Math.imul(t ^ (t >>> SECOND_MIX_SHIFT), t | SECOND_ODD_MASK);
    return ((t ^ (t >>> FINAL_MIX_SHIFT)) >>> 0) / UINT32_RANGE;
  };
};
