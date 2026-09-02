import React, { useState } from 'react';
import {
  Mail,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../utils/formatters';

export const ConnectionsPage: React.FC = () => {
  const {
    connections,
    user,
    disconnectConnection,
    triggerManualSync,
  } = useApp();

  const [isSyncing, setIsSyncing] = useState(false);
  const [disconnectModalTarget, setDisconnectModalTarget] = useState<string | null>(null);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  const gmailConn = connections.find((c) => c.provider === 'GMAIL');
  const sheetsConn = connections.find((c) => c.provider === 'GOOGLE_SHEETS');

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      await triggerManualSync();
    } catch {
      // Ignored
    } finally {
      setTimeout(() => setIsSyncing(false), 800);
    }
  };

  const handleConnectClick = (provider: string) => {
    setOauthNotice(`Live ${provider} OAuth integration is scheduled for IC-V1.0.4. Fake authorization tokens have been disabled for production security.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Connected Integrations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage authorized Google Workspace tokens, invoice sheets, and background sync engines.
          </p>
        </div>

        <button
          onClick={handleSyncAll}
          disabled={isSyncing}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-indigo-600 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Synchronizing…' : 'Sync All Now'}</span>
        </button>
      </div>

      {oauthNotice && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-4 flex items-start justify-between gap-3 text-xs text-indigo-900">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <span>{oauthNotice}</span>
          </div>
          <button
            onClick={() => setOauthNotice(null)}
            className="text-xs font-bold text-indigo-700 hover:text-indigo-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gmail Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Gmail / Google Workspace</h3>
                  <p className="text-xs text-slate-500">Outgoing invoice detection & reminder sending</p>
                </div>
              </div>

              {gmailConn?.status === 'CONNECTED' ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Active
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                  Disconnected
                </span>
              )}
            </div>

            <div className="mt-5 space-y-2 rounded-xl bg-slate-50 p-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Connected Account:</span>
                <span className="font-semibold text-slate-800">
                  {gmailConn?.status === 'CONNECTED' ? (gmailConn.accountIdentifier || user.email) : 'None (OAuth Required)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-medium text-slate-700">
                  {gmailConn?.status === 'CONNECTED' && gmailConn?.lastSyncAt
                    ? `Active (${formatDate(gmailConn.lastSyncAt)})`
                    : 'Scheduled for IC-V1.0.4'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">OAuth Scopes:</span>
                <span className="font-mono text-[11px] text-slate-600">gmail.send, gmail.readonly</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            {gmailConn?.status === 'CONNECTED' ? (
              <button
                onClick={() => setDisconnectModalTarget('GMAIL')}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700"
              >
                Disconnect Gmail
              </button>
            ) : (
              <button
                onClick={() => handleConnectClick('Gmail')}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition"
              >
                Connect Gmail
              </button>
            )}
          </div>
        </div>

        {/* Google Sheets Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Google Sheets</h3>
                  <p className="text-xs text-slate-500">Live 2-way status and invoice sync</p>
                </div>
              </div>

              {sheetsConn?.status === 'CONNECTED' ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Active
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                  Disconnected
                </span>
              )}
            </div>

            <div className="mt-5 space-y-2 rounded-xl bg-slate-50 p-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Connected Account:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                  {sheetsConn?.status === 'CONNECTED' ? (sheetsConn.accountIdentifier || user.email) : 'None (OAuth Required)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-semibold text-slate-800">
                  {sheetsConn?.status === 'CONNECTED' ? 'Active' : 'Scheduled for IC-V1.0.4'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">OAuth Scopes:</span>
                <span className="font-mono text-[11px] text-slate-600">spreadsheets.readonly</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            {sheetsConn?.status === 'CONNECTED' ? (
              <button
                onClick={() => setDisconnectModalTarget('GOOGLE_SHEETS')}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700"
              >
                Disconnect Sheets
              </button>
            ) : (
              <button
                onClick={() => handleConnectClick('Google Sheets')}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
              >
                Connect Sheets
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Disconnect Warning Modal */}
      {disconnectModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-base font-bold text-slate-900">Disconnect {disconnectModalTarget}?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Disconnecting will pause automated reminder dispatches and stop importing new invoice data from this source. Existing tracked invoices will remain in your workspace.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setDisconnectModalTarget(null)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Keep Connected
              </button>
              <button
                onClick={() => {
                  disconnectConnection(disconnectModalTarget as any);
                  setDisconnectModalTarget(null);
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
              >
                Confirm Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
