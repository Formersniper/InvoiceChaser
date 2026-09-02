import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Building2,
  Mail,
  ShieldCheck,
  Ban,
  DollarSign,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RelationshipType, Client } from '../../types';
import { formatCurrency, getRelationshipBadge } from '../../utils/formatters';

interface ClientsPageProps {
  navigate: (path: string) => void;
}

export const ClientsPage: React.FC<ClientsPageProps> = ({ navigate }) => {
  const { clients, invoices, organization, addClient, updateClient } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Client State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('REGULAR');
  const [notes, setNotes] = useState('');

  const filteredClients = clients.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.companyName.toLowerCase().includes(q)
    );
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    addClient({
      name: name.trim(),
      email: email.trim(),
      companyName: companyName.trim() || name.trim(),
      relationshipType,
      neverContact: false,
      notes: notes.trim(),
    });

    setName('');
    setEmail('');
    setCompanyName('');
    setNotes('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Client Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage client relationship tags, communication style overrides, and exclusion policies.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm transition active:scale-[0.99]"
        >
          <Plus className="h-4 w-4" />
          <span>Add Client</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client or company…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none shadow-xs"
          />
        </div>
      </div>

      {/* Client Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => {
          const clientInvoices = invoices.filter((i) => i.clientId === client.id);
          const totalInvoiced = clientInvoices.reduce((sum, i) => sum + i.invoiceAmount, 0);
          const totalOutstanding = clientInvoices
            .filter((i) => i.status !== 'PAID')
            .reduce((sum, i) => sum + i.invoiceAmount, 0);
          const badge = getRelationshipBadge(client.relationshipType);

          return (
            <div
              key={client.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-700 text-sm">
                      {client.companyName.charAt(0)}
                    </div>
                    <div>
                      <h3
                        onClick={() => navigate(`/app/clients/${client.id}`)}
                        className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer text-sm"
                      >
                        {client.companyName}
                      </h3>
                      <p className="text-xs text-slate-500">{client.name}</p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text}`}
                  >
                    {badge.label}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span className="truncate">{client.email}</span>
                </div>

                {client.neverContact && (
                  <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 border border-rose-200">
                    <Ban className="h-3.5 w-3.5" />
                    <span>Excluded from automated reminders</span>
                  </div>
                )}

                {/* Financial Summary */}
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Billed</span>
                    <span className="font-bold text-slate-900">{formatCurrency(totalInvoiced, organization.currency)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Outstanding</span>
                    <span className={`font-bold ${totalOutstanding > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {formatCurrency(totalOutstanding, organization.currency)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  {clientInvoices.length} invoice{clientInvoices.length !== 1 ? 's' : ''} tracked
                </span>
                <button
                  onClick={() => navigate(`/app/clients/${client.id}`)}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  <span>Profile</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-4">Add New Client</h3>
            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Company / Organization *</label>
                <input
                  type="text"
                  placeholder="e.g. Zenith Media Ltd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Primary Contact Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Priya Nair"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email Address *</label>
                <input
                  type="email"
                  placeholder="priya@zenithmedia.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Relationship Classification</label>
                <select
                  value={relationshipType}
                  onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="REGULAR">Regular Client</option>
                  <option value="VIP">VIP Client (High touch, extra courteous)</option>
                  <option value="NEW">New Client (Warm introductory tone)</option>
                  <option value="DELICATE">Delicate (Polite, relationship preservation)</option>
                  <option value="LATE_PAYER">Late Payer (Direct, strict dates)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Prefers invoice copies attached with PO reference."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700 shadow-sm"
                >
                  Create Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
