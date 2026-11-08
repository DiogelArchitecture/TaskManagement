import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { RawTask, Task } from './types';

const synonymMap: Record<keyof Omit<Task, 'priorityScore' | 'createdAt'>, string[]> = {
  taskName: ['task name', 'task', 'name'],
  owner: ['owner', 'assignee'],
  expectedHours: ['expected hours', 'suggested hours', 'est. hours', 'estimated hours'],
  revenueBudget: ['revenue budget', 'revenuebudget', 'budget'],
  linkedInvoice: ['linked invoice', 'invoice', 'invoice id'],
  dueDate: ['due date', 'suggested due date', 'target date'],
  designReview: ['design review', 'dr', 'designreview'],
  gtky: ['getting to know you session', 'gtky', 'intro call'],
  customStatus: ['custom status', 'status'],
  tags: ['tags', 'label'],
  projectCode: ['project number', 'project no', 'project code', 'project id', 'record id', 'job no', 'job number', 'deal id', 'opportunity id'],
  projectName: ['project name', 'project', 'job name', 'project title', 'opportunity', 'opportunity name', 'deal', 'deal name'],
  clientName: ['client name', 'client', 'account', 'customer', 'contact name', 'contact', 'lead name'],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function parseMoney(v: unknown): number {
  if (v == null) return 0;
  const cleaned = String(v).replace(/[^\d.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function parseHours(v: unknown): number {
  if (v == null || v === '') return 0;
  const s = String(v).trim().toLowerCase();
  const hm = s.match(/^(\d+):(\d{1,2})$/);
  if (hm) return Number(hm[1]) + Number(hm[2]) / 60;
  const stripped = s.replace(/hours?|hrs?/g, '').trim();
  const n = Number(stripped);
  return Number.isFinite(n) ? n : 0;
}

export function parseUkDate(v: unknown): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  const s = String(v).trim();
  const match = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (match) {
    const [, dd, mm, yyyy, h = '00', m = '00'] = match;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(h), Number(m));
  }
  const d = new Date(s);
  return Number.isNaN(d.valueOf()) ? undefined : d;
}

function matchKey(headers: string[], aliases: string[]): string | undefined {
  const aliasSet = new Set(aliases.map(norm));
  return headers.find((h) => aliasSet.has(norm(h)));
}

function deriveProjectCode(row: Record<string, unknown>, taskName: string): string {
  const invoice = String(row['Linked Invoice'] ?? row['Invoice'] ?? '');
  const direct = /\d{3,}/.exec(invoice)?.[0];
  if (direct) return direct;
  const fromTask = /\d{3,}/.exec(taskName)?.[0];
  return fromTask ?? 'UNKNOWN';
}

export function normaliseRows(rows: RawTask[]): { tasks: Task[]; missingFields: string[] } {
  if (!rows.length) return { tasks: [], missingFields: [] };
  const headers = Object.keys(rows[0]);
  const keyMap = Object.fromEntries(
    Object.entries(synonymMap).map(([field, aliases]) => [field, matchKey(headers, aliases)]),
  ) as Record<string, string | undefined>;
  const missingFields = Object.entries(keyMap).filter(([, v]) => !v).map(([k]) => k);

  const tasks = rows.map((r) => {
    const taskName = String(r[keyMap.taskName ?? ''] ?? '').trim();
    const projectCode = String(r[keyMap.projectCode ?? ''] ?? '').trim() || deriveProjectCode(r, taskName);
    return {
      taskName,
      owner: String(r[keyMap.owner ?? ''] ?? '').trim() || undefined,
      expectedHours: parseHours(r[keyMap.expectedHours ?? '']),
      revenueBudget: parseMoney(r[keyMap.revenueBudget ?? '']),
      linkedInvoice: String(r[keyMap.linkedInvoice ?? ''] ?? '').trim() || undefined,
      dueDate: parseUkDate(r[keyMap.dueDate ?? '']),
      designReview: parseUkDate(r[keyMap.designReview ?? '']),
      gtky: parseUkDate(r[keyMap.gtky ?? '']),
      customStatus: String(r[keyMap.customStatus ?? ''] ?? '').trim() || undefined,
      tags: String(r[keyMap.tags ?? ''] ?? '').trim() || undefined,
      projectCode,
      projectName: String(r[keyMap.projectName ?? ''] ?? '').trim() || 'Unknown Project',
      clientName: String(r[keyMap.clientName ?? ''] ?? '').trim() || undefined,
      priorityScore: Number(r['Priority Score'] ?? 1) || 1,
      createdAt: parseUkDate(r['Created At']),
    } as Task;
  });
  return { tasks, missingFields };
}

function pickSheet(workbook: XLSX.WorkBook) {
  const best = workbook.SheetNames.find((n) => /all\s*projects/i.test(n));
  return workbook.Sheets[best ?? workbook.SheetNames[0]];
}

export async function loadFile(file: File): Promise<{ tasks: Task[]; warning?: string; missingFields: string[] }> {
  const buffer = await file.arrayBuffer();
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const rows = XLSX.utils.sheet_to_json<RawTask>(pickSheet(workbook), { defval: '' });
    const { tasks, missingFields } = normaliseRows(rows);
    return { tasks, missingFields };
  } catch {
    const text = new TextDecoder().decode(buffer);
    const parsed = Papa.parse<RawTask>(text, { header: true, skipEmptyLines: true });
    const { tasks, missingFields } = normaliseRows(parsed.data);
    return { tasks, missingFields, warning: 'XLSX decode failed; parsed as CSV fallback.' };
  }
}
