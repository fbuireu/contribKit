import type { IsoDate } from "@domain/value-objects/iso-date";

export const UNKNOWN_FIGURE_TEXT = "unknown";

export const formatTotalContributions = (totalContributions: number | null): string =>
	totalContributions === null ? UNKNOWN_FIGURE_TEXT : totalContributions.toLocaleString();

export const formatStreak = (streak: number | null): string => (streak === null ? UNKNOWN_FIGURE_TEXT : String(streak));

export interface FormatContribLabelParams {
	dateIso: IsoDate | null;
	count: number | null;
}

const countLabelFor = (count: number | null): string => {
	if (count === null) return "Contributions unknown";
	if (count <= 0) return "No contributions";
	if (count === 1) return "1 contribution";
	return `${count.toLocaleString()} contributions`;
};

export function formatContribLabel({ dateIso, count }: FormatContribLabelParams): string {
	const countLabel = countLabelFor(count);
	if (dateIso === null) return countLabel;
	const dateText = new Date(`${dateIso}T12:00:00`).toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
		year: "numeric",
	});
	return `${countLabel} on ${dateText}`;
}
