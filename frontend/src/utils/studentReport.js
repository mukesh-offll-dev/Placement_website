import { isPlaced, placementLabel, formatCtc } from './placement.js';

/** Columns of the placement report, in order. `value` reads one row of the Students list. */
export const REPORT_COLUMNS = [
  { key: 'rollNo', label: 'Register No', value: (s) => s.rollNo || '' },
  { key: 'name', label: 'Name', value: (s) => s.name || '' },
  { key: 'dept', label: 'Department', value: (s) => s.dept || '' },
  { key: 'cgpa', label: 'CGPA', value: (s) => (s.cgpa > 0 ? s.cgpa : '') },
  { key: 'sem', label: 'Semester', value: (s) => (s.sem && s.sem !== 'N/A' ? s.sem : '') },
  { key: 'email', label: 'Email', value: (s) => s.email || '' },
  { key: 'profile', label: 'Profile %', value: (s) => (Number.isFinite(s.profile) ? s.profile : '') },
  { key: 'placement', label: 'Placement', value: (s) => placementLabel(s.status) },
  { key: 'company', label: 'Company', value: (s) => (isPlaced(s.status) ? s.placedCompany || '' : '') },
  { key: 'ctc', label: 'CTC', value: (s) => (isPlaced(s.status) ? formatCtc(s.placedCtc) || '' : '') },
  { key: 'placedOn', label: 'Placed on', value: (s) => (isPlaced(s.status) ? s.placedOn || '' : '') },
];

export const EMPTY_FILTERS = Object.freeze({ search: '', dept: 'All', cgpa: 'All', placement: 'All' });

/**
 * The one place the Students list and the report decide who matches.
 * placement: 'All' | 'PLACED' | 'NOT_PLACED'; cgpa: 'All' or a minimum such as '8'.
 */
export function filterStudents(students, filters = EMPTY_FILTERS) {
  const f = { ...EMPTY_FILTERS, ...filters };
  const q = String(f.search || '').trim().toLowerCase();
  return (Array.isArray(students) ? students : []).filter((s) => {
    const matchSearch =
      !q ||
      String(s.name || '').toLowerCase().includes(q) ||
      String(s.dept || '').toLowerCase().includes(q) ||
      String(s.rollNo || '').toLowerCase().includes(q);
    const matchDept = f.dept === 'All' || String(s.dept || '').toLowerCase() === String(f.dept).toLowerCase();
    const matchCgpa = f.cgpa === 'All' || (Number(s.cgpa) || 0) >= parseFloat(f.cgpa);
    const matchPlacement = f.placement === 'All' || (f.placement === 'PLACED') === isPlaced(s.status);
    return matchSearch && matchDept && matchCgpa && matchPlacement;
  });
}

/** How many students are Registered / Placed / Not placed within a set of rows. */
export function summarizeStudents(students) {
  const list = Array.isArray(students) ? students : [];
  const placed = list.filter((s) => isPlaced(s.status)).length;
  return { total: list.length, placed, notPlaced: list.length - placed };
}

/**
 * A cell that starts with = + - @ (or a tab / carriage return) is read as a formula by Excel and
 * Sheets; a leading apostrophe turns it into plain text.
 */
export function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV text (with a BOM so Excel reads UTF-8) for the given rows. */
export function buildStudentsCsv(students, columns = REPORT_COLUMNS) {
  const lines = [columns.map((c) => csvCell(c.label)).join(',')];
  for (const s of students) {
    lines.push(columns.map((c) => csvCell(c.value(s))).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
