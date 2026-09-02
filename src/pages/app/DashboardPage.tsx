import React, { useState } from 'react';
import {
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Clock,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  Send,
  Pause,
  Play,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate, getStatusBadgeInfo } from '../../utils/formatters';
import { ReviewReminderModal } from '../../components/modals/ReviewReminderModal';
import { Reminder } from '../../types';

interface DashboardPageProps {
  navigate: (path: string) => void;
  onOpenAddInvoice: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ navigate, onOpenAddInvoice }) => {
  const {
    invoices,
    reminders,
    organization,
    markInvoicePaid,
    pauseInvoice,
    resumeInvoice,
    auditLogs,
  } = useApp();

  const [selectedReminderForReview, setSelectedReminderForReview] = useState<Reminder | null>(null);

  // Dynamic real calculations
  const totalOutstanding = invoices
    .filter((i) => i.status !== 'PAID' && i.status !== 'STOPPED')
    .reduce((sum, i) => sum + i.invoiceAmount, 0);

  const totalOverdue = invoices
    .filter((i) => i.daysOverdue > 0 && i.status !== 'PAID')
    .reduce((sum, i) => sum + i.invoiceAmount, 0);

  const totalRecovered = invoices
    .filter((i) => i.status === 'PAID')
    .reduce((sum, i) => sum + i.invoiceAmount, 0);

  const activeInvoicesCount = invoices.filter((i) => i.status !== 'PAID').length;

  const remindersSentCount = reminders.filter((r) => r.status === 'SENT').length;
  const invoicesDueSoonCount = invoices.filter((i) => i.status === 'DUE' && i.daysOverdue === 0).length;
  const paidCount = invoices.filter((i) => i.status === 'PAID').length;
  const paymentRate = invoices.length > 0 ? Math.round((paidCount / invoices.length) * 100) : 100;

  const pendingReminders = reminders.filter((r) => r.status === 'PENDING_APPROVAL');
  const overdueInvoices = invoices.filter((i) => i.daysOverdue > 0 && i.status !== 'PAID');

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Metric row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">AR Intelligence Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Tracking {activeInvoicesCount} active receivables for {organization.name}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/app/reminders')}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition"
          >
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>Reminder Queue ({pendingReminders.length})</span>
          </button>
          <button
            onClick={onOpenAddInvoice}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm transition active:scale-[0.99]"
          >
            <span>+ Track Invoice</span>
          </button>
        </div>
      </div>

      {/* 4 PRIMARY METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Outstanding */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Outstanding</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900">
              {formatCurrency(totalOutstanding, organization.currency)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Across {activeInvoicesCount} open client invoices
            </p>
          </div>
        </div>

        {/* Overdue */}
        <div className="rounded-2xl border border-rose-200/80 bg-white p-5 shadow-xs ring-1 ring-rose-500/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Overdue Capital</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-rose-600">
              {formatCurrency(totalOverdue, organization.currency)}
            </h3>
            <p className="text-[11px] text-rose-700 mt-1 font-medium">
              {overdueInvoices.length} invoices past due date
            </p>
          </div>
        </div>

        {/* Recovered Money */}
        <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-xs ring-1 ring-emerald-500/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Money Recovered</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-emerald-700">
              {formatCurrency(totalRecovered, organization.currency)}
            </h3>
            <p className="text-[11px] text-emerald-800 mt-1 font-medium">
              Paid after InvoiceChaser tracking
            </p>
          </div>
        </div>

        {/* Active Invoices */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Invoices</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900">{activeInvoicesCount}</h3>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              {paymentRate}% overall payment settlement rate
            </p>
          </div>
        </div>
      </div>

      {/* SECONDARY STATS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
        <div className="flex items-center justify-between px-3 py-1.5 sm:border-r border-slate-200">
          <span className="text-slate-500">Reminders Sent</span>
          <span className="font-bold text-slate-900">{remindersSentCount} emails delivered</span>
        </div>
        <div className="flex items-center justify-between px-3 py-1.5 sm:border-r border-slate-200">
          <span className="text-slate-500">Invoices Due Soon</span>
          <span className="font-bold text-indigo-700">{invoicesDueSoonCount} upcoming</span>
        </div>
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-slate-500">Stop Engine Status</span>
          <span className="font-bold text-emerald-700 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Active & Guarded
          </span>
        </div>
      </div>

      {/* PENDING APPROVAL NOTIFICATION BOX */}
      {pendingReminders.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-950">
                  {pendingReminders.length} AI Follow-up{pendingReminders.length > 1 ? 's' : ''} Awaiting Approval
                </h4>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  Gemini has prepared relationship-aware reminder drafts based on verified invoice facts. Review and dispatch with a single click.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedReminderForReview(pendingReminders[0])}
                className="flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-black transition active:scale-[0.99]"
              >
                <span>Review Next ({pendingReminders[0].subject.substring(0, 24)}…)</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TWO COLUMN WORKSPACE: Overdue Invoices Table + Recent Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Overdue Invoices Watchlist */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Overdue Receivables Watchlist</h3>
              <p className="text-xs text-slate-500">Invoices requiring immediate attention or follow-up</p>
            </div>
            <button
              onClick={() => navigate('/app/invoices')}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              View all invoices &rarr;
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            {overdueInvoices.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                No overdue invoices right now. All receivables are up to date!
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 font-semibold text-slate-500">
                  <tr>
                    <th className="pb-2.5 font-bold">Client / Invoice</th>
                    <th className="pb-2.5 font-bold">Amount</th>
                    <th className="pb-2.5 font-bold">Due Date</th>
                    <th className="pb-2.5 font-bold">Status</th>
                    <th className="pb-2.5 text-right font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overdueInvoices.map((inv) => {
                    const badge = getStatusBadgeInfo(inv.status);
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 pr-2">
                          <div
                            onClick={() => navigate(`/app/invoices/${inv.id}`)}
                            className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer"
                          >
                            {inv.companyName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">#{inv.invoiceNumber}</div>
                        </td>
                        <td className="py-3 font-bold text-slate-900">
                          {formatCurrency(inv.invoiceAmount, inv.currency)}
                        </td>
                        <td className="py-3">
                          <div className="text-slate-700 font-medium">{formatDate(inv.dueDate)}</div>
                          <div className="text-[10px] font-bold text-rose-600">
                            {inv.daysOverdue} days overdue
                          </div>
                        </td>
                        <td className="py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text} border ${badge.border}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => markInvoicePaid(inv.id)}
                              title="Mark as Paid (Halts all reminders immediately)"
                              className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition border border-emerald-200"
                            >
                              Mark Paid
                            </button>
                            <button
                              onClick={() => navigate(`/app/invoices/${inv.id}`)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              title="View Invoice Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right 1 Col: Traceable Audit Trail Feed */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Live Activity Feed</h3>
              <p className="text-xs text-slate-500">Traceable system events</p>
            </div>
            <button
              onClick={() => navigate('/app/activity')}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Full Log
            </button>
          </div>

          <div className="mt-4 space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex gap-3 text-xs">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <Clock className="h-3 w-3" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 leading-snug">{log.message}</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {formatDate(log.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <ReviewReminderModal
        isOpen={!!selectedReminderForReview}
        onClose={() => setSelectedReminderForReview(null)}
        reminder={selectedReminderForReview}
      />
    </div>
  );
};
