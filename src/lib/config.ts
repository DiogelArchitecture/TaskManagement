import { Settings } from './types';

export const defaultSettings: Settings = {
  activeDays: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true },
  utilisationCap: 0.9,
  huddleEnabled: true,
  huddleStart: '09:30',
  huddleHours: 0.5,
  applicationsHours: 2,
  serviceHours: 0.5,
  existingHours: 2.5,
  drHours: 1.5,
  postDrHours: 0.5,
  gtkyHours: 0.5,
  chunkMin: 0.5,
  chunkMax: 3,
  weights: { valuePerHour: 0.4, tti: 0.3, priority: 0.2, age: 0.1 },
  people: [
    { name: 'May', weeklyHours: 30, startHour: '09:00', dayCap: 7.5 },
    { name: 'Barbora', weeklyHours: 30, startHour: '09:00', dayCap: 7.5 },
  ],
};
