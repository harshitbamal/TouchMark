import { useState } from 'react';
import toast from 'react-hot-toast';
import { authService } from '../../services/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';

export function TeacherManager() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await authService.createTeacher(form);
      toast.success('Teacher account created. Share the temporary password securely.');
      setForm({ name: '', email: '', password: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not create teacher account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a teacher account</CardTitle>
      <CardDescription>Create a login and share its temporary password securely. Teachers can change it from their profile menu after signing in.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="max-w-lg space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teacher-name">Full name</Label>
            <Input id="teacher-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teacher-email">Email</Label>
            <Input id="teacher-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teacher-password">Temporary password (at least 8 characters)</Label>
            <Input id="teacher-password" type="password" autoComplete="new-password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create teacher account'}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
