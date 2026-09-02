import { InvoiceStatus, RelationshipType, ReminderStatus } from '../types';

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  try {
    const symbolMap: Record<string, string> = {
      INR: '₹',
      USD: '$',
      EUR: '€',
      GBP: '£',
      CAD: 'CA$',
      AUD: 'AU$',
    };

    const symbol = symbolMap[currency] || currency;
    const formatted = Math.abs(amount).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US');
    return `${amount < 0 ? '-' : ''}${symbol}${formatted}`;
  } catch {
    return `${currency} ${amount}`;
  }
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function getDaysOverdue(dueDateStr: string): number {
  if (!dueDateStr) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

export function getStatusBadgeInfo(status: InvoiceStatus): {
  label: string;
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case 'PAID':
      return {
        label: 'Paid',
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
      };
    case 'OVERDUE':
      return {
        label: 'Overdue',
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
      };
    case 'DUE':
      return {
        label: 'Due Soon',
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
      };
    case 'REMINDER_1':
      return {
        label: 'Reminder #1 Sent',
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
      };
    case 'REMINDER_2':
      return {
        label: 'Reminder #2 Sent',
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        border: 'border-indigo-200',
      };
    case 'FINAL_NOTICE':
      return {
        label: 'Final Notice',
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
      };
    case 'STOPPED':
      return {
        label: 'Stopped',
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-200',
      };
    case 'DISPUTED':
      return {
        label: 'Disputed',
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        border: 'border-orange-200',
      };
    case 'DRAFT':
      return {
        label: 'Draft',
        bg: 'bg-slate-50',
        text: 'text-slate-600',
        border: 'border-slate-200',
      };
    case 'SENT':
      return {
        label: 'Sent',
        bg: 'bg-sky-50',
        text: 'text-sky-700',
        border: 'border-sky-200',
      };
    case 'FAILED':
      return {
        label: 'Failed',
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
      };
    default:
      return {
        label: status,
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-200',
      };
  }
}

export function getRelationshipBadge(type: RelationshipType): {
  label: string;
  bg: string;
  text: string;
} {
  switch (type) {
    case 'VIP':
      return { label: 'VIP Client', bg: 'bg-purple-50', text: 'text-purple-700' };
    case 'REGULAR':
      return { label: 'Regular', bg: 'bg-slate-100', text: 'text-slate-700' };
    case 'NEW':
      return { label: 'New Client', bg: 'bg-blue-50', text: 'text-blue-700' };
    case 'DELICATE':
      return { label: 'Delicate', bg: 'bg-amber-50', text: 'text-amber-700' };
    case 'LATE_PAYER':
      return { label: 'Late Payer', bg: 'bg-rose-50', text: 'text-rose-700' };
    case 'DISPUTED':
      return { label: 'Disputed', bg: 'bg-orange-50', text: 'text-orange-700' };
    default:
      return { label: type, bg: 'bg-slate-100', text: 'text-slate-700' };
  }
}

export function getReminderStatusBadge(status: ReminderStatus): {
  label: string;
  bg: string;
  text: string;
} {
  switch (status) {
    case 'SENT':
      return { label: 'Sent', bg: 'bg-emerald-50', text: 'text-emerald-700' };
    case 'SCHEDULED':
      return { label: 'Scheduled', bg: 'bg-blue-50', text: 'text-blue-700' };
    case 'PENDING_APPROVAL':
      return { label: 'Needs Review', bg: 'bg-amber-50', text: 'text-amber-700' };
    case 'CANCELLED':
      return { label: 'Cancelled', bg: 'bg-slate-100', text: 'text-slate-600' };
    case 'FAILED':
      return { label: 'Failed', bg: 'bg-rose-50', text: 'text-rose-700' };
    case 'GENERATING':
      return { label: 'Generating', bg: 'bg-indigo-50', text: 'text-indigo-700' };
    default:
      return { label: status, bg: 'bg-slate-100', text: 'text-slate-700' };
  }
}
