import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MoreVertical,
  Eye,
  Pause,
  Play,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { InvoiceStatus, Invoice } from '../../types';
import { formatCurrency, formatDate, getStatusBadgeInfo } from '../../utils/formatters';
import { SheetsImportModal } from '../../components/modals/SheetsImportModal';

interface InvoicesPageProps {
  navigate: (path: string) => void;
  onOpenAddInvoice: () => void;
}

export const InvoicesPage: React.FC<InvoicesPageProps> = ({ navigate, onOpenAddInvoice }) => {
  const { invoices, markInvoicePaid, pauseInvoice, resumeInvoice, deleteInvoice } = useApp();

  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  const filters = [
    { id: 'ALL', label: 'All Invoices', count: invoices.length },
    { id: 'OVERDUE', label: 'Overdue', count: invoices.filter((i) => i.daysOverdue > 0 && i.status !== 'PAID').length },
    { id: 'DUE', label: 'Due Soon', count: invoices.filter((i) => i.status === 'DUE' && i.daysOverdue === 0).length },
    { id: 'REMINDERS', label: 'Reminded', count: invoices.filter((i) => i.status === 'REMINDER_1' || i.status === 'REMINDER_2' || i.status === 'FINAL_NOTICE').length },
    { id: 'PAID', label: 'Paid', count: invoices.filter((i) => i.status === 'PAID').length },
    { id: 'STOPPED', label: 'Paused / Stopped', count: invoices.filter((i) => i.status === 'STOPPED' || i.isPaused).length },
    { id: 'DISPUTED', label: 'Disputed', count: invoices.filter((i) => i.status === 'DISPUTED').length },
  ];

  const filteredInvoices = invoices.filter((inv) => {
    // Tab filter
    if (activeFilter === 'OVERDUE' && (inv.daysOverdue <= 0 || inv.status === 'PAID')) return false;
    if (activeFilter === 'DUE' && (inv.status !== 'DUE' || inv.daysOverdue > 0)) return false;
    if (activeFilter === 'REMINDERS' && !['REMINDER_1', 'REMINDER_2', 'FINAL_NOTICE'].includes(inv.status)) return false;
    if (activeFilter === 'PAID' && inv.status !== 'PAID') return false;
    if (activeFilter === 'STOPPED' && inv.status !== 'STOPPED' && !inv.isPaused) return false;
    if (activeFilter === 'DISPUTED' && inv.status !== 'DISPUTED') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNumber = inv.invoiceNumber.toLowerCase().includes(q);
      const matchClient = inv.clientName.toLowerCase().includes(q) || inv.companyName.toLowerCase().includes(q);
      const matchEmail = inv.clientEmail.toLowerCase().includes(q);
      if (!matchNumber && !matchClient && !matchEmail) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Invoice Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track receivables, inspect automated reminder cadences, and trigger immediate settlement.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Import from Sheet</span>
          </button>
          <button
            onClick={onOpenAddInvoice}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm transition active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" />
            <span>Track Invoice</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeFilter === f.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  activeFilter === f.id ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice or client…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none shadow-xs"
          />
        </div>
      </div>

      {/* Invoice Table (Desktop) & Cards (Mobile) */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {filteredInvoices.length === 0 ? (
          <div className="py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mx-auto mb-3">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No invoices match your filter</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Track your first invoice manually or connect your Google Sheet / Gmail to detect upcoming receivables automatically.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={onOpenAddInvoice}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition"
              >
                Track New Invoice
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 font-semibold text-slate-600">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reminders</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => {
                  const badge = getStatusBadgeInfo(inv.status);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <button
                          onClick={() => navigate(`/app/invoices/${inv.id}`)}
                          className="hover:text-indigo-600 hover:underline"
                        >
                          {inv.invoiceNumber}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div
                          onClick={() => navigate(`/app/invoices/${inv.id}`)}
                          className="font-semibold text-slate-900 cursor-pointer hover:text-indigo-600"
                        >
                          {inv.companyName}
                        </div>
                        <div className="text-[11px] text-slate-400">{inv.clientEmail}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {formatCurrency(inv.invoiceAmount, inv.currency)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{formatDate(inv.dueDate)}</div>
                        {inv.daysOverdue > 0 && inv.status !== 'PAID' && (
                          <span className="text-[10px] font-bold text-rose-600 block">
                            {inv.daysOverdue} days overdue
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text} border ${badge.border}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3].map((seq) => {
                            const isSent = inv.reminderCount >= seq;
                            return (
                              <span
                                key={seq}
                                title={`Reminder #${seq} ${isSent ? 'Sent' : 'Pending'}`}
                                className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                                  isSent
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                                }`}
                              >
                                {seq}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.status !== 'PAID' ? (
                            <button
                              onClick={() => markInvoicePaid(inv.id)}
                              className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition border border-emerald-200"
                              title="Mark as Paid (Halts reminder loop)"
                            >
                              Mark Paid
                            </button>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Paid
                            </span>
                          )}

                          <button
                            onClick={() => navigate(`/app/invoices/${inv.id}`)}
                            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title="View Invoice Detail"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SheetsImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
};
