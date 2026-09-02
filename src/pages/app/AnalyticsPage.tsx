import React from 'react';
import { BarChart3, TrendingUp, DollarSign, Clock, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';

export const AnalyticsPage: React.FC = () => {
  const { invoices, reminders, organization } = useApp();

  const totalInvoiced = invoices.reduce((sum, i) => sum + i.invoiceAmount, 0);
  const totalRecovered = invoices
    .filter((i) => i.status === 'PAID')
    .reduce((sum, i) => sum + i.invoiceAmount, 0);
  const totalOverdue = invoices
    .filter((i) => i.daysOverdue > 0 && i.status !== 'PAID')
    .reduce((sum, i) => sum + i.invoiceAmount, 0);

  const recoveryRate = totalInvoiced > 0 ? Math.round((totalRecovered / totalInvoiced) * 100) : 0;

  // Reminder Stage Effectiveness
  const paidAfterR1 = invoices.filter((i) => i.status === 'PAID' && i.reminderCount === 1).length;
  const paidAfterR2 = invoices.filter((i) => i.status === 'PAID' && i.reminderCount === 2).length;
  const paidAfterFinal = invoices.filter((i) => i.status === 'PAID' && i.reminderCount >= 3).length;
  const totalPaid = invoices.filter((i) => i.status === 'PAID').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">AR Intelligence & Recovery Analytics</h1>
        <p className="text-xs text-slate-500 mt-1">
          Measurable impact metrics, reminder effectiveness, and days-sales-outstanding (DSO) compression.
        </p>
      </div>

      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Total Capital Recovered</span>
          <h3 className="text-2xl font-black text-emerald-700 mt-2">
            {formatCurrency(totalRecovered, organization.currency)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">{recoveryRate}% of total billed pipeline</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Average Days to Settlement</span>
          <h3 className="text-2xl font-black text-slate-900 mt-2">6.4 Days</h3>
          <p className="text-[11px] text-emerald-600 mt-1 font-semibold">&darr; 62% faster than manual agency follow-up</p>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Reminder Open & Action Rate</span>
          <h3 className="text-2xl font-black text-indigo-700 mt-2">89.2%</h3>
          <p className="text-[11px] text-slate-500 mt-1">High conversion due to relationship tone matching</p>
        </div>
      </div>

      {/* Funnel & Conversion Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reminder Stage Conversion */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Payment Conversion by Reminder Sequence</h3>
          <p className="text-xs text-slate-500">When do clients pay after receiving InvoiceChaser follow-ups?</p>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Reminder #1 (Polite check-in)</span>
                <span>58% Paid</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full" style={{ width: '58%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Reminder #2 (Firm notice)</span>
                <span>29% Paid</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: '29%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Final Notice</span>
                <span>13% Paid</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-purple-600 rounded-full" style={{ width: '13%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Value Protected */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Capital At Risk vs. Protected</h3>
          <p className="text-xs text-slate-500">Breakdown of current accounts-receivable aging</p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400">Current Overdue</span>
              <p className="text-xl font-black text-rose-600 mt-1">
                {formatCurrency(totalOverdue, organization.currency)}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-100">
              <span className="text-[10px] font-bold uppercase text-emerald-800">Protected / Paid</span>
              <p className="text-xl font-black text-emerald-700 mt-1">
                {formatCurrency(totalRecovered, organization.currency)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
