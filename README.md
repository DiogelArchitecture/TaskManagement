# RePlanIt Production Scheduler

Single-page React + TypeScript app for ingesting weekly task exports, scoring candidates, auto-scheduling work across May and Barbora, and exporting Weekly Schedule + Invoice Radar spreadsheets.

## Tabs
- **Settings**: utilisation and protected block controls (saved to LocalStorage).
- **Data**: upload `.xlsx` / `.csv` and set week reference.
- **Candidates**: inspect normalised tasks.
- **Plan**: day/person scheduled rows.
- **Exports**: download `.xlsx` schedule and invoice radar.
- **Diagnostics**: missing header mappings.

## Header mapping
Mapping is case/space/punctuation-insensitive and includes synonyms from the brief (`Task Name`, `Owner`, `Expected Hours`, `Revenue Budget`, `Linked Invoice`, `Due Date`, `Design Review`, `Getting to Know You Session`, `Custom Status`, `Tags`, `Project Number`, `Project Name`, `Client Name`).

## Parsing/troubleshooting
- If XLSX parsing fails, app automatically retries as CSV and shows a warning banner.
- UK date parsing supports `dd/MM/yyyy` and `dd/MM/yyyy HH:mm`.
- Hours parsing supports `H:MM`, decimal hours, and `Hrs/Hours` suffixes.
- Project code is derived from explicit code, linked invoice digits, or task-name digit run fallback.

## Determinism
Given identical inputs and settings, the scheduler is deterministic and emits identical row ordering.

## Dev
```bash
npm install
npm run dev
npm run test
npm run build
```
