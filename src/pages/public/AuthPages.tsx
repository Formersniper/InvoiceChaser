import React, { useState } from 'react';
import { Mail, Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../utils/api';

interface AuthPageProps {
  mode: 'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD';
  navigate: (path: string) => void;
}

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
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
);

export const AuthPage: React.FC<AuthPageProps> = ({ mode, navigate }) => {
  const { login, signup, loginWithGoogle } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const errParam = params.get('error');
      if (errParam) {
        if (errParam === 'cancelled') {
          setError('Google sign-in was cancelled.');
        } else if (errParam === 'oauth_failed' || errParam === 'auth_failed') {
          setError('Authentication failed. Please try again or sign in with email and password.');
        } else {
          setError('Authentication failed. Please try again.');
        }
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setError('');
    setMessage('');
    setIsGoogleLoading(true);

    try {
      await loginWithGoogle();
      navigate('/app/dashboard');
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : 'Google authentication failed.';
      if (rawMsg.includes('closed') || rawMsg.includes('cancelled')) {
        setError('Google sign-in was cancelled.');
      } else if (rawMsg.includes('blocked')) {
        setError('Popup was blocked by your browser. Please allow popups for InvoiceChaser to continue with Google.');
      } else if (rawMsg.includes('provider is not enabled') || rawMsg.includes('configuration')) {
        setError('Google authentication is not yet enabled in Supabase. Please sign in with email/password.');
      } else {
        setError(rawMsg);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

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
        const loggedIn = await signup(email, password, name, company);
        if (loggedIn) {
          navigate('/app/dashboard');
        } else {
          setMessage('Account created successfully! Please check your email inbox to confirm your address before logging in.');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed. Please check your credentials.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[82vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#3c473a] font-black text-white text-base mx-auto shadow-md">
            IC
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {mode === 'LOGIN'
              ? 'Sign in to InvoiceChaser'
              : mode === 'SIGNUP'
              ? 'Create your InvoiceChaser workspace'
              : 'Reset your password'}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            {mode === 'LOGIN'
              ? 'Access your authenticated accounts receivable workspace'
              : mode === 'SIGNUP'
              ? 'Start recovering delayed client invoices with Google-first authentication'
              : 'Enter your account email to receive recovery instructions'}
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-800 flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {message && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-medium text-emerald-800 flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">{message}</div>
          </div>
        )}

        {/* PRIMARY ACTION: Continue with Google (for LOGIN and SIGNUP) */}
        {mode !== 'FORGOT_PASSWORD' && (
          <div className="space-y-4">
            <button
              id="google-signin-button"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isSubmitting}
              className="w-full flex items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white py-3.5 px-4 text-xs font-bold text-slate-800 hover:bg-slate-50 hover:border-slate-400 active:scale-[0.99] shadow-sm transition cursor-pointer disabled:opacity-60"
            >
              {isGoogleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
              ) : (
                <GoogleIcon className="h-4 w-4 shrink-0" />
              )}
              <span>{isGoogleLoading ? 'Connecting with Google…' : 'Continue with Google'}</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-bold text-slate-400 tracking-wider">
                OR
              </span>
              <div className="border-t border-slate-200 w-full" />
            </div>
          </div>
        )}

        {/* SECONDARY FORM: Email & Password */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === 'SIGNUP' && (
            <>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name</label>
                <input
                  id="signup-name-input"
                  type="text"
                  placeholder="e.g. Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus:bg-white focus:outline-none focus:border-[#3c473a] font-medium transition"
                  required
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Company / Studio Name</label>
                <input
                  id="signup-company-input"
                  type="text"
                  placeholder="e.g. Studio Vertex"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus:bg-white focus:outline-none focus:border-[#3c473a] font-medium transition"
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Work Email</label>
            <input
              id="auth-email-input"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus:bg-white focus:outline-none focus:border-[#3c473a] font-medium transition"
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
                    className="text-[11px] font-semibold text-[#3c473a] hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="auth-password-input"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus:bg-white focus:outline-none focus:border-[#3c473a] font-medium transition"
                required
              />
            </div>
          )}

          <button
            id="auth-submit-button"
            type="submit"
            disabled={isSubmitting || isGoogleLoading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#3c473a] py-3 text-xs font-bold text-white hover:bg-[#2e372c] disabled:opacity-60 shadow-md transition active:scale-[0.99] cursor-pointer"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>
              {mode === 'LOGIN'
                ? isSubmitting ? 'Authenticating…' : 'Sign In with Email'
                : mode === 'SIGNUP'
                ? isSubmitting ? 'Creating Workspace…' : 'Create Workspace with Email'
                : isSubmitting ? 'Sending Link…' : 'Send Reset Instructions'}
            </span>
          </button>
        </form>

        {/* Mode Switch Footers */}
        <div className="text-center text-xs text-slate-500 pt-3 border-t border-slate-100">
          {mode === 'LOGIN' ? (
            <p>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="font-bold text-[#3c473a] hover:underline"
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
                className="font-bold text-[#3c473a] hover:underline"
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
                className="font-bold text-[#3c473a] hover:underline"
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

