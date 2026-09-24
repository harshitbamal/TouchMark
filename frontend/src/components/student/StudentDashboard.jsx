import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { UserProfileMenu } from '../profile/UserProfileMenu';
import { studentService, attendanceService, classService } from '../../services/api';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Progress } from '../ui/Progress';
import {
  AlertTriangle, ArrowRight, BookOpen, CalendarDays, CheckCircle2, Clock,
  Download, Fingerprint, LayoutDashboard, Menu, RefreshCw, Search, TrendingUp,
  UserPlus, X, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'classes', label: 'My classes', icon: BookOpen },
  { id: 'attendance', label: 'Attendance history', icon: CalendarDays },
];
const idOf = (item) => item?._id || item?.id || item;
const statusStyle = (status) => status === 'present' ? 'success' : status === 'late' ? 'warning' : 'destructive';
const formatDate = (value) => value ? new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const formatTime = (value) => value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

export function StudentDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [allClasses, setAllClasses] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enrollingClass, setEnrollingClass] = useState(null);
  const [activeView, setActiveView] = useState('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const fetchData = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      const profileResult = await studentService.getMyProfile();
      const studentProfile = profileResult.student || profileResult;
      setProfile(studentProfile);
      const studentId = idOf(studentProfile);
      const [classResult, attendanceResult, statsResult] = await Promise.allSettled([
        classService.getAll(),
        studentService.getAttendance(studentId, { limit: 100 }),
        attendanceService.getStats({ studentId }),
      ]);
      if (classResult.status === 'fulfilled') setAllClasses(classResult.value.classes || []);
      if (attendanceResult.status === 'fulfilled') setAttendance(attendanceResult.value.attendance || []);
      if (statsResult.status === 'fulfilled') setStats(statsResult.value.stats || { total: 0, present: 0, absent: 0, percentage: 0 });
      if ([classResult, attendanceResult, statsResult].some((result) => result.status === 'rejected')) {
        toast.error('Some dashboard information could not be refreshed');
      }
    } catch (error) {
      console.error('Error fetching student dashboard:', error);
      toast.error('Failed to load your dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const enrolledIds = useMemo(() => new Set((profile?.classes || []).map(idOf).map(String)), [profile]);
  const enrolledClasses = useMemo(() => allClasses.filter((item) => enrolledIds.has(String(idOf(item)))), [allClasses, enrolledIds]);
  const visibleClasses = useMemo(() => allClasses.filter((item) => {
    const itemStatus = item.enrollmentStatus || (enrolledIds.has(String(idOf(item))) ? 'enrolled' : 'available');
    const matchesEnrollment = classFilter === 'all' || itemStatus === classFilter;
    const searchable = `${item.name || ''} ${item.code || ''} ${item.subject || ''} ${item.teacher?.name || item.teacher || ''}`.toLowerCase();
    return matchesEnrollment && searchable.includes(query.toLowerCase());
  }), [allClasses, classFilter, enrolledIds, query]);
  const filteredAttendance = useMemo(() => attendance.filter((row) => {
    const matchesClass = classFilter === 'all' || String(idOf(row.class)) === classFilter;
    const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
    const matchesDate = !dateFilter || new Date(row.date).toISOString().slice(0, 10) === dateFilter;
    return matchesClass && matchesStatus && matchesDate;
  }), [attendance, classFilter, statusFilter, dateFilter]);

  const handleEnroll = async (classId) => {
    if (!profile) return;
    setEnrollingClass(classId);
    try {
      await classService.requestEnrollment(classId);
      toast.success('Enrollment request sent for approval');
      await fetchData(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not submit enrollment request');
    } finally { setEnrollingClass(null); }
  };

  const exportAttendance = () => {
    const rows = [['Date', 'Class', 'Status', 'Marked at'], ...filteredAttendance.map((row) => [
      formatDate(row.date), row.class?.name || 'Class', row.status, formatTime(row.markedAt),
    ])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'my-attendance.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="dashboard-shell flex min-h-screen items-center justify-center bg-[#f7f8fc]"><div className="text-center"><div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-100 border-t-violet-600" /><p className="text-sm text-slate-500">Loading your workspace…</p></div></div>;

  const title = navItems.find((item) => item.id === activeView)?.label || 'Overview';
  const attendancePercent = Math.max(0, Math.min(100, Number(stats.percentage) || 0));

  return (
    <div className="dashboard-shell flex bg-[#f7f8fc]">
      {menuOpen && <button aria-label="Close navigation" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30 bg-slate-950/30 md:hidden" />}
      <aside className={`dashboard-sidebar fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white px-5 py-6 transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-1"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-200"><Fingerprint size={22} /></div><div><p className="text-[17px] font-extrabold tracking-tight text-slate-900">TouchMark</p><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">Student workspace</p></div></div>
        <p className="mb-3 mt-10 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Workspace</p>
        <nav className="space-y-1" aria-label="Student navigation">{navItems.map(({ id, label, icon }) => <button key={id} onClick={() => { setActiveView(id); setMenuOpen(false); }} className={`dashboard-nav-link flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${activeView === id ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>{createElement(icon, { size: 18, strokeWidth: 1.9 })}{label}{id === 'classes' && <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">{enrolledClasses.length}</span>}</button>)}</nav>
        <div className="mt-auto border-t border-slate-100 pt-5"><UserProfileMenu placement="top" /></div>
      </aside>

      <main className="dashboard-content min-h-screen flex-1 px-4 py-5 sm:px-7 lg:px-10 lg:py-8">
        <header className="mb-8 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><button className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 md:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={19} /></button><div><p className="text-xs font-semibold text-slate-400">Student portal / <span className="text-violet-600">{title}</span></p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">{activeView === 'overview' ? `Welcome back, ${(profile?.name || user?.name || 'Student').split(' ')[0]}` : title}</h1></div></div><div className="flex items-center gap-2 sm:gap-3"><span className="hidden text-xs text-slate-400 sm:inline">{new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span><Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing} className="gap-2 rounded-xl border-slate-200 bg-white text-slate-600"><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /><span className="hidden sm:inline">Refresh</span></Button></div></header>

        {activeView === 'overview' && <>
          <section className="mb-7 rounded-2xl bg-gradient-to-r from-violet-700 via-violet-600 to-indigo-600 p-6 text-white shadow-xl shadow-violet-200/60 sm:p-8"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold"><CalendarDays size={14} />{new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div><h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Your learning, at a glance</h2><p className="mt-2 max-w-lg text-sm text-violet-100">Track attendance, keep up with your classes, and check your enrollment status.</p></div><Button onClick={() => setActiveView('attendance')} className="h-11 gap-2 self-start rounded-xl bg-white px-5 font-bold text-violet-700 shadow-sm hover:bg-violet-50 sm:self-center">View attendance<ArrowRight size={16} /></Button></div></section>

          {!profile?.isFingerprintRegistered && <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={20} /><div><p className="font-bold">Fingerprint registration needed</p><p className="mt-1 text-sm text-amber-800">Ask an administrator to register your fingerprint so you can check in at class.</p></div></div>}

          <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Attendance summary">{[
            { label: 'Enrolled classes', value: enrolledClasses.length, detail: 'Your current classes', icon: BookOpen, tone: 'violet' },
            { label: 'Present', value: stats.present || 0, detail: 'Classes attended', icon: CheckCircle2, tone: 'emerald' },
            { label: 'Absent', value: stats.absent || 0, detail: 'Classes missed', icon: XCircle, tone: 'rose' },
            { label: 'Attendance rate', value: `${attendancePercent.toFixed(1)}%`, detail: `${stats.total || 0} records tracked`, icon: TrendingUp, tone: 'blue' },
          ].map(({ label, value, detail, icon, tone }) => <Card key={label} className="dashboard-card rounded-2xl border-slate-100 shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p></div><div className={`rounded-xl p-2.5 ${tone === 'violet' ? 'bg-violet-50 text-violet-600' : tone === 'emerald' ? 'bg-emerald-50 text-emerald-600' : tone === 'rose' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>{createElement(icon, { size: 19 })}</div></div><p className="mt-1 text-xs text-slate-400">{detail}</p>{label === 'Attendance rate' && <Progress value={attendancePercent} className="mt-3 h-2" />}</CardContent></Card>)}</section>

          <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]"><Card className="rounded-2xl border-slate-100 shadow-sm"><CardContent className="p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Recent attendance</h3><p className="mt-1 text-xs text-slate-400">Your latest class check-ins</p></div><button onClick={() => setActiveView('attendance')} className="inline-flex items-center gap-1 text-xs font-bold text-violet-600">Full history<ArrowRight size={14} /></button></div>{attendance.slice(0, 5).length ? <div className="space-y-2">{attendance.slice(0, 5).map((row) => <div key={idOf(row)} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"><div className="flex min-w-0 items-center gap-3"><span className={`rounded-lg p-2 ${row.status === 'present' ? 'bg-emerald-50 text-emerald-600' : row.status === 'late' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>{row.status === 'present' ? <CheckCircle2 size={16} /> : row.status === 'late' ? <Clock size={16} /> : <XCircle size={16} />}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-700">{row.class?.name || 'Class attendance'}</p><p className="text-xs text-slate-400">{formatDate(row.date)}{row.markedAt ? ` · ${formatTime(row.markedAt)}` : ''}</p></div></div><Badge variant={statusStyle(row.status)}>{row.status}</Badge></div>)}</div> : <div className="rounded-xl bg-slate-50 py-10 text-center text-sm text-slate-400"><CalendarDays className="mx-auto mb-2 opacity-40" />No attendance records yet</div>}</CardContent></Card>
            <div className="space-y-6"><Card className="rounded-2xl border-slate-100 shadow-sm"><CardContent className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-900">My classes</h3><p className="mt-1 text-xs text-slate-400">{enrolledClasses.length} enrolled</p></div><BookOpen className="text-violet-500" size={19} /></div>{enrolledClasses.length ? <div className="mt-4 space-y-2">{enrolledClasses.slice(0, 4).map((item) => <div key={idOf(item)} className="rounded-xl bg-slate-50 px-3 py-2.5"><p className="text-sm font-semibold text-slate-700">{item.name}</p><p className="text-xs text-slate-400">{item.code} {item.subject ? `· ${item.subject}` : ''}</p></div>)}</div> : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No classes yet. Browse the catalog to find classes.</p>}<Button onClick={() => setActiveView('classes')} variant="outline" className="mt-4 w-full gap-2 rounded-xl">Browse classes<ArrowRight size={15} /></Button></CardContent></Card>
              <Card className="rounded-2xl border-slate-100 shadow-sm"><CardContent className="p-5 sm:p-6"><div className="flex items-center gap-3"><div className={`rounded-xl p-2.5 ${profile?.isFingerprintRegistered ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}><Fingerprint size={19} /></div><div><h3 className="font-bold text-slate-900">Fingerprint status</h3><p className="text-xs text-slate-400">Used for attendance check-in</p></div></div><p className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${profile?.isFingerprintRegistered ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{profile?.isFingerprintRegistered ? `Registered${profile.fingerprintId ? ` · ID ${profile.fingerprintId}` : ''}` : 'Not registered yet'}</p></CardContent></Card></div></section>
        </>}

        {activeView === 'classes' && <section><div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold text-slate-900">Class catalog</h2><p className="text-sm text-slate-500">Browse courses and send enrollment requests for staff approval.</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search classes" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-violet-400 sm:w-56" /></label><select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600"><option value="all">All classes</option><option value="enrolled">Enrolled</option><option value="pending">Pending approval</option><option value="available">Available to request</option></select></div></div>{visibleClasses.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleClasses.map((item) => { const enrolled = item.enrollmentStatus === 'enrolled' || enrolledIds.has(String(idOf(item))); const pending = item.enrollmentStatus === 'pending'; return <Card key={idOf(item)} className="dashboard-card rounded-2xl border-slate-100 shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-lg font-bold text-slate-900">{item.name}</p><p className="mt-1 text-xs font-semibold text-violet-600">{item.code}</p></div><span className="rounded-xl bg-violet-50 p-2.5 text-violet-600"><BookOpen size={18} /></span></div><p className="mt-4 text-sm text-slate-600">{item.subject || 'Course'}</p><p className="mt-1 text-xs text-slate-400">Instructor: {item.teacher?.name || item.teacher || 'To be announced'}</p><div className="mt-4 border-t border-slate-100 pt-4">{enrolled ? <Badge variant="success" className="w-full justify-center py-2"><CheckCircle2 size={14} className="mr-2" />Enrolled</Badge> : pending ? <Badge variant="warning" className="w-full justify-center py-2">Request pending approval</Badge> : <Button onClick={() => handleEnroll(idOf(item))} disabled={!!enrollingClass} className="w-full gap-2 rounded-xl" size="sm"><UserPlus size={15} />{enrollingClass === idOf(item) ? 'Requesting…' : 'Request enrollment'}</Button>}</div></CardContent></Card>; })}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center"><BookOpen className="mx-auto mb-3 text-slate-300" size={34} /><p className="font-semibold text-slate-700">No matching classes</p><p className="mt-1 text-sm text-slate-400">Try another search or filter.</p></div>}</section>}

        {activeView === 'attendance' && <section><div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-bold text-slate-900">Attendance history</h2><p className="text-sm text-slate-500">Filter your records and download a personal CSV report.</p></div><Button onClick={exportAttendance} variant="outline" className="gap-2 rounded-xl border-slate-200 bg-white"><Download size={15} />Export CSV</Button></div><Card className="mb-4 rounded-2xl border-slate-100 shadow-sm"><CardContent className="grid gap-3 p-4 sm:grid-cols-3"><label className="text-xs font-semibold text-slate-500">Class<select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="mt-1 block h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700"><option value="all">All classes</option>{allClasses.map((item) => <option key={idOf(item)} value={idOf(item)}>{item.name}</option>)}</select></label><label className="text-xs font-semibold text-slate-500">Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="mt-1 block h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700"><option value="all">All statuses</option><option value="present">Present</option><option value="late">Late</option><option value="absent">Absent</option></select></label><label className="text-xs font-semibold text-slate-500">Date<input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="mt-1 block h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700" /></label></CardContent></Card><Card className="overflow-hidden rounded-2xl border-slate-100 shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Class</th><th className="px-5 py-3">Time</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredAttendance.map((row) => <tr key={idOf(row)} className="hover:bg-slate-50/70"><td className="px-5 py-4 text-slate-600">{formatDate(row.date)}</td><td className="px-5 py-4 font-semibold text-slate-700">{row.class?.name || 'Class attendance'}</td><td className="px-5 py-4 text-slate-500">{formatTime(row.markedAt) || '—'}</td><td className="px-5 py-4"><Badge variant={statusStyle(row.status)}>{row.status}</Badge></td></tr>)}</tbody></table></div>{filteredAttendance.length === 0 && <div className="py-12 text-center text-sm text-slate-400">No records match these filters.</div>}<div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">Showing {filteredAttendance.length} of {attendance.length} records</div></Card></section>}

        {stats.total > 0 && attendancePercent < 75 && <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900"><AlertTriangle className="mt-0.5 shrink-0 text-rose-600" size={19} /><div><p className="font-bold">Attendance needs attention</p><p className="mt-1 text-sm text-rose-800">Your attendance is {attendancePercent.toFixed(1)}%. Keep attending classes and contact your instructor if a record looks incorrect.</p></div></div>}
        <footer className="mt-10 flex flex-col justify-between gap-2 border-t border-slate-200/70 pt-5 text-[11px] text-slate-400 sm:flex-row"><span>TouchMark · Student attendance workspace</span><span>Signed in as student</span></footer>
      </main>
    </div>
  );
}
