import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Building2,
  Calendar,
  DollarSign,
  ShieldCheck,
  Edit3,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Reminder, Invoice, Client, CommunicationStyle } from '../../types';
import { formatCurrency, formatDate, getRelationshipBadge } from '../../utils/formatters';

interface ReviewReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminder: Reminder | null;
  onSuccess?: () => void;
}

export const ReviewReminderModal: React.FC<ReviewReminderModalProps> = ({
  isOpen,
  onClose,
  reminder,
  onSuccess,
}) => {
  const {
    invoices,
    clients,
    organization,
    approveAndSendReminder,
    generateAiReminder,
    cancelReminder,
  } = useApp();

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [tone, setTone] = useState<CommunicationStyle>('PROFESSIONAL');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [aiReasoning, setAiReasoning] = useState<string>('');

  const invoice = invoices.find((i) => i.id === reminder?.invoiceId);
  const client = clients.find((c) => c.id === reminder?.clientId);

  useEffect(() => {
    if (reminder) {
      setSubject(reminder.subject);
      setBody(reminder.body);
      setTone(reminder.tone || 'PROFESSIONAL');
      setError('');
    }
  }, [reminder]);

  if (!isOpen || !reminder || !invoice) return null;

  const relationshipBadge = client ? getRelationshipBadge(client.relationshipType) : null;

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setError('');
    try {
      const generated = await generateAiReminder({
        invoiceId: invoice.id,
        sequenceNumber: reminder.sequenceNumber,
        style: tone,
        customInstructions: customInstructions.trim(),
      });
      setSubject(generated.subject);
      setBody(generated.body);
      if ((generated as any).reasoning) {
        setAiReasoning((generated as any).reasoning);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Regeneration failed';
      setError(msg);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Subject and body cannot be empty.');
      return;
    }
    setIsSending(true);
    setError('');
    try {
      const success = await approveAndSendReminder(reminder.id, subject, body);
      if (success) {
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setError('Invoice is either paid, disputed, or recipient is excluded.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send';
      setError(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2d382b]/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl border border-[#e6dfd3] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#efeae1]">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 items-center rounded-md bg-[#eef3ec] px-2 text-xs font-bold text-[#345330]">
                Reminder #{reminder.sequenceNumber}
              </span>
              <h3 className="text-base font-bold text-[#3c473a]">Review & Approve Payment Follow-up</h3>
            </div>
            <p className="text-xs text-[#637061] mt-1">
              Verify the generated communication before it is dispatched via Gmail.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#8b9789] hover:bg-[#f8f5ee] hover:text-[#3c473a]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#fbeae7] p-3 text-xs font-semibold text-[#8e2e21] border border-[#f3c8c2]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Verified Facts Card (Safety Boundary) */}
        <div className="mt-4 rounded-xl border border-[#ded6c7] bg-[#f8f5ee] p-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#ded6c7]/60 text-xs font-bold text-[#3c473a]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#3e6b36]" />
              <span>Verified Facts Injected</span>
            </div>
            {relationshipBadge && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${relationshipBadge.bg} ${relationshipBadge.text}`}>
                {relationshipBadge.label}
              </span>
            )}
          </div>
          <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-[#8b9789] block text-[10px] uppercase font-bold">Invoice</span>
              <span className="font-semibold text-[#3c473a]">#{invoice.invoiceNumber}</span>
            </div>
            <div>
              <span className="text-[#8b9789] block text-[10px] uppercase font-bold">Amount Due</span>
              <span className="font-bold text-[#3c473a]">{formatCurrency(invoice.invoiceAmount, invoice.currency)}</span>
            </div>
            <div>
              <span className="text-[#8b9789] block text-[10px] uppercase font-bold">Due Date</span>
              <span className="font-medium text-[#3c473a]">{formatDate(invoice.dueDate)}</span>
            </div>
            <div>
              <span className="text-[#8b9789] block text-[10px] uppercase font-bold">Overdue Status</span>
              <span className="font-bold text-[#8e2e21]">{invoice.daysOverdue} days overdue</span>
            </div>
          </div>
        </div>

        {/* Tone and AI parameters */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#ded6c7] bg-white p-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#637061]">Tone:</span>
            <div className="inline-flex rounded-lg border border-[#ded6c7] p-0.5 bg-[#fdfaf5] text-xs">
              {(['FRIENDLY', 'PROFESSIONAL', 'FIRM'] as CommunicationStyle[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  className={`rounded-md px-2.5 py-1 font-semibold transition ${
                    tone === t ? 'bg-white text-[#3c473a] shadow-xs' : 'text-[#637061] hover:text-[#3c473a]'
                  }`}
                >
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 rounded-lg border border-[#ded6c7] bg-[#f8f5ee] px-3 py-1.5 text-xs font-bold text-[#3c473a] hover:bg-[#ede7db] transition disabled:opacity-50"
          >
            <Sparkles className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin text-[#3c473a]' : ''}`} />
            <span>{isRegenerating ? 'Gemini Regenerating…' : 'Regenerate with AI'}</span>
          </button>
        </div>

        {aiReasoning && (
          <p className="mt-2 text-[11px] text-[#637061] italic">
            Gemini Note: {aiReasoning}
          </p>
        )}

        {/* Email Editor */}
        <div className="mt-4 space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs text-[#637061] mb-1">
              <span className="font-semibold">To:</span>
              <span className="font-mono text-[#3c473a]">{invoice.clientName} &lt;{invoice.clientEmail}&gt;</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#637061]">Subject Line</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#ded6c7] bg-[#fdfaf5] px-3 py-2 text-xs font-semibold text-[#3c473a] focus:border-[#566852] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#637061]">Email Message Body</label>
              <span className="text-[10px] text-[#8b9789]">Directly editable</span>
            </div>
            <textarea
              rows={7}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-lg border border-[#ded6c7] bg-[#fdfaf5] p-3 text-xs leading-relaxed text-[#3c473a] focus:border-[#566852] focus:bg-white focus:outline-none font-sans"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between pt-4 border-t border-[#efeae1]">
          <button
            type="button"
            onClick={() => {
              cancelReminder(reminder.id, 'Cancelled during review');
              onClose();
            }}
            className="text-xs font-semibold text-[#8e2e21] hover:underline"
          >
            Cancel this reminder
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-[#637061] hover:bg-[#f8f5ee] transition"
            >
              Keep Draft
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending}
              className="flex items-center gap-2 rounded-lg bg-[#3c473a] px-5 py-2 text-xs font-bold text-[#fdfaf5] shadow-sm transition hover:bg-[#2d372b] active:scale-[0.99] disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSending ? 'Sending via Gmail…' : 'Approve & Send via Gmail'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
