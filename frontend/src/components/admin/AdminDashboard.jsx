import { createElement, useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { attendanceService, classService, studentService } from '../../services/api';
import { useScannerStatus } from '../../hooks/useScannerStatus';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { AttendanceReport } from './AttendanceReport';
import { UserProfileMenu } from '../profile/UserProfileMenu';
import { LiveClassScanner } from './LiveClassScanner';
import { EnrollmentManager } from './EnrollmentManager';
import { EnrollmentRequestManager } from './EnrollmentRequestManager';
import { TeacherManager } from './TeacherManager';
import { StudentAccountManager } from './StudentAccountManager';
import { ClassManager } from './ClassManager';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, CalendarDays,
  CheckCircle2, Fingerprint, LayoutDashboard, Menu,
  Radio, RefreshCw, Users, UserPlus, X,
} from 'lucide-react';

const nav = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'classes', label: 'Classes', icon: BookOpen },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'scanner', label: 'Scanner live', icon: Radio },
];

const formatTime = (value) => value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

export function AdminDashboard() {
  const { user } = useAuth();
  const { status: scannerStatus } = useScannerStatus();
  const [activeView, setActiveView] = useState('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const isAdmin = user?.role === 'admin';

  const refreshDashboard = useCallback(async () => {
    setRefreshing(true);
    const [classResult, studentResult, attendanceResult] = await Promise.allSettled([
      classService.getAll(), studentService.getAll(), attendanceService.get(),
    ]);
    if (classResult.status === 'fulfilled') setClasses(classResult.value.classes || []);
    if (studentResult.status === 'fulfilled') setStudents(studentResult.value.students || []);
    if (attendanceResult.status === 'fulfilled') setAttendance(attendanceResult.value.attendance || []);
    setLastUpdated(new Date());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([classService.getAll(), studentService.getAll(), attendanceService.get()]).then((results) => {
      if (!mounted) return;
      const [classResult, studentResult, attendanceResult] = results;
      if (classResult.status === 'fulfilled') setClasses(classResult.value.classes || []);
      if (studentResult.status === 'fulfilled') setStudents(studentResult.value.students || []);
      if (attendanceResult.status === 'fulfilled') setAttendance(attendanceResult.value.attendance || []);
      setLastUpdated(new Date());
    });
    return () => { mounted = false; };
  }, []);

  const presentToday = attendance.filter((row) => row.status === 'present' && new Date(row.date || row.markedAt).toDateString() === new Date().toDateString()).length;
  const views = {
    overview: 'Overview',
    classes: 'Classes',
    students: 'Students & enrollment',
    scanner: 'Live attendance',
    teachers: 'Teacher accounts',
  };

  const changeView = (view) => { setActiveView(view); setMenuOpen(false); };

  return (
    <div className="dashboard-shell flex bg-[#f7f8fc]">
      {menuOpen && <button aria-label="Close navigation" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30 bg-slate-950/30 md:hidden" />}
      <aside className={`dashboard-sidebar fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white px-5 py-6 transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-200"><Fingerprint size={22} /></div>
            <div><p className="text-[17px] font-extrabold tracking-tight text-slate-900">TouchMark</p><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">Attendance system</p></div>
          </div>
          <button className="rounded-lg p-2 text-slate-500 md:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>

        <p className="mb-3 mt-10 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Workspace</p>
        <nav className="space-y-1" aria-label="Main navigation">
          {nav.map(({ id, label, icon }) => (
            <button key={id} onClick={() => changeView(id)} className={`dashboard-nav-link flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${activeView === id ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
              {createElement(icon, { size: 18, strokeWidth: 1.9 })}{label}{id === 'scanner' && <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500" />}
            </button>
          ))}
          {isAdmin && <button onClick={() => changeView('teachers')} className={`dashboard-nav-link flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${activeView === 'teachers' ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}><UserPlus size={18} strokeWidth={1.9} />Teacher accounts</button>}
        </nav>

        <div className="mt-auto border-t border-slate-100 pt-5">
          <UserProfileMenu placement="top" />
        </div>
      </aside>

      <main className="dashboard-content min-h-screen flex-1 px-4 py-5 sm:px-7 lg:px-10 lg:py-8">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 md:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={19} /></button>
            <div><p className="text-xs font-semibold text-slate-400">Workspace / <span className="text-violet-600">{views[activeView]}</span></p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">{activeView === 'overview' ? `Welcome back, ${(user?.name || (isAdmin ? 'Administrator' : 'Teacher')).split(' ')[0]}` : views[activeView]}</h1></div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-xs text-slate-400 sm:inline">Updated {formatTime(lastUpdated)}</span>
            <Button variant="outline" size="sm" onClick={refreshDashboard} disabled={refreshing} className="gap-2 rounded-xl border-slate-200 bg-white text-slate-600"><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /><span className="hidden sm:inline">Refresh</span></Button>
            {activeView !== 'overview' && activeView !== 'teachers' && <Button size="sm" onClick={() => changeView(activeView === 'classes' ? 'scanner' : 'scanner')} className="hidden gap-2 rounded-xl sm:inline-flex"><Radio size={14} />Go live</Button>}
          </div>
        </header>

        {activeView === 'overview' && <>
          <section className="mb-7 rounded-2xl bg-gradient-to-r from-violet-700 via-violet-600 to-indigo-600 p-6 text-white shadow-xl shadow-violet-200/60 sm:p-8">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold"><CalendarDays size={14} />{new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div><h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Your attendance at a glance</h2><p className="mt-2 max-w-lg text-sm text-violet-100">Manage classes, check today’s activity, and start a live fingerprint session from one place.</p></div>
              <Button onClick={() => changeView('scanner')} className="h-11 gap-2 self-start rounded-xl bg-white px-5 font-bold text-violet-700 shadow-sm hover:bg-violet-50 sm:self-center"><Radio size={17} />Start a session<ArrowRight size={16} /></Button>
            </div>
          </section>

          <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Attendance summary">
            {[
              { label: 'Active classes', value: classes.length, detail: 'Classes in your workspace', icon: BookOpen, tone: 'violet', trend: 'Manage classes', action: 'classes' },
              { label: 'Total students', value: students.length, detail: 'Registered student accounts', icon: Users, tone: 'blue', trend: 'View students', action: 'students' },
              { label: 'Present today', value: presentToday, detail: 'Attendance marked today', icon: CheckCircle2, tone: 'emerald', trend: 'Live activity', action: 'scanner' },
              { label: 'Attendance records', value: attendance.length, detail: 'Records available', icon: Activity, tone: 'amber', trend: 'Updated just now', action: 'overview' },
            ].map(({ label, value, detail, icon, tone, trend, action }) => (
              <Card key={label} className="dashboard-card rounded-2xl border-slate-100 shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p></div><div className={`rounded-xl p-2.5 ${tone === 'violet' ? 'bg-violet-50 text-violet-600' : tone === 'blue' ? 'bg-blue-50 text-blue-600' : tone === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{createElement(icon, { size: 19 })}</div></div><p className="mt-1 text-xs text-slate-400">{detail}</p><button onClick={() => changeView(action)} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-800">{trend}<ArrowRight size={13} /></button></CardContent></Card>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <AttendanceReport attendance={attendance} classes={classes} onOpenScanner={() => changeView('scanner')} />
            <div className="space-y-6"><Card className="rounded-2xl border-slate-100 shadow-sm"><CardContent className="p-5 sm:p-6"><div className="flex items-center gap-3"><div className={`rounded-xl p-2.5 ${scannerStatus.ready ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}><Radio size={19} /></div><div><h3 className="font-bold text-slate-900">Scanner session</h3><p className="text-xs text-slate-400">{scannerStatus.ready ? 'Fingerprint device is ready' : scannerStatus.state === 'reconnecting' || scannerStatus.state === 'connecting' ? 'Scanner disconnected · reconnecting…' : 'Connect a scanner to start attendance'}</p></div></div><div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-sm font-medium text-slate-600">Fingerprint device</span><span className={`flex items-center gap-2 text-xs font-bold ${scannerStatus.ready ? 'text-emerald-600' : scannerStatus.state === 'reconnecting' ? 'text-amber-600' : 'text-slate-500'}`}><span className={`h-2 w-2 rounded-full ${scannerStatus.ready ? 'bg-emerald-500' : scannerStatus.state === 'reconnecting' ? 'animate-pulse bg-amber-500' : 'bg-slate-300'}`} />{scannerStatus.ready ? 'Connected' : scannerStatus.state === 'reconnecting' ? 'Reconnecting' : scannerStatus.state === 'connecting' ? 'Checking' : 'Disconnected'}</span></div><Button onClick={() => changeView('scanner')} className="mt-4 w-full gap-2 rounded-xl"><Fingerprint size={16} />Open scanner</Button></CardContent></Card>
              <Card className="rounded-2xl border-slate-100 shadow-sm"><CardContent className="p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-slate-900">Quick actions</h3><span className="text-xs text-slate-400">Shortcuts</span></div><div className="space-y-2"><button onClick={() => changeView('classes')} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:border-violet-200 hover:bg-violet-50/50"><span className="rounded-lg bg-violet-50 p-2 text-violet-600"><BookOpen size={16} /></span><span className="flex-1"><span className="block text-sm font-semibold text-slate-700">Manage classes</span><span className="text-[11px] text-slate-400">Create and update classes</span></span><ArrowUpRight size={15} className="text-slate-400" /></button>{isAdmin && <button onClick={() => changeView('teachers')} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:border-violet-200 hover:bg-violet-50/50"><span className="rounded-lg bg-blue-50 p-2 text-blue-600"><UserPlus size={16} /></span><span className="flex-1"><span className="block text-sm font-semibold text-slate-700">Add a teacher</span><span className="text-[11px] text-slate-400">Provision teaching access</span></span><ArrowDownRight size={15} className="text-slate-400" /></button>}</div></CardContent></Card></div>
          </section>
        </>}

        {activeView === 'classes' && <div className="space-y-5"><p className="text-sm text-slate-500">Create classes, assign course details, and review current enrollments.</p><ClassManager /></div>}
        {activeView === 'students' && <div className="space-y-5"><p className="text-sm text-slate-500">Create student accounts, review enrollment status, and register fingerprints.</p>{isAdmin && <StudentAccountManager onCreated={refreshDashboard} />}<EnrollmentRequestManager /><EnrollmentManager /></div>}
        {activeView === 'scanner' && <div className="space-y-5"><p className="text-sm text-slate-500">Choose a class to run a fingerprint attendance session. New check-ins appear as they are received.</p><LiveClassScanner /></div>}
        {activeView === 'teachers' && isAdmin && <div className="space-y-5"><p className="text-sm text-slate-500">Create and manage teacher access for the attendance workspace.</p><TeacherManager /></div>}

        <footer className="mt-10 flex flex-col justify-between gap-2 border-t border-slate-200/70 pt-5 text-[11px] text-slate-400 sm:flex-row"><span>TouchMark · Fingerprint attendance management</span><span>Signed in as {user?.role || 'user'}</span></footer>
      </main>
    </div>
  );
}
