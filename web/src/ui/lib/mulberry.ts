const WEYL_INCREMENT = 0x6d2b79f5;
const FIRST_MIX_SHIFT = 15;
const FIRST_ODD_MASK = 1;
const SECOND_MIX_SHIFT = 7;
const SECOND_ODD_MASK = 61;
const FINAL_MIX_SHIFT = 14;
const UINT32_RANGE = 0x1_00_00_00_00;

export const mulberry32 = (seed: number): (() => number) => {
	let state = seed;
	return () => {
		state += WEYL_INCREMENT;
		let hash = state;
		hash = Math.imul(hash ^ (hash >>> FIRST_MIX_SHIFT), hash | FIRST_ODD_MASK);
		hash ^= hash + Math.imul(hash ^ (hash >>> SECOND_MIX_SHIFT), hash | SECOND_ODD_MASK);
		return ((hash ^ (hash >>> FINAL_MIX_SHIFT)) >>> 0) / UINT32_RANGE;
	};
};
