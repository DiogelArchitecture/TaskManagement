import { Settings, Task, ScheduleRow, Weekday } from './types';

const weekdays: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const dayIdx: Record<Weekday, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5 };

const hmToHour = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return h + m / 60;
};
const hourToHm = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

const sameWeekday = (d: Date, wd: Weekday) => d.getDay() === dayIdx[wd];

function weekStart(ref: Date) {
  const d = new Date(ref);
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  d.setHours(0, 0, 0, 0);
  return d;
}

function inWeek(d: Date | undefined, start: Date) {
  if (!d) return false;
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return d >= start && d < end;
}

function tti(task: Task, week: Date): number {
  if (!task.designReview) return 0;
  const days = (task.designReview.getTime() - week.getTime()) / 86400000;
  if (days <= 3) return 2;
  if (days <= 7) return 1;
  return 0;
}

function routeOwner(task: Task): string {
  const signal = `${task.tags ?? ''} ${task.customStatus ?? ''} ${task.taskName}`.toLowerCase();
  if (/bc|validation|builder|client|quote|amend|application/.test(signal)) return 'May';
  if (/design|dr/.test(signal)) return 'Barbora';
  return task.owner || 'May';
}

export function buildSchedule(tasks: Task[], settings: Settings, referenceDate = new Date()): { schedule: ScheduleRow[]; overcapacityHours: number; candidates: number; invoiceRadar: Task[] } {
  const start = weekStart(referenceDate);
  const activeDays = weekdays.filter((d) => settings.activeDays[d]);
  const caps = Object.fromEntries(settings.people.map((p) => [p.name, Object.fromEntries(activeDays.map((d) => [d, Math.min(p.dayCap, (p.weeklyHours / activeDays.length) * settings.utilisationCap)]))]));
  const used = Object.fromEntries(settings.people.map((p) => [p.name, Object.fromEntries(activeDays.map((d) => [d, 0]))]));
  const cursor = Object.fromEntries(settings.people.map((p) => [p.name, Object.fromEntries(activeDays.map((d) => [d, hmToHour(p.startHour)]))]));

  const schedule: ScheduleRow[] = [];
  const add = (owner: string, day: Weekday, startHour: number, hours: number, task: Task, note: string) => {
    const startHm = hourToHm(startHour);
    schedule.push({ owner, day, start: startHm, end: hourToHm(startHour + hours), hours, projectCode: task.projectCode, project: task.projectName, task: `[${task.projectCode}] ${task.projectName} — ${task.taskName}`, note, revenue: task.revenueBudget });
    used[owner][day] += hours;
    cursor[owner][day] = Math.max(cursor[owner][day], startHour + hours);
  };
  const emptyTask: Task = { taskName: 'Protected block', expectedHours: 0, revenueBudget: 0, projectCode: '-', projectName: '-', priorityScore: 0 };

  for (const d of activeDays) {
    if (settings.huddleEnabled) {
      for (const p of settings.people) add(p.name, d, hmToHour(settings.huddleStart), settings.huddleHours, emptyTask, 'Morning huddle');
    }
  }
  if (settings.activeDays.Tue && settings.applicationsHours > 0) add('May', 'Tue', 10, settings.applicationsHours, emptyTask, 'Applications admin');
  for (const d of (['Wed', 'Thu', 'Fri'] as Weekday[])) {
    if (settings.activeDays[d] && settings.serviceHours > 0) {
      for (const p of settings.people) add(p.name, d, cursor[p.name][d], settings.serviceHours, emptyTask, 'Service delivery');
    }
  }

  const candidates = tasks.filter((t) => inWeek(t.designReview, start) || inWeek(t.dueDate, start));
  const invoiceRadar = candidates.filter((t) => inWeek(t.designReview, start) && t.revenueBudget > 0);

  for (const t of candidates.filter((x) => inWeek(x.designReview, start) && x.designReview)) {
    const day = weekdays.find((d) => sameWeekday(t.designReview!, d) && settings.activeDays[d]);
    if (!day) continue;
    const drStart = t.designReview!.getHours() + t.designReview!.getMinutes() / 60;
    add('Barbora', day, drStart, settings.drHours, t, 'Design review');
    add('Barbora', day, drStart + settings.drHours, settings.postDrHours, t, 'Post-DR amendments');
    const priorDays = activeDays.filter((d) => weekdays.indexOf(d) < weekdays.indexOf(day));
    const preDay = [...priorDays].reverse().find((d) => used.May[d] + settings.existingHours <= caps.May[d]);
    if (preDay) add('May', preDay, cursor.May[preDay], settings.existingHours, t, 'Existing production pre-DR');
  }

  for (const t of candidates.filter((x) => inWeek(x.gtky, start) && x.gtky)) {
    const day = weekdays.find((d) => sameWeekday(t.gtky!, d) && settings.activeDays[d]);
    if (!day) continue;
    const st = t.gtky!.getHours() + t.gtky!.getMinutes() / 60;
    add('May', day, st, settings.gtkyHours, t, 'GTKY session');
  }

  const scored = candidates
    .filter((t) => !inWeek(t.designReview, start))
    .map((t) => {
      const valuePerHour = t.expectedHours > 0 ? t.revenueBudget / t.expectedHours : 0;
      const age = t.createdAt ? Math.max(0, (referenceDate.getTime() - t.createdAt.getTime()) / 86400000) : 0;
      const score = settings.weights.valuePerHour * valuePerHour + settings.weights.tti * tti(t, start) + settings.weights.priority * t.priorityScore + settings.weights.age * age;
      return { t, score };
    })
    .sort((a, b) => b.score - a.score || (a.t.dueDate?.getTime() ?? Infinity) - (b.t.dueDate?.getTime() ?? Infinity));

  let remainingUnscheduled = 0;
  for (const { t } of scored) {
    let remain = t.expectedHours || settings.chunkMin;
    const owner = routeOwner(t);
    for (const d of activeDays) {
      while (remain > 0 && used[owner][d] + settings.chunkMin <= caps[owner][d]) {
        const chunk = Math.min(remain, settings.chunkMax, caps[owner][d] - used[owner][d]);
        if (chunk < settings.chunkMin) break;
        add(owner, d, cursor[owner][d], chunk, t, 'Greedy fill');
        remain -= chunk;
      }
    }
    remainingUnscheduled += Math.max(0, remain);
  }

  return { schedule: schedule.sort((a, b) => a.owner.localeCompare(b.owner) || weekdays.indexOf(a.day) - weekdays.indexOf(b.day) || a.start.localeCompare(b.start)), overcapacityHours: remainingUnscheduled, candidates: candidates.length, invoiceRadar };
}
