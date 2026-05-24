export const TOTALS_PER_LEVEL = [0, 1, 4, 9, 16] as const;

export function formatContribLabel(dateIso: string, count: number): string {
  const dateText = new Date(dateIso + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  if (count <= 0) return `No contributions on ${dateText}`;
  if (count === 1) return `1 contribution on ${dateText}`;
  return `${count.toLocaleString()} contributions on ${dateText}`;
}
