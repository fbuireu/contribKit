import { invalidInput, type Failure } from '../failures/failure';

const MIN_YEAR = 2005;

export interface Year {
  readonly _tag: 'Year';
  readonly value: number;
}

export const parseYear = (input: number | string | null | undefined): Year | null | Failure => {
  if (input === null || input === undefined || input === '') return null;
  const n = typeof input === 'number' ? input : Number.parseInt(input, 10);
  if (!Number.isInteger(n)) return invalidInput('year', 'Year must be an integer');
  const current = new Date().getFullYear();
  if (n < MIN_YEAR || n > current) {
    return invalidInput('year', `Year must be between ${MIN_YEAR} and ${current}`);
  }
  return { _tag: 'Year', value: n };
};

export const isYear = (value: unknown): value is Year =>
  typeof value === 'object' && value !== null && (value as { _tag?: unknown })._tag === 'Year';
