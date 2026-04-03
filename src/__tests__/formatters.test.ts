import { formatNumber, formatDuration, formatProgress, formatPercent } from '../utils/formatters';

// ─── formatNumber ────────────────────────────────────────────
describe('formatNumber', () => {
  test('numbers below 1000 shown as integer', () => {
    expect(formatNumber(42)).toBe('42');
  });

  test('zero returns 0', () => {
    expect(formatNumber(0)).toBe('0');
  });

  test('numbers >= 1000 shown as K', () => {
    expect(formatNumber(1000)).toBe('1.0K');
    expect(formatNumber(1500)).toBe('1.5K');
    expect(formatNumber(999999)).toBe('1000.0K');
  });

  test('numbers >= 1M shown as M', () => {
    expect(formatNumber(1000000)).toBe('1.0M');
    expect(formatNumber(2500000)).toBe('2.5M');
  });

  test('decimal numbers are floored', () => {
    expect(formatNumber(99.9)).toBe('99');
  });
});

// ─── formatDuration ──────────────────────────────────────────
describe('formatDuration', () => {
  test('zero returns 0s', () => {
    expect(formatDuration(0)).toBe('0s');
  });

  test('negative returns 0s', () => {
    expect(formatDuration(-10)).toBe('0s');
  });

  test('seconds only', () => {
    expect(formatDuration(45)).toBe('45s');
  });

  test('minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2d 5s');
  });

  test('hours and minutes', () => {
    expect(formatDuration(3661)).toBe('1s 1d');
  });

  test('exact hour', () => {
    expect(formatDuration(3600)).toBe('1s 0d');
  });
});

// ─── formatProgress ──────────────────────────────────────────
describe('formatProgress', () => {
  test('formats current / max', () => {
    expect(formatProgress(50, 100)).toBe('50 / 100');
  });

  test('large numbers use K/M format', () => {
    expect(formatProgress(1500, 10000)).toBe('1.5K / 10.0K');
  });
});

// ─── formatPercent ───────────────────────────────────────────
describe('formatPercent', () => {
  test('formats ratio as percentage', () => {
    expect(formatPercent(0.5)).toBe('%50');
  });

  test('zero ratio', () => {
    expect(formatPercent(0)).toBe('%0');
  });

  test('full ratio', () => {
    expect(formatPercent(1)).toBe('%100');
  });

  test('rounds to nearest integer', () => {
    expect(formatPercent(0.333)).toBe('%33');
  });
});
