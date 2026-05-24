const monthFmt = new Intl.DateTimeFormat("en", { month: "short" });

export const MONTHS: readonly string[] = Array.from({ length: 12 }, (_, i) => monthFmt.format(new Date(2024, i, 1)));

export const DOW = ["Mon", "Wed", "Fri"] as const;
