import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Pause,
  Play,
  ShieldAlert,
  Send,
  Sparkles,
  Mail,
  Edit,
  Trash2,
  Building2,
  User,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate, formatDateTime, getStatusBadgeInfo, getRelationshipBadge } from '../../utils/formatters';
import { ReviewReminderModal } from '../../components/modals/ReviewReminderModal';
import { Reminder } from '../../types';

interface InvoiceDetailPageProps {
  invoiceId: string;
  navigate: (path: string) => void;
}

export const InvoiceDetailPage: React.FC<InvoiceDetailPageProps> = ({ invoiceId, navigate }) => {
  const {
    invoices,
    clients,
    reminders,
    emailEvents,
    organization,
    markInvoicePaid,
    pauseInvoice,
    resumeInvoice,
    toggleDisputeInvoice,
    deleteInvoice,
    generateAiReminder,
  } = useApp();

  const [selectedReminderForReview, setSelectedReminderForReview] = useState<Reminder | null>(null);
  const [isGeneratingNextReminder, setIsGeneratingNextReminder] = useState(false);

  const invoice = invoices.find((i) => i.id === invoiceId);

  if (!invoice) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm font-bold text-slate-900">Invoice not found</p>
        <button
          onClick={() => navigate('/app/invoices')}
          className="text-xs font-semibold text-indigo-600 hover:underline"
        >
          &larr; Back to Invoices
        </button>
      </div>
    );
  }

  const client = clients.find((c) => c.id === invoice.clientId);
  const badge = getStatusBadgeInfo(invoice.status);
  const relationshipBadge = client ? getRelationshipBadge(client.relationshipType) : null;

  // Filter email communication events for this specific invoice
  const relatedEmails = emailEvents.filter((e) => e.invoiceId === invoice.id);
  const relatedReminders = reminders.filter((r) => r.invoiceId === invoice.id);

  const handleGenerateNextDraft = async () => {
    setIsGeneratingNextReminder(true);
    try {
      const nextSeq = (Math.min(3, invoice.reminderCount + 1)) as 1 | 2 | 3;
      const draft = await generateAiReminder({
        invoiceId: invoice.id,
        sequenceNumber: nextSeq,
      });

      const tempReminder: Reminder = {
        id: `rem_draft_${Date.now()}`,
        organizationId: organization.id,
        invoiceId: invoice.id,
        clientId: invoice.clientId,
        sequenceNumber: nextSeq,
        scheduledAt: new Date().toISOString(),
        status: 'PENDING_APPROVAL',
        tone: draft.tone as any || 'PROFESSIONAL',
        subject: draft.subject,
        body: draft.body,
        aiGenerated: true,
        approvedByUser: false,
        requiresReview: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setSelectedReminderForReview(tempReminder);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingNextReminder(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/app/invoices')}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Invoices</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {invoice.status !== 'PAID' ? (
            <>
              <button
                onClick={() => markInvoicePaid(invoice.id)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs active:scale-[0.99]"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Mark as Paid</span>
              </button>

              {invoice.isPaused ? (
                <button
                  onClick={() => resumeInvoice(invoice.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <Play className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Resume Reminders</span>
                </button>
              ) : (
                <button
                  onClick={() => pauseInvoice(invoice.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <Pause className="h-3.5 w-3.5 text-amber-600" />
                  <span>Pause Reminders</span>
                </button>
              )}

              <button
                onClick={() => toggleDisputeInvoice(invoice.id, invoice.status !== 'DISPUTED')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border transition ${
                  invoice.status === 'DISPUTED'
                    ? 'border-orange-300 bg-orange-50 text-orange-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5 text-orange-500" />
                <span>{invoice.status === 'DISPUTED' ? 'Remove Disputed' : 'Mark Disputed'}</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Paid on {formatDate(invoice.paymentReceivedAt || invoice.updatedAt)} &bull; Stop Engine Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Disputed Alert Banner if active */}
      {invoice.status === 'DISPUTED' && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-xs text-orange-900 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Automated follow-ups are halted</h4>
            <p className="mt-0.5 text-orange-800">
              This invoice is marked disputed. InvoiceChaser will not dispatch any reminders until the dispute is resolved and automation is resumed.
            </p>
          </div>
        </div>
      )}

      {/* Invoice Overview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Invoice Facts & Reminder Sequence */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Invoice
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badge.bg} ${badge.text} border ${badge.border}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                  #{invoice.invoiceNumber}
                </h2>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Due</span>
                <p className="text-3xl font-black text-slate-900 mt-0.5">
                  {formatCurrency(invoice.invoiceAmount, invoice.currency)}
                </p>
              </div>
            </div>

            {/* Facts Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 border-b border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Issue Date</span>
                <span className="font-semibold text-slate-900 mt-1 block">{formatDate(invoice.invoiceDate)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Due Date</span>
                <span className="font-semibold text-slate-900 mt-1 block">{formatDate(invoice.dueDate)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Overdue By</span>
                <span className={`font-bold mt-1 block ${invoice.daysOverdue > 0 && invoice.status !== 'PAID' ? 'text-rose-600' : 'text-slate-700'}`}>
                  {invoice.daysOverdue > 0 && invoice.status !== 'PAID' ? `${invoice.daysOverdue} days` : '0 days (On track)'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Ingestion Source</span>
                <span className="font-semibold text-slate-900 mt-1 block">{invoice.source}</span>
              </div>
            </div>

            {/* Client Card */}
            <div className="pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{invoice.companyName}</span>
                    {relationshipBadge && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${relationshipBadge.bg} ${relationshipBadge.text}`}>
                        {relationshipBadge.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{invoice.clientName} &bull; {invoice.clientEmail}</p>
                </div>
              </div>

              {client && (
                <button
                  onClick={() => navigate(`/app/clients/${client.id}`)}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  View Client Profile &rarr;
                </button>
              )}
            </div>
          </div>

          {/* 3-STAGE AUTOMATION TIMELINE */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Follow-up Sequence & Automation Timeline</h3>
                <p className="text-xs text-slate-500">3-tier relationship-aware reminder schedule</p>
              </div>

              {invoice.status !== 'PAID' && (
                <button
                  onClick={handleGenerateNextDraft}
                  disabled={isGeneratingNextReminder}
                  className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{isGeneratingNextReminder ? 'Drafting…' : 'Generate AI Reminder Draft'}</span>
                </button>
              )}
            </div>

            <div className="mt-6 space-y-6">
              {/* Event 0: Detection */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="h-full w-0.5 bg-slate-200 my-1" />
                </div>
                <div className="pb-4">
                  <span className="text-xs font-bold text-slate-900 block">Invoice Ingestion & Detection</span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Detected on {formatDateTime(invoice.createdAt)} via {invoice.source}.
                  </p>
                </div>
              </div>

              {/* Event 1: Reminder 1 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      invoice.reminderCount >= 1
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    1
                  </div>
                  <div className="h-full w-0.5 bg-slate-200 my-1" />
                </div>
                <div className="pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Reminder #1: Polite Check-in</span>
                    {invoice.reminderCount >= 1 ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        Delivered
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        Scheduled
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {invoice.reminderCount >= 1
                      ? `Dispatched on ${formatDate(invoice.lastReminderAt || invoice.updatedAt)}.`
                      : 'Scheduled for +3 days after due date.'}
                  </p>
                </div>
              </div>

              {/* Event 2: Reminder 2 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      invoice.reminderCount >= 2
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    2
                  </div>
                  <div className="h-full w-0.5 bg-slate-200 my-1" />
                </div>
                <div className="pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Reminder #2: Firm Follow-up</span>
                    {invoice.reminderCount >= 2 ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        Delivered
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        Pending Cadence
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {invoice.reminderCount >= 2
                      ? `Dispatched via Gmail.`
                      : 'Scheduled for +10 days after due date.'}
                  </p>
                </div>
              </div>

              {/* Event 3: Final Notice */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      invoice.reminderCount >= 3
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    3
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Reminder #3: Final Notice</span>
                    {invoice.reminderCount >= 3 ? (
                      <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                        Delivered
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        Pending
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Final clear notice prior to executive escalation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Email Communications Log & Next Action */}
        <div className="space-y-6">
          {/* Next Action Box */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 uppercase tracking-wider">
              <Clock className="h-4 w-4 text-indigo-600" />
              <span>Next Automated Action</span>
            </div>
            {invoice.status === 'PAID' ? (
              <p className="text-xs text-slate-600 mt-2 font-medium">
                No future actions scheduled. Invoice is settled and reminders are closed.
              </p>
            ) : invoice.isPaused ? (
              <p className="text-xs text-amber-700 mt-2 font-medium">
                Automation paused by user. Resume to schedule next reminder.
              </p>
            ) : (
              <div className="mt-2">
                <p className="text-sm font-bold text-slate-900">
                  {invoice.reminderCount === 0
                    ? 'Reminder #1 Trigger'
                    : invoice.reminderCount === 1
                    ? 'Reminder #2 Trigger'
                    : 'Final Notice Trigger'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Scheduled for {formatDate(invoice.nextReminderAt || invoice.dueDate)} at 10:00 AM.
                </p>
              </div>
            )}
          </div>

          {/* Email Events Thread */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" />
              <span>Communication History</span>
            </h3>

            {relatedEmails.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No emails logged for this invoice yet.
              </p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {relatedEmails.map((evt) => (
                  <div key={evt.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        {evt.direction === 'OUTBOUND' ? 'Sent Reminder' : 'Client Inbound Reply'}
                      </span>
                      <span className="text-[10px] text-slate-400">{formatDate(evt.eventTimestamp)}</span>
                    </div>
                    <p className="font-semibold text-slate-700 text-[11px] truncate">{evt.subject}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{evt.bodyPreview}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ReviewReminderModal
        isOpen={!!selectedReminderForReview}
        onClose={() => setSelectedReminderForReview(null)}
        reminder={selectedReminderForReview}
      />
    </div>
  );
};
