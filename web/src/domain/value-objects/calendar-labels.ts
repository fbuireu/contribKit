const monthFormat = new Intl.DateTimeFormat("en", { month: "short" });

const TOTAL_MONTHS = 12;

export const MONTHS: readonly string[] = Array.from({ length: TOTAL_MONTHS }, (_, i) =>
	monthFormat.format(new Date(2024, i, 1)),
);

export const DOW = ["Mon", "Wed", "Fri"] as const;
