export const UNKNOWN_TOTAL_TEXT = "unknown";

export const formatTotalContributions = (total: number | null): string =>
	total === null ? UNKNOWN_TOTAL_TEXT : total.toLocaleString();

export interface FormatContribLabelParams {
	dateIso: string;
	count: number | null;
}

export function formatContribLabel({ dateIso, count }: FormatContribLabelParams): string {
	const dateText = new Date(`${dateIso}T12:00:00`).toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
		year: "numeric",
	});
	if (count === null) return `Contributions unknown on ${dateText}`;
	if (count <= 0) return `No contributions on ${dateText}`;
	if (count === 1) return `1 contribution on ${dateText}`;
	return `${count.toLocaleString()} contributions on ${dateText}`;
}
