import React, { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Mail,
  ShieldCheck,
  Ban,
  CheckCircle2,
  DollarSign,
  FileText,
  Clock,
  Plus,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RelationshipType, CommunicationStyle } from '../../types';
import { formatCurrency, formatDate, getRelationshipBadge, getStatusBadgeInfo } from '../../utils/formatters';

interface ClientDetailPageProps {
  clientId: string;
  navigate: (path: string) => void;
  onOpenAddInvoice: () => void;
}

export const ClientDetailPage: React.FC<ClientDetailPageProps> = ({
  clientId,
  navigate,
  onOpenAddInvoice,
}) => {
  const { clients, invoices, organization, updateClient, deleteClient } = useApp();

  const client = clients.find((c) => c.id === clientId);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(client?.name || '');
  const [email, setEmail] = useState(client?.email || '');
  const [companyName, setCompanyName] = useState(client?.companyName || '');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>(
    client?.relationshipType || 'REGULAR'
  );
  const [neverContact, setNeverContact] = useState(client?.neverContact || false);
  const [preferredStyle, setPreferredStyle] = useState<CommunicationStyle>(
    client?.customCommunicationStyle || 'PROFESSIONAL'
  );
  const [notes, setNotes] = useState(client?.notes || '');

  if (!client) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm font-bold text-slate-900">Client not found</p>
        <button
          onClick={() => navigate('/app/clients')}
          className="text-xs font-semibold text-indigo-600 hover:underline"
        >
          &larr; Back to Clients
        </button>
      </div>
    );
  }

  const clientInvoices = invoices.filter((i) => i.clientId === client.id);
  const totalInvoiced = clientInvoices.reduce((sum, i) => sum + i.invoiceAmount, 0);
  const totalOutstanding = clientInvoices
    .filter((i) => i.status !== 'PAID')
    .reduce((sum, i) => sum + i.invoiceAmount, 0);
  const badge = getRelationshipBadge(client.relationshipType);

  const handleSave = () => {
    updateClient(client.id, {
      name: name.trim(),
      email: email.trim(),
      companyName: companyName.trim() || name.trim(),
      relationshipType,
      neverContact,
      customCommunicationStyle: preferredStyle,
      notes: notes.trim(),
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/app/clients')}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Clients</span>
        </button>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Edit2 className="h-3.5 w-3.5 text-slate-400" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition"
            >
              Save Changes
            </button>
          )}
        </div>
      </div>

      {/* Main Profile Info Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        {!isEditing ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 font-black text-indigo-700 text-lg">
                  {client.companyName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold text-slate-900">{client.companyName}</h2>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Primary Contact: {client.name} &bull; {client.email}
                  </p>
                </div>
              </div>

              {client.neverContact && (
                <div className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 border border-rose-200">
                  <Ban className="h-4 w-4" />
                  <span>Never Contact (Excluded from Reminders)</span>
                </div>
              )}
            </div>

            {/* Financial Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Lifetime Billed</span>
                <span className="text-lg font-black text-slate-900 mt-1 block">
                  {formatCurrency(totalInvoiced, organization.currency)}
                </span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Currently Outstanding</span>
                <span className={`text-lg font-black mt-1 block ${totalOutstanding > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {formatCurrency(totalOutstanding, organization.currency)}
                </span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Communication Style Preference</span>
                <span className="text-sm font-bold text-slate-800 mt-1 block">
                  {client.customCommunicationStyle || 'Standard Professional'}
                </span>
              </div>
            </div>

            {client.notes && (
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 text-xs text-slate-600">
                <span className="font-bold text-slate-700 block mb-1">Relationship Context & Notes:</span>
                <p>{client.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Edit Client Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Contact Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Relationship Type</label>
                <select
                  value={relationshipType}
                  onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="REGULAR">Regular Client</option>
                  <option value="VIP">VIP Client (High touch)</option>
                  <option value="NEW">New Client</option>
                  <option value="DELICATE">Delicate Relationship</option>
                  <option value="LATE_PAYER">Late Payer</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="chk-never-contact"
                checked={neverContact}
                onChange={(e) => setNeverContact(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
              <label htmlFor="chk-never-contact" className="font-semibold text-rose-700">
                Never Contact (Exclude this client entirely from automated reminder scheduling)
              </label>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Linked Invoices Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Invoices for {client.companyName}</h3>
            <p className="text-xs text-slate-500">History of tracked invoices and current status</p>
          </div>
          <button
            onClick={onOpenAddInvoice}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Track Invoice</span>
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          {clientInvoices.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">No invoices tracked for this client yet.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 font-semibold text-slate-500">
                <tr>
                  <th className="pb-2.5">Invoice #</th>
                  <th className="pb-2.5">Amount</th>
                  <th className="pb-2.5">Due Date</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientInvoices.map((inv) => {
                  const invBadge = getStatusBadgeInfo(inv.status);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 font-mono font-bold text-slate-900">
                        <button
                          onClick={() => navigate(`/app/invoices/${inv.id}`)}
                          className="hover:text-indigo-600 hover:underline"
                        >
                          {inv.invoiceNumber}
                        </button>
                      </td>
                      <td className="py-3 font-bold text-slate-900">
                        {formatCurrency(inv.invoiceAmount, inv.currency)}
                      </td>
                      <td className="py-3 text-slate-700">{formatDate(inv.dueDate)}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${invBadge.bg} ${invBadge.text} border ${invBadge.border}`}>
                          {invBadge.label}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => navigate(`/app/invoices/${inv.id}`)}
                          className="text-xs font-semibold text-indigo-600 hover:underline"
                        >
                          View Details &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
