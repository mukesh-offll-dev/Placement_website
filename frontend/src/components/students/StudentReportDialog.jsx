import { useMemo, useState } from 'react';
import { Download, X, Search } from 'lucide-react';
import { downloadBlob } from '../../utils/download';
import { toastSuccess } from '../../utils/toast';
import { placementLabel, placementBadgeClass } from '../../utils/placement';
import {
  EMPTY_FILTERS,
  REPORT_COLUMNS,
  buildStudentsCsv,
  filterStudents,
  summarizeStudents,
} from '../../utils/studentReport';

const PREVIEW_ROWS = 8;

const selectClass =
  'w-full border border-gray-300 px-3 py-2 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500';

/**
 * Placement report: choose the filters, see exactly who is included (a preview of the first rows
 * and the totals), then download the CSV. Starts from the filters the Students list is showing.
 */
export default function StudentReportDialog({ students, departments = [], initialFilters = EMPTY_FILTERS, onClose }) {
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, ...initialFilters });
  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  const rows = useMemo(() => filterStudents(students, filters), [students, filters]);
  const summary = useMemo(() => summarizeStudents(rows), [rows]);

  const download = () => {
    const blob = new Blob([buildStudentsCsv(rows)], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, `placement_report_${new Date().toISOString().slice(0, 10)}.csv`);
    toastSuccess(`Report downloaded (${rows.length} student${rows.length === 1 ? '' : 's'}).`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div>
            <h3 id="report-title" className="font-bold text-lg text-gray-900">Export placement report</h3>
            <p className="text-xs text-gray-500 mt-0.5">Pick who to include, check the preview, then download.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2 md:col-span-4 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                aria-label="Search students"
                placeholder="Search by name, register number or department"
                value={filters.search}
                onChange={set('search')}
                className="w-full border border-gray-300 pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <label className="text-xs font-semibold text-gray-600">
              Department
              <select value={filters.dept} onChange={set('dept')} className={`${selectClass} mt-1`}>
                <option value="All">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.code}>{d.code}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-gray-600">
              CGPA
              <select value={filters.cgpa} onChange={set('cgpa')} className={`${selectClass} mt-1`}>
                <option value="All">Any</option>
                <option value="9">9.0 and above</option>
                <option value="8">8.0 and above</option>
                <option value="7">7.0 and above</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-gray-600">
              Placement
              <select value={filters.placement} onChange={set('placement')} className={`${selectClass} mt-1`}>
                <option value="All">Placed and not placed</option>
                <option value="PLACED">Placed only</option>
                <option value="NOT_PLACED">Not placed only</option>
              </select>
            </label>
            <div className="flex items-end">
              <button type="button" onClick={() => setFilters({ ...EMPTY_FILTERS })} className="text-sm text-blue-600 hover:underline pb-2">
                Reset filters
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              ['In this report', summary.total, 'text-gray-900'],
              ['Placed', summary.placed, 'text-green-600'],
              ['Not placed', summary.notPlaced, 'text-gray-700'],
            ].map(([label, value, color]) => (
              <div key={label} className="bg-gray-50 rounded-xl py-3">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">
              Preview {rows.length > PREVIEW_ROWS ? `(first ${PREVIEW_ROWS} of ${rows.length})` : ''}
            </p>
            <div className="border border-gray-200 rounded-xl overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    {['Register No', 'Name', 'Department', 'CGPA', 'Placement', 'Company', 'CTC'].map((h) => (
                      <th key={h} className="text-left font-semibold px-3 py-2 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, PREVIEW_ROWS).map((s) => {
                    const cell = (key) => REPORT_COLUMNS.find((c) => c.key === key).value(s);
                    return (
                      <tr key={s.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 whitespace-nowrap">{cell('rollNo')}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">{cell('name')}</td>
                        <td className="px-3 py-2">{cell('dept')}</td>
                        <td className="px-3 py-2">{cell('cgpa') || '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${placementBadgeClass(s.status)}`}>{placementLabel(s.status)}</span>
                        </td>
                        <td className="px-3 py-2">{cell('company') || '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{cell('ctc') || '—'}</td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-gray-500">No students match these filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              The file also has email, semester, profile completion and the placement date.
            </p>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/60">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={download}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" /> Download CSV ({rows.length})
          </button>
        </div>
      </div>
    </div>
  );
}
