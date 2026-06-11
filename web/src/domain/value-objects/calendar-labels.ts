const monthFormat = new Intl.DateTimeFormat("en", { month: "short" });

const TOTAL_MONTHS = 12;

export const MONTHS: readonly string[] = Array.from({ length: TOTAL_MONTHS }, (_, monthIndex) =>
	monthFormat.format(new Date(2024, monthIndex, 1)),
);

export const DOW = ["Mon", "Wed", "Fri"] as const;
