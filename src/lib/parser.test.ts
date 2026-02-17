import { describe, expect, it } from 'vitest';
import { normaliseRows, parseHours, parseMoney, parseUkDate } from './parser';

describe('parsing primitives', () => {
  it('parses UK dates', () => {
    expect(parseUkDate('27/08/2025')?.toISOString().startsWith('2025-08-27')).toBe(true);
    expect(parseUkDate('27/08/2025 10:30')?.getHours()).toBe(10);
  });

  it('parses money', () => {
    expect(parseMoney('£1,200')).toBe(1200);
  });

  it('parses hours', () => {
    expect(parseHours('2:30')).toBe(2.5);
    expect(parseHours('1.25')).toBe(1.25);
  });
});

describe('normalisation', () => {
  it('maps synonyms and fallback project code', () => {
    const { tasks } = normaliseRows([
      { Task: '1543INV02 Landing page', Assignee: 'May', 'Est. Hours': '2:30', Budget: '£600', DR: '27/08/2025 10:30', Project: 'Alpha' },
    ]);
    expect(tasks[0].taskName).toContain('1543INV02');
    expect(tasks[0].projectCode).toBe('1543');
    expect(tasks[0].expectedHours).toBe(2.5);
    expect(tasks[0].revenueBudget).toBe(600);
  });
});
