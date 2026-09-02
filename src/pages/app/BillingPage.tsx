import React, { useState } from 'react';
import { CreditCard, CheckCircle2, Zap, ArrowRight, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SubscriptionPlan } from '../../types';

export const BillingPage: React.FC = () => {
  const { subscription, usage, updateSubscriptionPlan } = useApp();
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL');
  const [successMsg, setSuccessMsg] = useState('');

  const plans: {
    id: SubscriptionPlan;
    name: string;
    monthlyPrice: string;
    annualPrice: string;
    invoices: string;
    description: string;
    features: string[];
    isPopular?: boolean;
  }[] = [
    {
      id: 'FREE',
      name: 'Free Starter',
      monthlyPrice: '₹0',
      annualPrice: '₹0',
      invoices: '5 active invoices',
      description: 'Perfect for individual solo freelancers testing automated follow-ups.',
      features: [
        '5 Active Invoices at a time',
        'Manual + Sheets Import',
        'Review Before Send Mode',
        'Standard Email Follow-ups',
      ],
    },
    {
      id: 'STARTER',
      name: 'Professional Starter',
      monthlyPrice: '₹1,499',
      annualPrice: '₹1,199',
      invoices: '25 active invoices',
      description: 'Ideal for independent consultants, boutique studios, and contractors.',
      features: [
        '25 Active Invoices',
        'Full Gmail + Sheets 2-Way Sync',
        'Gemini 3.7 AI Generation',
        'Relationship Tagging (VIP/Delicate)',
        'Custom Cadence Policies',
      ],
    },
    {
      id: 'PROFESSIONAL',
      name: 'Growth Agency',
      monthlyPrice: '₹3,499',
      annualPrice: '₹2,799',
      invoices: '100 active invoices',
      description: 'For growing digital, design, and marketing agencies handling high volume.',
      isPopular: true,
      features: [
        '100 Active Invoices',
        'Unlimited AI Reminders',
        'Multi-user Team Access',
        'Traceable Audit Trail',
        'Priority Sync & Support',
        'Disputed Invoice Halting',
      ],
    },
    {
      id: 'BUSINESS',
      name: 'Agency Scale',
      monthlyPrice: '₹7,999',
      annualPrice: '₹6,399',
      invoices: 'Unlimited invoices',
      description: 'For multi-partner firms and high-turnover service organizations.',
      features: [
        'Unlimited Invoices & Clients',
        'Dedicated Workspace Instance',
        'Custom AI Prompt Injection',
        'Custom Integration Webhooks',
        'SLA Support Guarantee',
      ],
    },
  ];

  const handleSelectPlan = (planId: SubscriptionPlan) => {
    updateSubscriptionPlan(planId);
    setSuccessMsg(`Plan upgraded to ${planId} successfully!`);
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Subscription & Plan Usage</h1>
        <p className="text-xs text-slate-500 mt-1">
          Scale your accounts-receivable capacity. Change or upgrade your plan anytime.
        </p>
      </div>

      {successMsg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Current Usage Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Current Active Usage</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>Active Invoices Tracked</span>
              <span className="font-bold text-slate-900">
                {usage.activeInvoicesCount} / {subscription.limits.activeInvoices}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    (usage.activeInvoicesCount / subscription.limits.activeInvoices) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>Reminders Sent this Month</span>
              <span className="font-bold text-slate-900">{usage.remindersSentThisMonth} emails</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '28%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>Current Tier</span>
              <span className="font-bold text-indigo-700">{subscription.plan} Plan</span>
            </div>
            <p className="text-[11px] text-slate-400">Renews on 01 Oct 2026</p>
          </div>
        </div>
      </div>

      {/* Cycle Switcher */}
      <div className="flex justify-center pt-2">
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs">
          <button
            onClick={() => setBillingCycle('MONTHLY')}
            className={`rounded-lg px-4 py-1.5 font-bold transition ${
              billingCycle === 'MONTHLY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('ANNUAL')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 font-bold transition ${
              billingCycle === 'ANNUAL' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            <span>Annual</span>
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] text-emerald-800 font-bold">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => {
          const isCurrent = subscription.plan === p.id;
          return (
            <div
              key={p.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition ${
                isCurrent
                  ? 'border-indigo-600 bg-white ring-2 ring-indigo-600/20 shadow-md'
                  : p.isPopular
                  ? 'border-indigo-200 bg-white shadow-xs'
                  : 'border-slate-200 bg-white shadow-xs'
              }`}
            >
              <div>
                {p.isPopular && (
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-2 inline-block">
                    Most Popular
                  </span>
                )}
                <h3 className="font-bold text-slate-900 text-base">{p.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{p.description}</p>

                <div className="mt-4">
                  <span className="text-2xl font-black text-slate-900">
                    {billingCycle === 'ANNUAL' ? p.annualPrice : p.monthlyPrice}
                  </span>
                  <span className="text-xs text-slate-400">/mo</span>
                </div>

                <div className="mt-2 text-xs font-semibold text-indigo-600">{p.invoices}</div>

                <ul className="mt-5 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
                  {p.features.map((f, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full rounded-lg bg-slate-100 py-2 text-xs font-bold text-slate-600 cursor-default"
                  >
                    Current Active Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleSelectPlan(p.id)}
                    className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition active:scale-[0.99]"
                  >
                    Switch to {p.name}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
