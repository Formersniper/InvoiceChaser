import React, { useState } from 'react';
import {
  Clock,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  Filter,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ReminderStatus, Reminder } from '../../types';
import { formatDate, formatDateTime, formatCurrency } from '../../utils/formatters';
import { ReviewReminderModal } from '../../components/modals/ReviewReminderModal';

interface RemindersPageProps {
  navigate: (path: string) => void;
}

export const RemindersPage: React.FC<RemindersPageProps> = ({ navigate }) => {
  const { reminders, invoices, clients, cancelReminder } = useApp();

  const [activeTab, setActiveTab] = useState<string>('PENDING');
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);

  const pendingReminders = reminders.filter((r) => r.status === 'PENDING_APPROVAL');
  const scheduledReminders = reminders.filter((r) => r.status === 'SCHEDULED');
  const sentReminders = reminders.filter((r) => r.status === 'SENT');
  const cancelledReminders = reminders.filter((r) => r.status === 'CANCELLED');

  const tabs = [
    { id: 'PENDING', label: 'Pending Review', count: pendingReminders.length },
    { id: 'SCHEDULED', label: 'Scheduled Queue', count: scheduledReminders.length },
    { id: 'SENT', label: 'Sent History', count: sentReminders.length },
    { id: 'CANCELLED', label: 'Cancelled / Stopped', count: cancelledReminders.length },
  ];

  const currentList =
    activeTab === 'PENDING'
      ? pendingReminders
      : activeTab === 'SCHEDULED'
      ? scheduledReminders
      : activeTab === 'SENT'
      ? sentReminders
      : cancelledReminders;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reminder Intelligence Queue</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review, approve, and track all automated and AI-generated accounts-receivable communications.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === t.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{t.label}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeTab === t.id ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Reminder Cards / Table */}
      <div className="space-y-3">
        {currentList.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            No reminders in this queue.
          </div>
        ) : (
          currentList.map((rem) => {
            const invoice = invoices.find((i) => i.id === rem.invoiceId);
            const client = clients.find((c) => c.id === rem.clientId);

            return (
              <div
                key={rem.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 items-center rounded bg-indigo-50 px-2 text-xs font-bold text-indigo-700">
                      #{rem.sequenceNumber} &bull; {rem.tone || 'PROFESSIONAL'}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{rem.subject}</h4>
                      <p className="text-xs text-slate-500">
                        For {client?.companyName || 'Client'} &bull; Invoice #{invoice?.invoiceNumber}{' '}
                        ({invoice ? formatCurrency(invoice.invoiceAmount, invoice.currency) : ''})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {rem.status === 'PENDING_APPROVAL' && (
                      <>
                        <button
                          onClick={() => cancelReminder(rem.id, 'Cancelled by user in queue')}
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                        >
                          Skip
                        </button>
                        <button
                          onClick={() => setSelectedReminder(rem)}
                          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-xs"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Review & Send</span>
                        </button>
                      </>
                    )}

                    {rem.status === 'SENT' && (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                        Dispatched on {formatDate(rem.sentAt || rem.updatedAt)}
                      </span>
                    )}

                    {rem.status === 'CANCELLED' && (
                      <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                        <XCircle className="h-4 w-4" />
                        Cancelled ({rem.cancellationReason || 'Invoice Settled'})
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 bg-slate-50 p-3 rounded-xl border border-slate-100 font-sans">
                    {rem.body}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ReviewReminderModal
        isOpen={!!selectedReminder}
        onClose={() => setSelectedReminder(null)}
        reminder={selectedReminder}
      />
    </div>
  );
};
