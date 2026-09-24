import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { BookOpen, Fingerprint, LogOut, Radio } from 'lucide-react';
import { LiveClassScanner } from '../admin/LiveClassScanner';
import { ClassManager } from '../admin/ClassManager';

export function TeacherDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Fingerprint className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-blue-900">Teacher Portal</h1>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={logout} className="text-red-600 hover:bg-red-50">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <h1 className="mb-2 text-4xl font-bold">Welcome, {user?.name || 'Teacher'}!</h1>
          <p className="text-lg text-gray-600">View classes and mark student attendance.</p>
        </div>

        <section className="space-y-5">
          <div className="flex items-center gap-2 border-b pb-3">
            <Radio className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-semibold">Mark Attendance</h2>
          </div>
          <LiveClassScanner />
        </section>

        <section className="space-y-5">
          <div className="flex items-center gap-2 border-b pb-3">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-semibold">Classes</h2>
          </div>
          <ClassManager />
        </section>
      </main>
    </div>
  );
}
