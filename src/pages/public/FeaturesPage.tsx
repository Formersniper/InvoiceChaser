import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  Mail,
  FileSpreadsheet,
  Clock,
  Layers,
  Users,
  CheckCircle2,
  Lock,
  ArrowRight,
} from 'lucide-react';

interface FeaturesPageProps {
  navigate: (path: string) => void;
}

export const FeaturesPage: React.FC<FeaturesPageProps> = ({ navigate }) => {
  const features = [
    {
      icon: Mail,
      title: 'Automated Ingestion via Gmail',
      desc: 'Listens for outgoing invoice emails and attachments sent from your domain, extracting due dates and amounts automatically without requiring custom billing software.',
    },
    {
      icon: FileSpreadsheet,
      title: '2-Way Google Sheets Sync',
      desc: 'Link your existing accounting spreadsheet. InvoiceChaser imports upcoming rows and continuously checks for status changes like "PAID" or "CANCELLED".',
    },
    {
      icon: Sparkles,
      title: 'Gemini 3.7 Flash Tone Engine',
      desc: 'Each email is dynamically crafted based on recipient relationship tags (VIP, Regular, Delicate, Late Payer) and days overdue to maximize response rates without burning goodwill.',
    },
    {
      icon: ShieldCheck,
      title: 'Instant Stop Engine',
      desc: 'Automatic safety guard that instantly revokes all scheduled follow-ups the millisecond a payment is recorded or an invoice dispute is flagged.',
    },
    {
      icon: Layers,
      title: 'Human Review (Safe Mode)',
      desc: 'Retain 100% control. Every AI-drafted reminder lands in your Pending Queue for single-click review, quick modification, or scheduled auto-dispatch.',
    },
    {
      icon: Users,
      title: 'Relationship & VIP Tagging',
      desc: 'Classify high-value clients to ensure follow-ups maintain a collaborative, warm, and highly courteous tone matching your studio’s voice.',
    },
    {
      icon: Clock,
      title: 'Customizable Cadence Intervals',
      desc: 'Configure gentle (7/14/30 days), standard (3/10/17 days), or firm (1/5/10 days) follow-up intervals tailored to your industry norms.',
    },
    {
      icon: Lock,
      title: 'Zero Credential Storage',
      desc: 'Google OAuth authentication operates with read/send token isolation. We never see, store, or transmit your master Google account passwords.',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          Intelligent Follow-ups. Zero Awkwardness.
        </h1>
        <p className="text-base text-slate-600 leading-relaxed">
          Everything you need to automate client accounts receivable without sounding like a robotic debt collector.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f, idx) => {
          const Icon = f.icon;
          return (
            <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-8 text-center max-w-3xl mx-auto space-y-4">
        <h3 className="text-xl font-bold text-slate-900">Ready to automate your unpaid receivables?</h3>
        <button
          onClick={() => navigate('/app/dashboard')}
          className="rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm transition"
        >
          Launch Free Workspace &rarr;
        </button>
      </div>
    </div>
  );
};
