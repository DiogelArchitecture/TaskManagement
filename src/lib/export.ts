import * as XLSX from 'xlsx';
import { ScheduleRow, Task } from './types';

export function exportSchedule(rows: ScheduleRow[]) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({ Owner: r.owner, Day: r.day, Start: r.start, End: r.end, Hours: r.hours, ProjectCode: r.projectCode, Project: r.project, Task: r.task, Note: r.note, Revenue: r.revenue })));
  XLSX.utils.book_append_sheet(wb, ws, 'Weekly Schedule');
  XLSX.writeFile(wb, 'weekly_schedule.xlsx');
}

export function exportInvoiceRadar(tasks: Task[]) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(tasks.map((t) => ({ ProjectCode: t.projectCode, Project: t.projectName, Task: t.taskName, LinkedInvoice: t.linkedInvoice ?? '', DesignReview: t.designReview?.toISOString() ?? '', RevenueBudget: t.revenueBudget })));
  XLSX.utils.book_append_sheet(wb, ws, 'Invoice Radar');
  XLSX.writeFile(wb, 'invoice_radar.xlsx');
}
