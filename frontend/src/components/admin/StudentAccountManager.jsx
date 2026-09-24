import { useState } from 'react';
import toast from 'react-hot-toast';
import { authService } from '../../services/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';

const EMPTY_FORM = { name: '', rollNumber: '', email: '', phone: '', password: '' };

export function StudentAccountManager({ onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await authService.createStudent(form);
      toast.success('Student account created. Share the temporary password securely.');
      setForm(EMPTY_FORM);
      await onCreated?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not create student account');
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  return (
    <Card className="rounded-2xl border-slate-100 shadow-sm">
      <CardHeader>
        <CardTitle>Create a student account</CardTitle>
        <CardDescription>Set up the student profile and login together. Give the temporary password to the student so they can sign in and change it from their profile menu.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="student-name">Full name</Label><Input id="student-name" autoComplete="name" required value={form.name} onChange={update('name')} /></div>
          <div className="space-y-2"><Label htmlFor="student-roll">Roll number</Label><Input id="student-roll" required value={form.rollNumber} onChange={update('rollNumber')} /></div>
          <div className="space-y-2"><Label htmlFor="student-email">Email address</Label><Input id="student-email" type="email" autoComplete="email" required value={form.email} onChange={update('email')} /></div>
          <div className="space-y-2"><Label htmlFor="student-phone">Phone number</Label><Input id="student-phone" type="tel" autoComplete="tel" value={form.phone} onChange={update('phone')} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="student-temp-password">Temporary password</Label><Input id="student-temp-password" type="password" autoComplete="new-password" minLength={8} required value={form.password} onChange={update('password')} /><p className="text-xs text-slate-400">At least 8 characters. Students can change it after signing in.</p></div>
          <div className="sm:col-span-2"><Button type="submit" disabled={loading}>{loading ? 'Creating account…' : 'Create student account'}</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}
