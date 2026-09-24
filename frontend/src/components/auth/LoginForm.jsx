import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Alert, AlertDescription } from '../ui/Alert';
import { AlertCircle, ArrowRight, Eye, EyeOff, Fingerprint, LoaderCircle, Mail, LockKeyhole } from 'lucide-react';
import toast from 'react-hot-toast';

export function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError('Enter your email address and password to continue.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(normalizedEmail, password);
      if (result.success) {
        toast.success('Login successful!');
        navigate(result.user.role === 'student' ? '/student' : `/${result.user.role}`);
      } else {
        const message = result.message === 'Invalid credentials'
          ? 'The email or password is incorrect. Please try again.'
          : result.message || 'Unable to sign in. Please try again.';
        setError(message);
      }
    } catch (err) {
      const message = err?.response?.status === 401
        ? 'The email or password is incorrect. Please try again.'
        : err?.response
          ? 'Unable to sign in right now. Please try again.'
          : 'Unable to connect. Check your internet connection and try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => { if (error) setError(''); };

  return (
    <div className="login-page flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8 antialiased">
      <Card className="w-full max-w-[500px] overflow-hidden rounded-2xl border-slate-200 bg-white/95 shadow-xl backdrop-blur-sm">
        <CardHeader className="px-8 pb-4 pt-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-8 ring-blue-50/50">
              <Fingerprint className="h-12 w-12" strokeWidth={2.2} />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">TouchMark</CardTitle>
          <CardDescription className="mt-1 text-base font-medium text-slate-500">Biometric Attendance System</CardDescription>
        </CardHeader>

        <CardContent className="px-8 pb-8 pt-2">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {error && (
              <Alert variant="destructive" id="login-error" role="alert" className="animate-in fade-in slide-in-from-top-1 rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="font-medium">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Email Address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); clearError(); }}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck="false"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'login-error' : undefined}
                  className="h-13 rounded-xl border-slate-200 bg-slate-50/50 pl-11 pr-4 text-base placeholder:text-slate-400 focus-visible:border-violet-500 focus-visible:bg-white focus-visible:ring-violet-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => { setPassword(event.target.value); clearError(); }}
                  autoComplete="current-password"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'login-error' : undefined}
                  className="h-13 rounded-xl border-slate-200 bg-slate-50/50 pl-11 pr-11 text-base tracking-wide placeholder:text-slate-400 focus-visible:border-violet-500 focus-visible:bg-white focus-visible:ring-violet-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-1 flex w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500">Your role is identified securely when you sign in.</p>

            <Button
              type="submit"
              className="h-13 w-full rounded-xl bg-violet-600 text-base font-semibold shadow-md transition-all duration-200 hover:bg-violet-700 active:scale-[0.99] focus-visible:ring-violet-400 disabled:opacity-50"
              disabled={loading || !email.trim() || !password}
            >
              {loading ? (
                <><LoaderCircle className="mr-2 h-5 w-5 animate-spin" />Signing in…</>
              ) : (
                <>Sign In<ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" /></>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}