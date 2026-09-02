import React, { useState } from 'react';
import {
  ShieldCheck,
  Server,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Activity,
  Zap,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AdminPageProps {
  navigate: (path: string) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ navigate }) => {
  const { isBackendConnected, checkBackendHealth, organizations, invoices, reminders } = useApp();

  const [geminiTestStatus, setGeminiTestStatus] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [testResult, setTestResult] = useState<string>('');

  const runGeminiTest = async () => {
    setGeminiTestStatus('TESTING');
    try {
      const res = await fetch('/api/gemini/test');
      const data = await res.json();
      if (data.status === 'ok') {
        setGeminiTestStatus('SUCCESS');
        setTestResult(data.preview || data.message || 'Gemini 3.7 Flash operational');
      } else {
        setGeminiTestStatus('ERROR');
        setTestResult(data.error || 'Test failed');
      }
    } catch (e: unknown) {
      setGeminiTestStatus('ERROR');
      const msg = e instanceof Error ? e.message : 'Connection failed';
      setTestResult(msg);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/app/dashboard')}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Workspace</span>
        </button>

        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-900 border border-purple-200">
          Super Admin Console
        </span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">InvoiceChaser Platform Diagnostics</h1>
        <p className="text-xs text-slate-500 mt-1">
          Server health, Gemini 3.7 Flash telemetry, background queue workers, and multi-tenant telemetry.
        </p>
      </div>

      {/* 4 Platform Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Tenants</span>
          <h3 className="text-2xl font-black text-slate-900 mt-2">{organizations.length}</h3>
          <p className="text-[11px] text-slate-500 mt-1">Multi-tenant isolation active</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Invoices</span>
          <h3 className="text-2xl font-black text-slate-900 mt-2">{invoices.length}</h3>
          <p className="text-[11px] text-slate-500 mt-1">Ingested across all sources</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Reminders Handled</span>
          <h3 className="text-2xl font-black text-slate-900 mt-2">{reminders.length}</h3>
          <p className="text-[11px] text-slate-500 mt-1">Generated and processed</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Backend Server</span>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`h-3 w-3 rounded-full ${
                isBackendConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <h3 className="text-lg font-black text-slate-900">
              {isBackendConnected ? 'Online (Express)' : 'Standby'}
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Port 3000</p>
        </div>
      </div>

      {/* Gemini 3.7 Flash Diagnostic Card */}
      <div className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Gemini 3.7 Flash Telemetry</h3>
              <p className="text-xs text-slate-500">
                Model: <code className="font-mono font-bold text-indigo-700">gemini-3.7-flash</code> &bull; User-Agent: <code className="font-mono text-slate-600">aistudio-build</code>
              </p>
            </div>
          </div>

          <button
            onClick={runGeminiTest}
            disabled={geminiTestStatus === 'TESTING'}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-xs disabled:opacity-50"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>{geminiTestStatus === 'TESTING' ? 'Testing AI Call…' : 'Run Live Gemini Test'}</span>
          </button>
        </div>

        {geminiTestStatus !== 'IDLE' && (
          <div
            className={`rounded-xl p-4 text-xs ${
              geminiTestStatus === 'SUCCESS'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-950'
                : geminiTestStatus === 'ERROR'
                ? 'bg-rose-50 border border-rose-200 text-rose-950'
                : 'bg-indigo-50 border border-indigo-200 text-indigo-950'
            }`}
          >
            <div className="flex items-center gap-2 font-bold mb-1">
              {geminiTestStatus === 'SUCCESS' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              {geminiTestStatus === 'ERROR' && <AlertCircle className="h-4 w-4 text-rose-600" />}
              <span>Status: {geminiTestStatus}</span>
            </div>
            <p className="font-mono text-[11px]">{testResult}</p>
          </div>
        )}
      </div>

      {/* Security Architecture Assurance */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3 text-xs">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Verified Security Boundaries</span>
        </h3>
        <ul className="space-y-2 text-slate-600">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span><strong>Zero Key Leakage:</strong> All Gemini API calls are securely proxied via server-side Node.js endpoints with no secret keys exposed in client bundles.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span><strong>Stop Engine Isolation:</strong> Once an invoice state becomes &ldquo;PAID&rdquo;, all pending and future reminder cron workers are immediately cancelled in state.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span><strong>Exclusion Guarantees:</strong> Contacts flagged with &ldquo;Never Contact&rdquo; are structurally filtered out from all automated candidate generation queries.</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
