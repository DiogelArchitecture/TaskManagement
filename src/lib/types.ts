export type Weekday = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';

export interface RawTask {
  [k: string]: unknown;
}

export interface Task {
  taskName: string;
  owner?: string;
  expectedHours: number;
  revenueBudget: number;
  linkedInvoice?: string;
  dueDate?: Date;
  designReview?: Date;
  gtky?: Date;
  customStatus?: string;
  tags?: string;
  projectCode: string;
  projectName: string;
  clientName?: string;
  priorityScore: number;
  createdAt?: Date;
}

export interface PersonConfig {
  name: string;
  weeklyHours: number;
  startHour: string;
  dayCap: number;
}

export interface Settings {
  activeDays: Record<Weekday, boolean>;
  utilisationCap: number;
  huddleEnabled: boolean;
  huddleStart: string;
  huddleHours: number;
  applicationsHours: number;
  serviceHours: number;
  existingHours: number;
  drHours: number;
  postDrHours: number;
  gtkyHours: number;
  chunkMin: number;
  chunkMax: number;
  weights: { valuePerHour: number; tti: number; priority: number; age: number };
  people: PersonConfig[];
}

export interface ScheduleRow {
  owner: string;
  day: Weekday;
  start: string;
  end: string;
  hours: number;
  projectCode: string;
  project: string;
  task: string;
  note: string;
  revenue: number;
}
