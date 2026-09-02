import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../utils/api';

interface AuthPageProps {
  mode: 'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD';
  navigate: (path: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ mode, navigate }) => {
  const { login, signup } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      if (mode === 'FORGOT_PASSWORD') {
        const res = await api.post<{ success: boolean; message: string }>('/api/auth/forgot-password', {
          email,
        });
        setMessage(res.message || `Password reset instructions sent to ${email}`);
        setIsSubmitting(false);
        return;
      }

      if (mode === 'LOGIN') {
        await login(email, password);
        navigate('/app/dashboard');
      } else if (mode === 'SIGNUP') {
        await signup(email, password, name, company);
        navigate('/app/dashboard');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed. Please check your credentials.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 font-black text-white text-base mx-auto shadow-sm">
            IC
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {mode === 'LOGIN'
              ? 'Sign in to InvoiceChaser'
              : mode === 'SIGNUP'
              ? 'Create your free account'
              : 'Reset your password'}
          </h2>
          <p className="text-xs text-slate-500">
            {mode === 'LOGIN'
              ? 'Access your authenticated accounts receivable workspace'
              : mode === 'SIGNUP'
              ? 'Start recovering delayed client invoices with Supabase persistence'
              : 'Enter your account email to receive recovery instructions'}
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === 'SIGNUP' && (
            <>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
                  required
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Company / Studio Name</label>
                <input
                  type="text"
                  placeholder="e.g. Studio Vertex"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Work Email</label>
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
              required
            />
          </div>

          {mode !== 'FORGOT_PASSWORD' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Password</label>
                {mode === 'LOGIN' && (
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-[11px] font-semibold text-indigo-600 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60 shadow-md transition active:scale-[0.99] cursor-pointer"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>
              {mode === 'LOGIN'
                ? isSubmitting ? 'Authenticating with Supabase...' : 'Sign In & Launch Workspace'
                : mode === 'SIGNUP'
                ? isSubmitting ? 'Creating Account in Supabase...' : 'Create Workspace Account'
                : isSubmitting ? 'Sending Link...' : 'Send Reset Instructions'}
            </span>
          </button>
        </form>

        {/* Footer switch */}
        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          {mode === 'LOGIN' ? (
            <p>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="font-bold text-indigo-600 hover:underline"
              >
                Sign up free
              </button>
            </p>
          ) : mode === 'SIGNUP' ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="font-bold text-indigo-600 hover:underline"
              >
                Sign in
              </button>
            </p>
          ) : (
            <p>
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="font-bold text-indigo-600 hover:underline"
              >
                Back to Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
