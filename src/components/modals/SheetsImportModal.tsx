import React, { useState } from 'react';
import { X, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, Download } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';

interface SheetsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (count: number) => void;
}

export const SheetsImportModal: React.FC<SheetsImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { organization, importInvoicesFromSheets, connections } = useApp();

  const [step, setStep] = useState<'SHEET_SELECT' | 'COLUMN_MAP' | 'PREVIEW'>('PREVIEW');
  const [selectedSheet, setSelectedSheet] = useState('Invoices_FY26');
  
  // Sample detected batch rows from linked Google Sheet
  const [mockRows, setMockRows] = useState([
    {
      invoiceNumber: 'INV-1048',
      clientName: 'Apex Logistics Ltd',
      clientEmail: 'finance@apexlogistics.in',
      amount: 82000,
      currency: organization.currency || 'INR',
      invoiceDate: '2026-08-12',
      dueDate: '2026-08-27',
      status: 'READY',
      notes: 'Warehouse automation system milestone 1',
    },
    {
      invoiceNumber: 'INV-1049',
      clientName: 'Saffron Media Group',
      clientEmail: 'billing@saffronmedia.com',
      amount: 125000,
      currency: organization.currency || 'INR',
      invoiceDate: '2026-08-18',
      dueDate: '2026-09-02',
      status: 'READY',
      notes: 'Monthly video production retainer',
    },
    {
      invoiceNumber: 'INV-1050',
      clientName: 'Horizon Architects',
      clientEmail: 'contact@horizonarch.co',
      amount: 60000,
      currency: organization.currency || 'INR',
      invoiceDate: '2026-08-22',
      dueDate: '2026-09-06',
      status: 'READY',
      notes: '3D spatial visualization package',
    },
    {
      invoiceNumber: 'INV-1042',
      clientName: 'ABC Interiors',
      clientEmail: 'rohit@abcinteriors.co',
      amount: 75000,
      currency: organization.currency || 'INR',
      invoiceDate: '2026-08-10',
      dueDate: '2026-08-25',
      status: 'DUPLICATE',
      notes: 'Already tracked in workspace',
    },
  ]);

  if (!isOpen) return null;

  const readyCount = mockRows.filter((r) => r.status === 'READY').length;
  const duplicateCount = mockRows.filter((r) => r.status === 'DUPLICATE').length;

  const handleImport = () => {
    const validRows = mockRows.filter((r) => r.status === 'READY');
    const result = importInvoicesFromSheets(validRows);
    onClose();
    if (onSuccess) onSuccess(result.count);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2d382b]/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl border border-[#e6dfd3] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#efeae1]">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef3ec] text-[#3e6b36]">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#3c473a]">Import Invoices from Google Sheet</h3>
              <p className="text-xs text-[#637061]">Connected Sheet: &ldquo;Apex_Studio_Invoices_FY26&rdquo;</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#8b9789] hover:bg-[#f8f5ee] hover:text-[#3c473a]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sync Summary Banner */}
        <div className="mt-4 rounded-xl border border-[#c5dcc0] bg-[#e7f0e4]/80 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-[#3e6b36] shrink-0" />
            <div>
              <p className="text-xs font-bold text-[#203a1d]">
                Found {mockRows.length} invoice rows in worksheet &ldquo;Active Invoices&rdquo;
              </p>
              <p className="text-[11px] text-[#345330] mt-0.5">
                {readyCount} new invoices ready for tracking &bull; {duplicateCount} already tracked (will be skipped)
              </p>
            </div>
          </div>
        </div>

        {/* Rows Table */}
        <div className="mt-4 overflow-hidden rounded-xl border border-[#ded6c7] bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#ded6c7] bg-[#f8f5ee] font-semibold text-[#637061]">
              <tr>
                <th className="py-2.5 px-3">Invoice #</th>
                <th className="py-2.5 px-3">Client</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3 text-right">Validation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#efeae1]">
              {mockRows.map((r, idx) => (
                <tr key={idx} className={r.status === 'DUPLICATE' ? 'bg-[#f8f5ee]/50 opacity-60' : 'hover:bg-[#f8f5ee]/80'}>
                  <td className="py-2.5 px-3 font-semibold text-[#3c473a]">{r.invoiceNumber}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-[#3c473a]">{r.clientName}</div>
                    <div className="text-[10px] text-[#8b9789]">{r.clientEmail}</div>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[#3c473a]">
                    {formatCurrency(r.amount, r.currency)}
                  </td>
                  <td className="py-2.5 px-3 text-[#637061]">{r.dueDate}</td>
                  <td className="py-2.5 px-3 text-right">
                    {r.status === 'READY' ? (
                      <span className="rounded-full bg-[#e7f0e4] px-2 py-0.5 text-[10px] font-bold text-[#2d4d29] border border-[#c5dcc0]">
                        Ready
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#f2ede4] px-2 py-0.5 text-[10px] font-semibold text-[#637061]">
                        Duplicate
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal Actions */}
        <div className="mt-6 flex items-center justify-between pt-4 border-t border-[#efeae1]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-[#637061] hover:bg-[#f8f5ee] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="flex items-center gap-2 rounded-lg bg-[#3c473a] px-5 py-2 text-xs font-bold text-[#fdfaf5] shadow-sm transition hover:bg-[#2d372b] active:scale-[0.99]"
          >
            <Download className="h-4 w-4" />
            <span>Import {readyCount} Invoices to Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
};
