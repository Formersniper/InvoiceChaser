import React, { useState } from 'react';
import { Copy, CheckCircle2, Sparkles, FileText } from 'lucide-react';

interface TemplatesPageProps {
  navigate: (path: string) => void;
}

export const TemplatesPage: React.FC<TemplatesPageProps> = ({ navigate }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const templates = [
    {
      id: 't1',
      stage: 'Reminder #1 (Due Soon / +3 Days)',
      tone: 'Friendly & Casual',
      relationship: 'VIP / Creative Retainers',
      subject: 'Quick check-in regarding Invoice #{invoice_number}',
      body: `Hi {client_name},\n\nHope you're having a wonderful week! Just following up on Invoice #{invoice_number} for {invoice_amount} covering the recent deliverables. Let me know if you need any additional documentation or if this is queued for payment.\n\nBest regards,\n{your_name}`,
    },
    {
      id: 't2',
      stage: 'Reminder #1 (Due Today)',
      tone: 'Standard Professional',
      relationship: 'Regular Clients',
      subject: 'Invoice #{invoice_number} due today ({invoice_amount})',
      body: `Hi {client_name},\n\nThis is a friendly reminder that Invoice #{invoice_number} for {invoice_amount} is due today ({due_date}).\n\nBank transfer details are attached to the original invoice for convenience. Please let me know once initiated.\n\nThank you,\n{your_name}`,
    },
    {
      id: 't3',
      stage: 'Reminder #2 (+10 Days Overdue)',
      tone: 'Direct & Professional',
      relationship: 'All Standard Clients',
      subject: 'Overdue Follow-up: Invoice #{invoice_number} ({days_overdue} days past due)',
      body: `Hi {client_name},\n\nI wanted to check on the payment status for Invoice #{invoice_number} ({invoice_amount}), which was due on {due_date} and is now {days_overdue} days overdue.\n\nPlease confirm when we can expect this transfer so we can update our financial records accordingly.\n\nRegards,\n{your_name}`,
    },
    {
      id: 't4',
      stage: 'Reminder #3 (Final Notice / +17 Days)',
      tone: 'Firm & Clear',
      relationship: 'Late Payers & Escaped Deadlines',
      subject: 'Urgent: Final Notice for Overdue Invoice #{invoice_number}',
      body: `Dear {client_name},\n\nDespite previous reminders, we have not received payment for Invoice #{invoice_number} ({invoice_amount}), due on {due_date}.\n\nPlease remit the outstanding balance of {invoice_amount} within 48 business hours or contact us immediately to prevent service suspension and account escalation.\n\nSincerely,\n{your_name}`,
    },
  ];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          Battle-Tested Follow-up Templates
        </h1>
        <p className="text-sm text-slate-600">
          High-converting payment reminder templates proven to preserve client relationships.
        </p>
      </div>

      <div className="space-y-6">
        {templates.map((tpl) => (
          <div key={tpl.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                  {tpl.stage}
                </span>
                <span className="text-xs font-medium text-slate-500">&bull; Tone: {tpl.tone}</span>
              </div>
              <button
                onClick={() => handleCopy(tpl.id, `Subject: ${tpl.subject}\n\n${tpl.body}`)}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                {copiedId === tpl.id ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-emerald-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy Template</span>
                  </>
                )}
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-800">
                <span className="text-slate-400">Subject:</span> {tpl.subject}
              </p>
              <pre className="mt-3 rounded-xl bg-slate-50 p-4 font-sans text-xs text-slate-700 whitespace-pre-wrap leading-relaxed border border-slate-100">
                {tpl.body}
              </pre>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-indigo-100 bg-indigo-50/40 p-8 text-center max-w-2xl mx-auto space-y-3">
        <h3 className="text-lg font-bold text-slate-900">Want Gemini to write personalized versions automatically?</h3>
        <p className="text-xs text-slate-600">
          InvoiceChaser uses these proven structures and merges real client data to draft unique messages in seconds.
        </p>
        <div className="pt-2">
          <button
            onClick={() => navigate('/app/dashboard')}
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm"
          >
            Launch Free App
          </button>
        </div>
      </div>
    </div>
  );
};
