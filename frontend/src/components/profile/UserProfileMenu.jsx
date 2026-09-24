import { useEffect, useRef, useState } from 'react';
import { ChevronDown, KeyRound, LogOut, ShieldCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../services/api';
import { useAuth } from '../../context/useAuth';
import { Button } from '../ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';

const EMPTY_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function UserProfileMenu({ placement = 'top' }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const menuRef = useRef(null);
  const initials = (user?.name || user?.email || 'User').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeIfOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const closeOnEscape = (event) => { if (event.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('pointerdown', closeIfOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeIfOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  const openPasswordForm = () => {
    setMenuOpen(false);
    setPasswordOpen(true);
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (form.newPassword.length < 8) return toast.error('Use at least 8 characters for your new password');
    if (form.newPassword !== form.confirmPassword) return toast.error('New passwords do not match');

    setSaving(true);
    try {
      await authService.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password changed. Use it next time you sign in.');
      setPasswordOpen(false);
      setForm(EMPTY_FORM);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={menuRef} className="relative w-full">
      <button type="button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-violet-200 hover:bg-violet-50/50">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{initials}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800">{user?.name || 'Account'}</span><span className="block truncate text-[11px] text-slate-500">{user?.email}</span></span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
      </button>

      {menuOpen && <div role="menu" className={`absolute right-0 z-50 w-full min-w-[230px] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ${placement === 'top' ? 'bottom-full mb-3' : 'top-full mt-3'}`}>
        <div className="flex items-center gap-3 rounded-xl px-3 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{initials}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800">{user?.name || 'Account'}</span><span className="block truncate text-xs text-slate-500">{user?.email}</span></span>
        </div>
        <div className="my-1 border-t border-slate-100" />
        <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{user?.role || 'Account'} account</p>
        <button type="button" role="menuitem" onClick={openPasswordForm} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><KeyRound size={16} className="text-slate-400" />Change password</button>
        <button type="button" role="menuitem" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50"><LogOut size={16} />Sign out</button>
      </div>}

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><ShieldCheck size={21} /></div>
            <DialogTitle>Change your password</DialogTitle>
            <DialogDescription>Confirm your current password, then choose a new one with at least 8 characters.</DialogDescription>
          </DialogHeader>
          <form onSubmit={changePassword} className="mt-5 space-y-4">
            <div className="space-y-2"><Label htmlFor="current-password">Current password</Label><Input id="current-password" autoComplete="current-password" type="password" required value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" autoComplete="new-password" type="password" minLength={8} required value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="confirm-password">Confirm new password</Label><Input id="confirm-password" autoComplete="new-password" type="password" minLength={8} required value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPasswordOpen(false)} disabled={saving}><X size={15} className="mr-1" />Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Update password'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
