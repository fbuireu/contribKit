declare const Temporal: {
  PlainDate: {
    from(value: string): {
      toLocaleString(locale?: string, options?: Intl.DateTimeFormatOptions): string;
    };
  };
};

export const TOTALS_PER_LEVEL = [0, 1, 4, 9, 16] as const;

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatContribLabel(dateIso: string, count: number): string {
  const dateText = Temporal.PlainDate.from(dateIso).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  if (count <= 0) return `No contributions on ${dateText}`;
  if (count === 1) return `1 contribution on ${dateText}`;
  return `${count.toLocaleString()} contributions on ${dateText}`;
}
