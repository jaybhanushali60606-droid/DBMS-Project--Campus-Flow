import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { Button } from '../components/ui/Button';
import { GraduationCap, AlertCircle, ArrowLeft } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginRole, setLoginRole] = useState<'STUDENT' | 'FACULTY' | 'ADMIN'>('STUDENT');
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>(() => new URLSearchParams(window.location.search).has('token') ? 'reset' : 'login');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetToken, setResetToken] = useState(new URLSearchParams(window.location.search).get('token') || '');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (resetToken) {
      window.history.replaceState({}, '', '/login');
    }
  }, [resetToken]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setMessage(null); setLoading(true);
    try {
      if (mode === 'login') {
        const user = await login(username, password, loginRole);
        navigate(user.role === 'ADMIN' ? '/admin/dashboard' : user.role === 'FACULTY' ? '/faculty/dashboard' : '/student/dashboard');
      } else if (mode === 'forgot') {
        const res = await authApi.requestPasswordReset(email);
        setMessage(res.message || 'If an account exists for that email, a reset link has been sent.');
      } else {
        const res = await authApi.resetPassword({ token: resetToken, new_password: newPassword });
        setMessage(res.message || 'Password reset. You can now sign in.'); setMode('login'); setNewPassword('');
        window.history.replaceState({}, '', '/login');
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (!err.response) {
        setError('Cannot reach the CampusFlow backend. Start the backend server at localhost:8000, then try again.');
      } else {
        setError(`The server could not complete this request (HTTP ${err.response.status}). Check the backend terminal for details.`);
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-sky-600 text-white shadow-lg shadow-sky-600/30 mb-3">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CampusFlow</h1>
          <p className="text-sm text-slate-500 mt-1">Unified College Management System</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}
        {message && <div role="status" className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">{message}</div>}

        {mode !== 'login' && <button type="button" onClick={() => { setMode('login'); setError(null); setMessage(null); }} className="mb-4 inline-flex items-center gap-2 text-sm text-sky-700 hover:text-sky-900"><ArrowLeft className="h-4 w-4" /> Back to sign in</button>}
        <h2 className="text-lg font-semibold text-slate-900 mb-4">{mode === 'login' ? 'Sign in to your account' : mode === 'forgot' ? 'Reset your password' : 'Choose a new password'}</h2>
        <form onSubmit={submit} className="space-y-4">
          {mode === 'login' && <div>
            <fieldset className="mb-2">
              <legend className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Sign in as</legend>
              <div className="grid grid-cols-3 gap-2">
                {(['STUDENT', 'FACULTY', 'ADMIN'] as const).map((role) => (
                  <button key={role} type="button" aria-pressed={loginRole === role} onClick={() => setLoginRole(role)} className={`rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${loginRole === role ? 'border-sky-600 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-600 hover:border-sky-300'}`}>
                    {role.charAt(0) + role.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              {loginRole === 'STUDENT' ? 'Student UID' : 'Username or email'}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm transition-all"
              placeholder={loginRole === 'STUDENT' ? 'Enter your UID' : 'Enter your username or email'}
            />
          </div>}

          {mode === 'login' && <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password} autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm transition-all"
              placeholder="••••••••"
            />
          </div>}
          {mode === 'forgot' && <div><label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Account email</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm" /></div>}
          {mode === 'reset' && <div><label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">New password</label><input type="password" required minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm" /></div>}

          <Button type="submit" isLoading={loading} className="w-full py-2.5 text-sm mt-2">
            {mode === 'login' ? 'Sign In to CampusFlow' : mode === 'forgot' ? 'Send reset link' : 'Reset password'}
          </Button>
        </form>

        {mode === 'login' && <div className="mt-5 text-sm"><button type="button" onClick={() => {setMode('forgot'); setError(null); setMessage(null);}} className="text-sky-700 hover:underline">Forgot password?</button></div>}
      </div>
    </div>
  );
};
