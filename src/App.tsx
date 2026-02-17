import { useMemo, useState } from 'react';
import { defaultSettings } from './lib/config';
import { exportInvoiceRadar, exportSchedule } from './lib/export';
import { loadFile } from './lib/parser';
import { buildSchedule } from './lib/scheduler';
import { ScheduleRow, Settings, Task } from './lib/types';

const tabs = ['Settings', 'Data', 'Candidates', 'Plan', 'Exports', 'Diagnostics'] as const;

export function App() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Data');
  const [settings, setSettings] = useState<Settings>(() => {
    const raw = localStorage.getItem('replanit.settings');
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [warning, setWarning] = useState('');
  const [missing, setMissing] = useState<string[]>([]);
  const [referenceDate, setReferenceDate] = useState(new Date().toISOString().slice(0, 10));

  const result = useMemo(() => buildSchedule(tasks, settings, new Date(referenceDate)), [tasks, settings, referenceDate]);

  const saveSettings = (next: Settings) => {
    setSettings(next);
    localStorage.setItem('replanit.settings', JSON.stringify(next));
  };

  return (
    <div className="mx-auto max-w-7xl p-6 text-sm text-slate-800">
      <h1 className="text-2xl font-bold">RePlanIt Production Scheduler</h1>
      <div className="my-4 flex gap-2">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded px-3 py-1 ${tab === t ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-3 gap-4">
        <div className="rounded bg-white p-3 shadow">Rows loaded: {tasks.length}</div>
        <div className="rounded bg-white p-3 shadow">Candidates: {result.candidates}</div>
        <div className="rounded bg-white p-3 shadow">Invoice radar total: £{result.invoiceRadar.reduce((a, t) => a + t.revenueBudget, 0).toFixed(2)}</div>
      </div>

      {warning && <div className="mb-3 rounded bg-amber-100 p-2">{warning}</div>}
      {result.overcapacityHours > 0 && <div className="mb-3 rounded bg-rose-100 p-2">Overcapacity: {result.overcapacityHours.toFixed(2)}h</div>}

      {tab === 'Data' && (
        <div className="space-y-3 rounded bg-white p-4 shadow">
          <input
            type="file"
            accept=".xlsx,.csv"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const parsed = await loadFile(file);
              setTasks(parsed.tasks);
              setWarning(parsed.warning ?? '');
              setMissing(parsed.missingFields);
            }}
          />
          <label className="block">Week Start Reference <input className="ml-2 border" type="date" value={referenceDate} onChange={(e) => setReferenceDate(e.target.value)} /></label>
        </div>
      )}

      {tab === 'Settings' && (
        <div className="space-y-2 rounded bg-white p-4 shadow">
          <label>Utilisation Cap <input className="ml-2 border" type="number" step="0.05" value={settings.utilisationCap} onChange={(e) => saveSettings({ ...settings, utilisationCap: Number(e.target.value) })} /></label>
          <label className="block">Applications Hours (Tue) <input className="ml-2 border" type="number" step="0.5" value={settings.applicationsHours} onChange={(e) => saveSettings({ ...settings, applicationsHours: Number(e.target.value) })} /></label>
          <button className="rounded border px-2 py-1" onClick={() => saveSettings(defaultSettings)}>Reset</button>
        </div>
      )}

      {tab === 'Candidates' && <pre className="max-h-96 overflow-auto rounded bg-white p-4 shadow">{JSON.stringify(tasks.slice(0, 80), null, 2)}</pre>}

      {tab === 'Plan' && (
        <div className="rounded bg-white p-4 shadow">
          <table className="w-full border-collapse">
            <thead><tr className="border-b"><th>Owner</th><th>Day</th><th>Start</th><th>End</th><th>Hours</th><th>Project #</th><th>Task</th><th>Note</th></tr></thead>
            <tbody>
              {result.schedule.map((r: ScheduleRow, i) => (
                <tr key={i} className="border-b"><td>{r.owner}</td><td>{r.day}</td><td>{r.start}</td><td>{r.end}</td><td>{r.hours.toFixed(2)}</td><td>{r.projectCode}</td><td>{r.task}</td><td>{r.note}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Exports' && (
        <div className="space-x-2 rounded bg-white p-4 shadow">
          <button className="rounded bg-emerald-600 px-3 py-1 text-white" onClick={() => exportSchedule(result.schedule)}>Export Schedule</button>
          <button className="rounded bg-indigo-600 px-3 py-1 text-white" onClick={() => exportInvoiceRadar(result.invoiceRadar)}>Export Invoice Radar</button>
        </div>
      )}

      {tab === 'Diagnostics' && (
        <div className="rounded bg-white p-4 shadow">
          <h2 className="font-semibold">Missing header mappings</h2>
          {missing.length ? <ul className="list-disc pl-6">{missing.map((m) => <li key={m}>{m}</li>)}</ul> : <div>All core mappings found.</div>}
        </div>
      )}
    </div>
  );
}
