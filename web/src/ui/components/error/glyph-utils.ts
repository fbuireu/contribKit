const ROWS = 7;
const COLS_PER_GLYPH = 5;
const DIGIT_GAP = 2;

const GLYPHS: Record<string, string[]> = {
	"0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
	"1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
	"2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
	"3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
	"4": ["00011", "00101", "01001", "10001", "11111", "00001", "00001"],
	"5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
	"6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
	"7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
	"8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
	"9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
};

const NOISE_EMPTY_MAX = 0.86;
const NOISE_SPARK_LOW_MAX = 0.96;

export function digitsToMatrix(value: string): number[][] {
	const matrix: number[][] = Array.from({ length: ROWS }, () => []);
	const characters = value.split("");

	characters.forEach((character, index) => {
		const glyph = GLYPHS[character];
		const isLastCharacter = index === characters.length - 1;

		for (let row = 0; row < ROWS; row++) {
			for (let column = 0; column < COLS_PER_GLYPH; column++) {
				const isPixelOn = glyph?.[row][column] === "1";
				matrix[row].push(isPixelOn ? 1 : 0);
			}
			if (!isLastCharacter) {
				for (let gapColumn = 0; gapColumn < DIGIT_GAP; gapColumn++) matrix[row].push(0);
			}
		}
	});

	return matrix;
}

export function noiseLevel(value: number): number {
	if (value < NOISE_EMPTY_MAX) return 0;
	if (value < NOISE_SPARK_LOW_MAX) return 1;
	return 2;
}
