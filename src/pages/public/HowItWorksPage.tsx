import React from 'react';
import { Mail, Sparkles, CheckCircle2, Clock, ShieldCheck, ArrowRight } from 'lucide-react';

interface HowItWorksPageProps {
  navigate: (path: string) => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ navigate }) => {
  const steps = [
    {
      number: '01',
      title: 'Connect Once via Google OAuth',
      desc: 'Link your Gmail or Google Sheets in 60 seconds. InvoiceChaser runs securely in the background with read and send scopes.',
    },
    {
      number: '02',
      title: 'Automatic Invoice Detection & Cadence Setup',
      desc: 'When an invoice is issued, InvoiceChaser logs the due date, amount, and recipient, scheduling a 3-tier follow-up sequence (+3, +10, +17 days).',
    },
    {
      number: '03',
      title: 'Relationship-Aware AI Drafting',
      desc: 'Gemini 3.7 Flash crafts high-converting reminder drafts tailored to the client’s relationship tier (VIP, Delicate, Standard).',
    },
    {
      number: '04',
      title: 'Single-Click Review & Safe Dispatch',
      desc: 'Review the drafted email in your queue. Make edits or click Approve to send directly from your Gmail domain.',
    },
    {
      number: '05',
      title: 'Stop Engine Triggers on Payment',
      desc: 'When the client marks the invoice paid or replies with confirmation, all subsequent reminder steps are instantly cancelled.',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          How InvoiceChaser Works
        </h1>
        <p className="text-base text-slate-600 leading-relaxed">
          A seamless, autonomous accounts-receivable workflow designed to recover payments without friction.
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 font-mono font-black text-white text-base">
              {step.number}
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">{step.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center">
        <button
          onClick={() => navigate('/app/dashboard')}
          className="rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition"
        >
          Try InvoiceChaser Live &rarr;
        </button>
      </div>
    </div>
  );
};
