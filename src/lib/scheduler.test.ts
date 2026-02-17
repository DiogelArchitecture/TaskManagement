import { describe, expect, it } from 'vitest';
import { defaultSettings } from './config';
import { buildSchedule } from './scheduler';
import { Task } from './types';

const baseTask: Task = {
  taskName: 'Project DR',
  expectedHours: 3,
  revenueBudget: 1000,
  projectCode: '1543',
  projectName: 'Alpha',
  priorityScore: 1,
};

describe('scheduler', () => {
  it('creates DR and post DR at exact times', () => {
    const dr = new Date('2025-08-27T10:30:00');
    const { schedule } = buildSchedule([{ ...baseTask, designReview: dr }], defaultSettings, new Date('2025-08-25'));
    expect(schedule.some((r) => r.owner === 'Barbora' && r.start === '10:30' && r.note === 'Design review')).toBe(true);
    expect(schedule.some((r) => r.owner === 'Barbora' && r.start === '12:00' && r.note === 'Post-DR amendments')).toBe(true);
  });

  it('includes service and applications blocks', () => {
    const { schedule } = buildSchedule([], defaultSettings, new Date('2025-08-25'));
    expect(schedule.some((r) => r.owner === 'May' && r.day === 'Tue' && r.note === 'Applications admin')).toBe(true);
    expect(schedule.some((r) => r.owner === 'May' && r.day === 'Wed' && r.note === 'Service delivery')).toBe(true);
  });

  it('invoice radar includes dr with revenue only', () => {
    const dr = new Date('2025-08-27T10:30:00');
    const { invoiceRadar } = buildSchedule([
      { ...baseTask, designReview: dr, revenueBudget: 100 },
      { ...baseTask, designReview: dr, revenueBudget: 0, projectCode: '2000' },
    ], defaultSettings, new Date('2025-08-25'));
    expect(invoiceRadar).toHaveLength(1);
  });
});
