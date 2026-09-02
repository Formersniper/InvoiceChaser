import React, { useState } from 'react';
import {
  Sparkles,
  Mail,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Clock,
  Zap,
  Sliders,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ReminderPolicyTier } from '../../types';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const {
    user,
    organization,
    connections,
    connectGmail,
    connectSheets,
    automationSettings,
    updateAutomationSettings,
    completeOnboarding,
  } = useApp();

  const [step, setStep] = useState<number>(1);
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [isConnectingSheets, setIsConnectingSheets] = useState(false);

  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState('Client Invoices FY26');
  const [selectedSheetTab, setSelectedSheetTab] = useState('Active Invoices');

  const [columnMapping, setColumnMapping] = useState({
    invoiceNumber: 'Column A (Invoice ID)',
    clientName: 'Column B (Client Name)',
    clientEmail: 'Column C (Email)',
    amount: 'Column D (Total Amount)',
    currency: 'Column E (Currency)',
    invoiceDate: 'Column F (Issue Date)',
    dueDate: 'Column G (Payment Due Date)',
    status: 'Column H (Status)',
    notes: 'Column I (Milestone Notes)',
  });

  const [chosenPolicy, setChosenPolicy] = useState<ReminderPolicyTier>('STANDARD');

  const gmailConn = connections.find((c) => c.provider === 'GMAIL');
  const sheetsConn = connections.find((c) => c.provider === 'GOOGLE_SHEETS');
  const isGmailDone = gmailConn?.status === 'CONNECTED';
  const isSheetsDone = sheetsConn?.status === 'CONNECTED';

  const handleConnectGmail = async () => {
    setIsConnectingGmail(true);
    await connectGmail(user.email);
    setIsConnectingGmail(false);
    setStep(3);
  };

  const handleConnectSheets = async () => {
    setIsConnectingSheets(true);
    await connectSheets('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', selectedSheetTab, columnMapping);
    setIsConnectingSheets(false);
    setStep(4);
  };

  const handleFinish = () => {
    updateAutomationSettings({
      policyTier: chosenPolicy,
      policyIntervals:
        chosenPolicy === 'GENTLE'
          ? { firstReminderDays: 7, secondReminderDays: 14, finalReminderDays: 30 }
          : chosenPolicy === 'FIRM'
          ? { firstReminderDays: 1, secondReminderDays: 5, finalReminderDays: 10 }
          : { firstReminderDays: 3, secondReminderDays: 10, finalReminderDays: 17 },
    });
    completeOnboarding();
    onComplete();
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            <span>Setup Step {step} of 7</span>
            <span>{Math.round((step / 7) * 100)}% Complete</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${(step / 7) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 1: Welcome */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-150 text-center sm:text-left">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-2">
              <Zap className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Welcome to InvoiceChaser AI
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
              InvoiceChaser watches your invoice workflow and follows up automatically when clients haven&apos;t paid. It integrates directly with your Gmail and Google Sheets so you never have to manually track or write payment follow-ups again.
            </p>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Automatic outgoing invoice detection</span>
              </div>
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Relationship-aware reminders generated via Gemini 3.7</span>
              </div>
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Stop Engine: All reminders immediately halt once paid</span>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={() => setStep(2)}
                className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition active:scale-[0.99]"
              >
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Connect Gmail */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <h2 className="text-xl font-bold text-slate-900">Step 2: Connect Gmail</h2>
            <p className="text-sm text-slate-600">
              Authorize InvoiceChaser to detect your outgoing invoice threads and send approved payment follow-ups on your behalf.
            </p>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Google Workspace / Gmail</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
                {isGmailDone ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Connected
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">○ Not connected</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>We never store your master Google credentials. OAuth tokens remain server-side.</span>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(1)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Back
              </button>
              <button
                onClick={handleConnectGmail}
                disabled={isConnectingGmail}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50"
              >
                <Mail className="h-4 w-4" />
                <span>{isConnectingGmail ? 'Authorizing Gmail…' : 'Connect Gmail & Continue'}</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Connect Google Sheets */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <h2 className="text-xl font-bold text-slate-900">Step 3: Connect Google Sheets</h2>
            <p className="text-sm text-slate-600">
              Connect your existing invoice tracking spreadsheet to automatically import invoices and listen for &ldquo;PAID&rdquo; status updates.
            </p>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Google Sheets Integration</p>
                  <p className="text-xs text-slate-500">Read-only spreadsheet synchronization</p>
                </div>
              </div>
              {isSheetsDone ? (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Connected
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-400">○ Ready to link</span>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(2)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Back
              </button>
              <button
                onClick={handleConnectSheets}
                disabled={isConnectingSheets}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>{isConnectingSheets ? 'Connecting Sheets…' : 'Connect Google Sheets'}</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Select Invoice Sheet */}
        {step === 4 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <h2 className="text-xl font-bold text-slate-900">Step 4: Select Spreadsheet & Worksheet</h2>
            <p className="text-sm text-slate-600">
              Choose which spreadsheet file and sheet tab contains your client invoice records.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase">Spreadsheet File</label>
                <select
                  value={selectedSpreadsheet}
                  onChange={(e) => setSelectedSpreadsheet(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none"
                >
                  <option value="Client Invoices FY26">Apex_Studio_Invoices_FY26.xlsx</option>
                  <option value="Agency Revenue 2026">Agency Revenue & Receivables 2026</option>
                  <option value="Consulting Accounts">Consulting Accounts Tracker</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase">Worksheet Tab</label>
                <select
                  value={selectedSheetTab}
                  onChange={(e) => setSelectedSheetTab(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none"
                >
                  <option value="Active Invoices">Active Invoices (Recommended)</option>
                  <option value="All Invoices 2026">All Invoices 2026</option>
                  <option value="Overdue Tracker">Overdue Tracker</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(3)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Back
              </button>
              <button
                onClick={() => setStep(5)}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
              >
                <span>Continue to Column Mapping</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Map Columns */}
        {step === 5 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <h2 className="text-xl font-bold text-slate-900">Step 5: Map Columns</h2>
            <p className="text-sm text-slate-600">
              Confirm that the columns in your sheet correspond to InvoiceChaser fields.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
              {Object.entries(columnMapping).map(([key, val]) => (
                <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <span className="text-xs font-semibold text-slate-800">{val}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(4)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Back
              </button>
              <button
                onClick={() => setStep(6)}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
              >
                <span>Confirm Mapping</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Reminder Policy */}
        {step === 6 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <h2 className="text-xl font-bold text-slate-900">Step 6: Choose Reminder Cadence</h2>
            <p className="text-sm text-slate-600">
              Select how aggressively reminders are scheduled following an invoice&apos;s due date.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'GENTLE' as ReminderPolicyTier,
                  title: 'Gentle',
                  intervals: '7 → 14 → 30 days',
                  desc: 'Ideal for creative retainers & enterprise clients with long payment terms.',
                },
                {
                  id: 'STANDARD' as ReminderPolicyTier,
                  title: 'Standard',
                  intervals: '3 → 10 → 17 days',
                  desc: 'Recommended for most consulting, design, and marketing agencies.',
                },
                {
                  id: 'FIRM' as ReminderPolicyTier,
                  title: 'Firm',
                  intervals: '1 → 5 → 10 days',
                  desc: 'Best for tight project milestones & fast turnaround deliverables.',
                },
              ].map((p) => (
                <div
                  key={p.id}
                  onClick={() => setChosenPolicy(p.id)}
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    chosenPolicy === p.id
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-600/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-bold text-slate-900">{p.title}</p>
                  <p className="text-xs font-mono font-bold text-indigo-700 mt-1">{p.intervals}</p>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(5)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Back
              </button>
              <button
                onClick={() => setStep(7)}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
              >
                <span>Review Activation</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 7: Review & Activate */}
        {step === 7 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <h2 className="text-xl font-bold text-slate-900">Step 7: Review & Activate</h2>
            <p className="text-sm text-slate-600">
              Your accounts-receivable assistant is configured and ready to monitor unpaid invoices.
            </p>

            <div className="rounded-xl border border-slate-200 bg-slate-50 divide-y divide-slate-200/70 text-xs">
              <div className="flex items-center justify-between p-3">
                <span className="text-slate-500 font-medium">Gmail Account</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {user.email} (Connected)
                </span>
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="text-slate-500 font-medium">Invoice Sheet</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {selectedSpreadsheet} ({selectedSheetTab})
                </span>
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="text-slate-500 font-medium">Reminder Policy</span>
                <span className="font-bold text-slate-900">{chosenPolicy} (Cadence active)</span>
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="text-slate-500 font-medium">Human Oversight</span>
                <span className="font-bold text-indigo-700">Review Before Send Enabled (Safe Mode)</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(6)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition active:scale-[0.99]"
              >
                <Sparkles className="h-4 w-4" />
                <span>Activate InvoiceChaser</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
