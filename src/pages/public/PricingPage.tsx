import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

interface PricingPageProps {
  navigate: (path: string) => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ navigate }) => {
  const [cycle, setCycle] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL');

  const tiers = [
    {
      name: 'Free Forever',
      monthlyPrice: '₹0',
      annualPrice: '₹0',
      invoices: '5 active invoices',
      desc: 'For freelancers testing automated follow-ups.',
      features: [
        '5 Active Invoices at any time',
        'Manual & Sheets Import',
        'Review Before Send Mode',
        'Stop Engine Protection',
      ],
      cta: 'Get Started Free',
    },
    {
      name: 'Starter',
      monthlyPrice: '₹1,499',
      annualPrice: '₹1,199',
      invoices: '25 active invoices',
      desc: 'For independent consultants and boutique agencies.',
      features: [
        '25 Active Invoices',
        'Gmail & Google Sheets Sync',
        'Gemini 3.7 AI Follow-ups',
        'VIP & Delicate Relationship Tags',
        'Custom Cadence Schedules',
      ],
      cta: 'Start 14-Day Free Trial',
    },
    {
      name: 'Agency Pro',
      monthlyPrice: '₹3,499',
      annualPrice: '₹2,799',
      invoices: '100 active invoices',
      isPopular: true,
      desc: 'For growing creative, design, & tech agencies.',
      features: [
        '100 Active Invoices',
        'Unlimited AI Reminders',
        'Team Member Permissions',
        'Disputed Invoice Safeguard',
        'Traceable Audit Trail',
        'Priority Technical Support',
      ],
      cta: 'Start 14-Day Free Trial',
    },
    {
      name: 'Agency Scale',
      monthlyPrice: '₹7,999',
      annualPrice: '₹6,399',
      invoices: 'Unlimited invoices',
      desc: 'For high-volume multi-partner firms.',
      features: [
        'Unlimited Invoices & Clients',
        'Custom Prompt Injection',
        'Webhook Integrations',
        'Multi-Tenant Workspace',
        'Dedicated Account Specialist',
      ],
      cta: 'Contact Sales',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          Simple, Predictable Pricing
        </h1>
        <p className="text-base text-slate-600 leading-relaxed">
          Recover thousands in delayed payments for a fraction of the cost of manual bookkeeping.
        </p>

        {/* Toggle */}
        <div className="pt-4 flex justify-center">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
            <button
              onClick={() => setCycle('MONTHLY')}
              className={`rounded-lg px-4 py-1.5 transition ${
                cycle === 'MONTHLY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setCycle('ANNUAL')}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 transition ${
                cycle === 'ANNUAL' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500'
              }`}
            >
              <span>Annual Billing</span>
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] text-emerald-800 font-bold">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map((t, idx) => (
          <div
            key={idx}
            className={`rounded-2xl border p-6 flex flex-col justify-between transition ${
              t.isPopular
                ? 'border-indigo-600 bg-white ring-2 ring-indigo-600/20 shadow-md'
                : 'border-slate-200 bg-white shadow-xs'
            }`}
          >
            <div>
              {t.isPopular && (
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-2 inline-block">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-bold text-slate-900">{t.name}</h3>
              <p className="text-xs text-slate-500 mt-1">{t.desc}</p>

              <div className="mt-4">
                <span className="text-3xl font-black text-slate-900">
                  {cycle === 'ANNUAL' ? t.annualPrice : t.monthlyPrice}
                </span>
                <span className="text-xs text-slate-400">/month</span>
              </div>

              <div className="mt-2 text-xs font-semibold text-indigo-600">{t.invoices}</div>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-5">
                {t.features.map((f, fIdx) => (
                  <li key={fIdx} className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100">
              <button
                onClick={() => navigate('/app/dashboard')}
                className={`w-full rounded-xl py-2.5 text-xs font-bold transition shadow-xs ${
                  t.isPopular
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {t.cta}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
