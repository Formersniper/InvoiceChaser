import React, { useState } from 'react';
import { X, FileSpreadsheet, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SheetsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (count: number) => void;
}

export const SheetsImportModal: React.FC<SheetsImportModalProps> = ({ isOpen, onClose }) => {
  const { connections } = useApp();
  const sheetsConn = connections.find((c) => c.provider === 'GOOGLE_SHEETS');
  const isConnected = sheetsConn?.status === 'CONNECTED';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Import Invoices from Google Sheets</h3>
              <p className="text-xs text-slate-500">Google Workspace Sync Integration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4 text-xs text-slate-600">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-4 flex items-start gap-3 text-indigo-900">
            <Info className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Live Google Sheets OAuth Sync in IC-V1.0.4</p>
              <p className="text-[11px] text-indigo-800 mt-1 leading-relaxed">
                Direct spreadsheet import requires live Google Workspace OAuth tokens. This feature is scheduled for the upcoming IC-V1.0.4 integration release.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/60 space-y-2">
            <p className="font-semibold text-slate-800">Current Workarounds:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
              <li>Use the <strong>&ldquo;New Invoice&rdquo;</strong> button on the dashboard to manually create invoices with automatic AI follow-up scheduling.</li>
              <li>Or create and manage your client directory directly from the Clients tab.</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
