export interface ShuffledData {
	letter: string;
	order: number;
}

export const decrypt = (data: ShuffledData[]): string =>
	[...data]
		.sort((a, b) => a.order - b.order)
		.map((part) => part.letter)
		.join("");
