import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Fingerprint, LogOut, Users, Radio, UserPlus, BookOpen } from 'lucide-react';
import { LiveClassScanner } from './LiveClassScanner';
import { EnrollmentManager } from './EnrollmentManager';
import { TeacherManager } from './TeacherManager';
import { ClassManager } from './ClassManager';

export function AdminDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Fingerprint className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="font-bold text-xl text-blue-900">{user?.role === 'teacher' ? 'Teacher Portal' : 'Admin Portal'}</h1>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
            <Button variant="ghost" onClick={logout} className="text-red-600 hover:bg-red-50">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome, {user?.name || (user?.role === 'teacher' ? 'Teacher' : 'Administrator')}!</h1>
          <p className="text-lg text-gray-600">Manage classes, attendance, student enrollments, and staff</p>
        </div>

        <div className="space-y-12">
          <section className="space-y-5">
            <div className="flex items-center gap-2 border-b pb-3">
              <Radio className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-semibold">Attendance</h2>
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

          {user?.role === 'admin' && <section className="space-y-5">
            <div className="flex items-center gap-2 border-b pb-3">
              <Users className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-semibold">Fingerprint Enrollment</h2>
            </div>
            <EnrollmentManager />
          </section>}

          {user?.role === 'admin' && <section className="space-y-5">
            <div className="flex items-center gap-2 border-b pb-3">
              <UserPlus className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-semibold">Teacher Accounts</h2>
            </div>
            <TeacherManager />
          </section>}
        </div>
      </main>
    </div>
  );
}
