import React, { useState } from 'react';
import { X, Plus, AlertCircle, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RelationshipType } from '../../types';

interface AddInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (invoiceId: string) => void;
}

export const AddInvoiceModal: React.FC<AddInvoiceModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { clients, organization, addInvoice, addClient } = useApp();

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isNewClient, setIsNewClient] = useState(false);

  // New Client Fields
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');
  const [newRelationship, setNewRelationship] = useState<RelationshipType>('REGULAR');

  // Invoice Fields
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(organization.currency || 'INR');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [source, setSource] = useState<'MANUAL' | 'GMAIL' | 'GOOGLE_SHEETS'>('MANUAL');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!invoiceNumber.trim()) {
      setError('Invoice number is required.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid invoice amount.');
      return;
    }
    if (!dueDate) {
      setError('Due date is required.');
      return;
    }

    let finalClientId = selectedClientId;
    let clientName = '';
    let clientEmail = '';
    let companyName = '';

    if (isNewClient || !selectedClientId) {
      if (!newClientName.trim() || !newClientEmail.trim()) {
        setError('Please enter client name and valid email address.');
        return;
      }
      const created = addClient({
        name: newClientName.trim(),
        email: newClientEmail.trim(),
        companyName: newClientCompany.trim() || newClientName.trim(),
        relationshipType: newRelationship,
        neverContact: false,
      });
      finalClientId = created.id;
      clientName = created.name;
      clientEmail = created.email;
      companyName = created.companyName;
    } else {
      const client = clients.find((c) => c.id === selectedClientId);
      if (!client) {
        setError('Selected client not found.');
        return;
      }
      clientName = client.name;
      clientEmail = client.email;
      companyName = client.companyName;
    }

    const createdInvoice = addInvoice({
      clientId: finalClientId,
      clientName,
      clientEmail,
      companyName,
      invoiceNumber: invoiceNumber.trim().toUpperCase(),
      invoiceAmount: Number(amount),
      currency,
      invoiceDate,
      dueDate,
      status: new Date(dueDate) < new Date() ? 'OVERDUE' : 'DUE',
      source,
      reminderCount: 0,
      isPaused: false,
      extractionConfidence: 'HIGH',
      notes: notes.trim(),
    });

    onClose();
    if (onSuccess) onSuccess(createdInvoice.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2d382b]/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-2xl border border-[#e6dfd3] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#efeae1]">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef3ec] text-[#3c473a]">
              <FileText className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-[#3c473a]">Track New Invoice</h3>
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Client Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-[#637061]">Client</label>
              <button
                type="button"
                onClick={() => {
                  setIsNewClient(!isNewClient);
                  setSelectedClientId('');
                }}
                className="text-xs font-semibold text-[#3c473a] hover:underline"
              >
                {isNewClient ? '← Select Existing Client' : '+ Create New Client'}
              </button>
            </div>

            {!isNewClient ? (
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full rounded-lg border border-[#ded6c7] bg-[#fdfaf5] px-3 py-2 text-sm font-medium text-[#3c473a] focus:border-[#566852] focus:bg-white focus:outline-none"
              >
                <option value="">Select a client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName} ({c.name} - {c.email})
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-3 rounded-xl border border-[#ded6c7] bg-[#f8f5ee] p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#637061]">Contact Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Rohit Sharma"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#ded6c7] bg-white px-3 py-1.5 text-xs text-[#3c473a] focus:border-[#566852] focus:outline-none"
                      required={isNewClient}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#637061]">Company Name</label>
                    <input
                      type="text"
                      placeholder="e.g. ABC Interiors Ltd"
                      value={newClientCompany}
                      onChange={(e) => setNewClientCompany(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#ded6c7] bg-white px-3 py-1.5 text-xs text-[#3c473a] focus:border-[#566852] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#637061]">Email Address *</label>
                    <input
                      type="email"
                      placeholder="finance@abcinteriors.co"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#ded6c7] bg-white px-3 py-1.5 text-xs text-[#3c473a] focus:border-[#566852] focus:outline-none"
                      required={isNewClient}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#637061]">Relationship Classification</label>
                    <select
                      value={newRelationship}
                      onChange={(e) => setNewRelationship(e.target.value as RelationshipType)}
                      className="mt-1 w-full rounded-lg border border-[#ded6c7] bg-white px-3 py-1.5 text-xs text-[#3c473a] focus:border-[#566852] focus:outline-none"
                    >
                      <option value="REGULAR">Regular Client</option>
                      <option value="VIP">VIP Client (Extra courteous)</option>
                      <option value="NEW">New Client</option>
                      <option value="DELICATE">Delicate Relationship</option>
                      <option value="LATE_PAYER">Late Payer</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#637061]">Invoice Number *</label>
              <input
                type="text"
                placeholder="INV-1047"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#ded6c7] bg-[#fdfaf5] px-3 py-2 text-sm font-semibold text-[#3c473a] focus:border-[#566852] focus:bg-white focus:outline-none uppercase"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#637061]">Amount *</label>
              <input
                type="number"
                placeholder="50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#ded6c7] bg-[#fdfaf5] px-3 py-2 text-sm font-semibold text-[#3c473a] focus:border-[#566852] focus:bg-white focus:outline-none"
                required
                min="1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#637061]">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#ded6c7] bg-[#fdfaf5] px-3 py-2 text-sm font-medium text-[#3c473a] focus:border-[#566852] focus:bg-white focus:outline-none"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (CA$)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#637061]">Invoice Issue Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#ded6c7] bg-[#fdfaf5] px-3 py-2 text-sm text-[#3c473a] focus:border-[#566852] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#637061]">Due Date *</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#ded6c7] bg-[#fdfaf5] px-3 py-2 text-sm font-semibold text-[#3c473a] focus:border-[#566852] focus:bg-white focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#637061]">Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-[#ded6c7] bg-[#fdfaf5] px-3 py-2 text-sm text-[#3c473a] focus:border-[#566852] focus:bg-white focus:outline-none"
            >
              <option value="MANUAL">Manual Entry</option>
              <option value="GMAIL">Detected via Gmail</option>
              <option value="GOOGLE_SHEETS">Google Sheets Sync</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#637061]">Internal Notes / Milestone Description</label>
            <textarea
              rows={2}
              placeholder="e.g. Phase 2 frontend deliverables signoff."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#ded6c7] bg-[#fdfaf5] px-3 py-2 text-xs text-[#3c473a] focus:border-[#566852] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#efeae1]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-[#637061] hover:bg-[#f8f5ee] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-[#3c473a] px-5 py-2 text-sm font-semibold text-[#fdfaf5] shadow-sm transition hover:bg-[#2d372b] active:scale-[0.99]"
            >
              <Plus className="h-4 w-4" />
              <span>Save & Track Invoice</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
