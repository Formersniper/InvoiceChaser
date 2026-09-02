import React from 'react';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Mail,
  FileSpreadsheet,
  TrendingUp,
  DollarSign,
  Zap,
  Users,
  Lock,
} from 'lucide-react';

interface LandingPageProps {
  navigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  return (
    <div className="space-y-20 pb-20">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 sm:pt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-1 text-xs font-bold text-indigo-700 shadow-xs">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Relationship-Aware Accounts Receivable AI</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Get Paid Without the Awkwardness.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              InvoiceChaser watches your Gmail & Google Sheets for sent invoices and drafts relationship-aware payment reminders before they become overdue. One click to approve and send.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => navigate('/app/dashboard')}
                className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition active:scale-[0.99]"
              >
                <span>Launch Free Interactive App</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => navigate('/how-it-works')}
                className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <span>See How It Works</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Safe Mode review enabled
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-indigo-600" />
                Zero password storage
              </span>
            </div>
          </div>

          {/* Hero Visual Mockup */}
          <div className="mt-12 rounded-2xl border border-slate-200/80 bg-slate-900 p-2 shadow-2xl sm:p-3 max-w-5xl mx-auto">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 sm:p-6 text-left">
              {/* Window chrome */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="text-[11px] font-mono text-slate-500 ml-2">InvoiceChaser AI &bull; Stop Engine Active</span>
                </div>
                <span className="rounded bg-indigo-950 px-2 py-0.5 text-[10px] font-bold text-indigo-400 border border-indigo-800">
                  Gemini 3.7 Flash
                </span>
              </div>

              {/* Mock Invoice Follow-up Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Left Card: Verified Facts */}
                <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 text-xs space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Target Invoice</span>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Invoice:</span>
                    <span className="font-bold text-white">#INV-1042</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Client:</span>
                    <span className="font-bold text-white">ABC Interiors</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Amount Due:</span>
                    <span className="font-black text-emerald-400">₹75,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Overdue:</span>
                    <span className="font-bold text-rose-400">7 Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tag:</span>
                    <span className="rounded bg-purple-900/60 text-purple-300 px-1.5 py-0.2 text-[10px] font-bold">
                      VIP Client
                    </span>
                  </div>
                </div>

                {/* Right 2 cols: AI Generated Email */}
                <div className="md:col-span-2 rounded-xl bg-slate-900 border border-slate-800 p-4 text-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-indigo-400 font-bold flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Generated Reminder (Tone: Warm & Courteous)
                    </span>
                    <span className="text-[10px] text-slate-400">To: rohit@abcinteriors.co</span>
                  </div>

                  <p className="font-semibold text-slate-200">
                    Subject: Quick check-in regarding Invoice #INV-1042 (ABC Interiors)
                  </p>

                  <p className="text-slate-400 leading-relaxed text-[11px] font-sans">
                    Hi Rohit, hope you&apos;re having a productive week! Just following up on invoice #INV-1042 for ₹75,000 covering the recent commercial deliverables. Could you please confirm if this is queued for the upcoming payment run? Let me know if you need another copy of the statement.
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Auto-stops if client replies or marks paid
                    </span>
                    <button
                      onClick={() => navigate('/app/dashboard')}
                      className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition"
                    >
                      Approve & Send &rarr;
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 CORE PILLARS SECTION */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Built for Service Businesses Who Value Relationships
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Generic automated debt-collection destroys client goodwill. InvoiceChaser crafts custom, respectful reminders.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">1. Automatic Workflow Detection</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Connect your Gmail or Google Sheets once. InvoiceChaser extracts invoice numbers, recipient contacts, amounts, and payment due dates without any manual data re-entry.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">2. Relationship-Aware Tone Matching</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tag clients as VIP, Regular, Delicate, or Late Payer. Gemini 3.7 generates customized emails that preserve client trust while ensuring your payment is prioritized.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">3. Ironclad Stop Engine</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              The moment a payment arrives or an invoice is marked paid in your sheet, all future scheduled reminders immediately halt. Zero embarrassing double follow-ups.
            </p>
          </div>
        </div>
      </section>

      {/* ROI & IMPACT NUMBERS */}
      <section className="bg-slate-900 text-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-4xl sm:text-5xl font-black text-indigo-400">62%</p>
              <p className="text-sm font-semibold text-slate-300 mt-2">Faster Payment Recovery</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Invoices paid in 6.4 days average compared to 17 days without automation.
              </p>
            </div>

            <div>
              <p className="text-4xl sm:text-5xl font-black text-emerald-400">0 hrs</p>
              <p className="text-sm font-semibold text-slate-300 mt-2">Time Spent Writing Follow-ups</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                No awkward drafting, spreadsheet checking, or calendar reminder tagging.
              </p>
            </div>

            <div>
              <p className="text-4xl sm:text-5xl font-black text-purple-400">100%</p>
              <p className="text-sm font-semibold text-slate-300 mt-2">Human Review Guardrail</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Review Before Send mode ensures you always have the final approving word.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA BANNER */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8 sm:p-12 text-center shadow-lg space-y-5">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Start Collecting Outstanding Invoices Today
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            Free forever for up to 5 active invoices. Connect your Google Workspace account in under 2 minutes.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/app/dashboard')}
              className="rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition active:scale-[0.99]"
            >
              Launch InvoiceChaser Free &rarr;
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
