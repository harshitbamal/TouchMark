import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Download, FileSpreadsheet, Search } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

const PAGE_SIZE = 8;

const getStudentName = (record) => record.student?.name || record.studentName || 'Student';
const getRollNumber = (record) => record.student?.rollNumber || record.rollNumber || '';
const getClassName = (record) => record.class?.name || record.className || 'Class';
const getClassId = (record) => record.class?._id || record.class?.id || (typeof record.class === 'string' ? record.class : '');
const getDate = (record) => record.date || record.markedAt;
const displayDate = (value) => value ? new Date(value).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const displayTime = (value) => value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

function safeCell(value) {
  const text = String(value ?? '');
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function downloadFile(content, type, filename) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(value) {
  return safeCell(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

export function AttendanceReport({ attendance, classes }) {
  const [studentQuery, setStudentQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => attendance.filter((record) => {
    const query = studentQuery.trim().toLowerCase();
    const studentMatches = !query || `${getStudentName(record)} ${getRollNumber(record)}`.toLowerCase().includes(query);
    const classMatches = !classFilter || getClassId(record) === classFilter;
    const recordDate = getDate(record) ? new Date(getDate(record)) : null;
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999`) : null;
    const dateMatches = (!start || (recordDate && recordDate >= start)) && (!end || (recordDate && recordDate <= end));
    return studentMatches && classMatches && dateMatches;
  }), [attendance, studentQuery, classFilter, startDate, endDate]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const resetPage = (setter) => (event) => { setter(event.target.value); setPage(1); };
  const exportRows = () => filteredRows.map((record) => [
    getStudentName(record), getRollNumber(record), getClassName(record), displayDate(getDate(record)),
    displayTime(record.markedAt || getDate(record)), record.status, record.markedBy,
  ]);
  const headers = ['Student', 'Roll number', 'Class', 'Date', 'Time', 'Status', 'Marked by'];

  const exportCsv = () => {
    const rows = [headers, ...exportRows()];
    const csv = rows.map((row) => row.map((cell) => `"${safeCell(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    downloadFile(`\uFEFF${csv}`, 'text/csv;charset=utf-8', `touchmark-attendance-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportExcel = () => {
    const rows = [headers, ...exportRows()];
    const htmlRows = rows.map((row, index) => `<tr>${row.map((cell) => `<${index === 0 ? 'th' : 'td'}>${escapeHtml(cell)}</${index === 0 ? 'th' : 'td'}>`).join('')}</tr>`).join('');
    const workbook = `<!doctype html><html><head><meta charset="utf-8"></head><body><table>${htmlRows}</table></body></html>`;
    downloadFile(workbook, 'application/vnd.ms-excel;charset=utf-8', `touchmark-attendance-${new Date().toISOString().slice(0, 10)}.xls`);
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-slate-100 shadow-sm">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
        <div><h3 className="font-bold text-slate-900">Attendance report</h3><p className="mt-1 text-xs text-slate-400">Filter, review, and export attendance records.</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filteredRows.length} className="gap-2 rounded-xl"><Download size={14} />CSV</Button>
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={!filteredRows.length} className="gap-2 rounded-xl"><FileSpreadsheet size={14} />Excel</Button>
        </div>
      </div>

      <div className="grid gap-3 border-b border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="relative"><span className="sr-only">Search student</span><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={studentQuery} onChange={resetPage(setStudentQuery)} placeholder="Search student or roll no." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" /></label>
        <label><span className="sr-only">Filter by class</span><select value={classFilter} onChange={resetPage(setClassFilter)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-violet-400"><option value="">All classes</option>{classes.map((classItem) => <option key={classItem._id || classItem.id} value={classItem._id || classItem.id}>{classItem.name} ({classItem.code})</option>)}</select></label>
        <label><span className="sr-only">Start date</span><input aria-label="From date" type="date" value={startDate} onChange={resetPage(setStartDate)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-violet-400" /></label>
        <label><span className="sr-only">End date</span><input aria-label="To date" type="date" value={endDate} onChange={resetPage(setEndDate)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-violet-400" /></label>
      </div>

      <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead><tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400"><th className="px-5 py-3 sm:px-6">Student</th><th className="px-4 py-3">Class</th><th className="px-4 py-3">Date & time</th><th className="px-4 py-3">Marked by</th><th className="px-5 py-3 text-right sm:px-6">Status</th></tr></thead><tbody>
        {visibleRows.map((record, index) => <tr key={record._id || record.id || `${currentPage}-${index}`} className="border-t border-slate-50 text-sm"><td className="px-5 py-3.5 sm:px-6"><p className="font-semibold text-slate-800">{getStudentName(record)}</p><p className="text-[11px] text-slate-400">{getRollNumber(record) || '—'}</p></td><td className="px-4 py-3.5 text-slate-500">{getClassName(record)}</td><td className="px-4 py-3.5 text-slate-500">{displayDate(getDate(record))}<span className="block text-[11px] text-slate-400">{displayTime(record.markedAt || getDate(record))}</span></td><td className="px-4 py-3.5 capitalize text-slate-500">{record.markedBy || '—'}</td><td className="px-5 py-3.5 text-right sm:px-6"><Badge variant={record.status === 'present' ? 'success' : record.status === 'late' ? 'warning' : 'destructive'} className="rounded-full px-2.5 py-1 text-[10px]">{record.status || 'unknown'}</Badge></td></tr>)}
        {visibleRows.length === 0 && <tr><td colSpan="5" className="px-6 py-12 text-center"><p className="text-sm font-semibold text-slate-600">No matching attendance records</p><p className="mt-1 text-xs text-slate-400">Adjust the filters or start a session to add attendance.</p></td></tr>}
      </tbody></table></div>

      <div className="flex flex-col justify-between gap-3 border-t border-slate-100 px-5 py-3 sm:flex-row sm:items-center sm:px-6">
        <p className="text-xs text-slate-400">{filteredRows.length ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredRows.length)} of ${filteredRows.length}` : '0 records'}</p>
        <div className="flex items-center justify-between gap-3 sm:justify-end"><span className="text-xs text-slate-500">Page {currentPage} of {pageCount}</span><Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="gap-1 rounded-lg"><ArrowLeft size={14} />Previous</Button><Button variant="outline" size="sm" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="gap-1 rounded-lg">Next<ArrowRight size={14} /></Button></div>
      </div>
    </Card>
  );
}
