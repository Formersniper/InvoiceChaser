import React, { useState } from 'react';
import { ChevronDown, HelpCircle, ArrowRight } from 'lucide-react';

interface FAQPageProps {
  navigate: (path: string) => void;
}

export const FAQPage: React.FC<FAQPageProps> = ({ navigate }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'What is InvoiceChaser AI?',
      a: 'InvoiceChaser is an automated, relationship-aware accounts-receivable follow-up assistant. It connects to your Gmail and Google Sheets to detect unpaid invoices and draft courteous, high-converting payment reminders tailored to each client.',
    },
    {
      q: 'Will my clients know I am using an automated tool?',
      a: 'No. Reminders are sent directly from your own authenticated Gmail address, maintain your natural tone and signature, and reference verified project deliverables. They look and read like handwritten emails from your team.',
    },
    {
      q: 'What happens when a client pays?',
      a: 'Our Stop Engine immediately halts all subsequent reminders the instant an invoice is marked paid or when an inbound payment confirmation is detected. You will never awkwardly remind a client who has already paid.',
    },
    {
      q: 'Can I review reminders before they are sent?',
      a: 'Yes. Safe Mode (Review Before Send) is enabled by default. Every drafted reminder appears in your queue for 1-click approval or custom edits.',
    },
    {
      q: 'Can I exclude specific VIP clients or partners?',
      a: 'Yes. You can mark any client with "Never Contact" to ensure they are completely bypassed by all automated reminder scheduling, or tag them as "VIP" for extra gentle follow-ups.',
    },
    {
      q: 'What if a client disputes an invoice?',
      a: 'You can toggle the invoice as "Disputed" with one click. This immediately suspends all automated reminder cadences until the dispute is resolved.',
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-sm text-slate-600">
          Everything you need to know about InvoiceChaser AI and how it recovers unpaid receivables.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs transition"
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="flex w-full items-center justify-between p-5 text-left text-sm font-bold text-slate-900 hover:bg-slate-50 transition"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-indigo-600' : ''}`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-center pt-6">
        <button
          onClick={() => navigate('/app/dashboard')}
          className="rounded-xl bg-indigo-600 px-8 py-3 text-xs font-bold text-white hover:bg-indigo-700 shadow-md transition"
        >
          Try InvoiceChaser Free &rarr;
        </button>
      </div>
    </div>
  );
};
