import React from 'react';
import { ShieldCheck, Lock, Key, Server, EyeOff, CheckCircle2 } from 'lucide-react';

interface SecurityPageProps {
  navigate: (path: string) => void;
}

export const SecurityPage: React.FC<SecurityPageProps> = ({ navigate }) => {
  const securityPillars = [
    {
      icon: Lock,
      title: 'Zero Master Credential Storage',
      desc: 'InvoiceChaser connects via Google OAuth2 token standards. We never ask for, view, or store your Google account master password.',
    },
    {
      icon: Server,
      title: 'Server-Side Secret Isolation',
      desc: 'All AI model invocations and Gemini API credentials are securely encapsulated within server-side execution boundaries. No API keys are leaked to client browsers.',
    },
    {
      icon: EyeOff,
      title: 'Scoped Workspace Isolation',
      desc: 'InvoiceChaser only requests permission to inspect invoice-related emails and dispatch approved reminders. We never train public foundation models on your private client messages.',
    },
    {
      icon: Key,
      title: 'Granular Revocation at Any Time',
      desc: 'You can disconnect your Google Workspace account with a single click from the Connections panel or directly inside your Google Security Settings.',
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Enterprise-Grade Security & Privacy</span>
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          How We Protect Your Financial Communications
        </h1>
        <p className="text-base text-slate-600 leading-relaxed">
          We understand that accounts-receivable data is deeply confidential. Here is how we enforce strict security boundaries.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {securityPillars.map((p, idx) => {
          const Icon = p.icon;
          return (
            <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{p.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{p.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-xs text-slate-600 space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900">Security Architecture FAQ</h3>
        <div className="space-y-3">
          <div>
            <span className="font-bold text-slate-800 block">Q: Does InvoiceChaser read all my personal emails?</span>
            <p className="mt-0.5 text-slate-600">
              No. Ingestion filters target outgoing invoice threads (subject lines containing invoice numbers, billing attachments, or payment confirmation keywords).
            </p>
          </div>
          <div>
            <span className="font-bold text-slate-800 block">Q: Can InvoiceChaser send emails without my permission?</span>
            <p className="mt-0.5 text-slate-600">
              When &ldquo;Review Before Send&rdquo; mode is enabled, every drafted reminder requires your explicit single-click authorization before dispatch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
