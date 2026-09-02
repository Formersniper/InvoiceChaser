import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AuthPageProps {
  mode: 'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD';
  navigate: (path: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ mode, navigate }) => {
  const { user } = useApp();
  const [email, setEmail] = useState(user.email || 'rohit@apexstudios.in');
  const [password, setPassword] = useState('••••••••••••');
  const [name, setName] = useState('Rohit Sharma');
  const [company, setCompany] = useState('Apex Design Studios');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'FORGOT_PASSWORD') {
      setMessage(`Password reset link sent to ${email}`);
      return;
    }
    // Navigate straight to dashboard
    navigate('/app/dashboard');
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 font-black text-white text-base mx-auto">
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
              ? 'Access your accounts receivable workspace'
              : mode === 'SIGNUP'
              ? 'Start recovering delayed client invoices today'
              : 'Enter your email to receive recovery instructions'}
          </p>
        </div>

        {message && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}

        {/* Quick OAuth Button */}
        {mode !== 'FORGOT_PASSWORD' && (
          <div>
            <button
              onClick={() => navigate('/app/dashboard')}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google Workspace</span>
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                <span className="bg-white px-2">or email</span>
              </div>
            </div>
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus:bg-white focus:outline-none focus:border-indigo-500 font-semibold"
                  required
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Company / Studio Name</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus:bg-white focus:outline-none focus:border-indigo-500 font-semibold"
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Work Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus:bg-white focus:outline-none focus:border-indigo-500 font-semibold"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus:bg-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-700 shadow-md transition active:scale-[0.99]"
          >
            {mode === 'LOGIN'
              ? 'Sign In & Launch App'
              : mode === 'SIGNUP'
              ? 'Create Workspace Account'
              : 'Send Reset Instructions'}
          </button>
        </form>

        {/* Footer switch */}
        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          {mode === 'LOGIN' ? (
            <p>
              Don&apos;t have an account?{' '}
              <button
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
