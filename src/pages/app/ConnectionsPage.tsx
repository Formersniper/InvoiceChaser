import React, { useState, useEffect } from 'react';
import {
  Mail,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Info,
  ShieldCheck,
  Eye,
  ExternalLink,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../utils/formatters';
import { GmailMessagePreview, GmailTestResult } from '../../types';

export const ConnectionsPage: React.FC = () => {
  const {
    connections,
    user,
    disconnectConnection,
    disconnectGmail,
    initiateGmailOAuth,
    testGmailConnection,
    getRecentGmailMessages,
    triggerManualSync,
    refreshData,
    isAuthenticated,
  } = useApp();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [isTestingGmail, setIsTestingGmail] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const [testResult, setTestResult] = useState<GmailTestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testMessages, setTestMessages] = useState<GmailMessagePreview[] | null>(null);
  const [showMessagesModal, setShowMessagesModal] = useState(false);

  const [disconnectModalTarget, setDisconnectModalTarget] = useState<string | null>(null);
  const [oauthNotice, setOauthNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const gmailConn = connections.find((c) => c.provider === 'GMAIL');
  const sheetsConn = connections.find((c) => c.provider === 'GOOGLE_SHEETS');

  // Handle URL redirects from OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectedParam = params.get('connected');
    const errorParam = params.get('error');

    if (connectedParam === 'gmail') {
      setOauthNotice({
        type: 'success',
        message: 'Google Workspace Gmail account connected successfully with read-only permissions.',
      });
      refreshData();
      // Clean query params from URL cleanly without full reload
      params.delete('connected');
      const newQuery = params.toString() ? `?${params.toString()}` : window.location.pathname;
      window.history.replaceState({}, document.title, newQuery);
    } else if (errorParam) {
      setOauthNotice({
        type: 'error',
        message: `Gmail connection error: ${decodeURIComponent(errorParam)}`,
      });
      params.delete('error');
      const newQuery = params.toString() ? `?${params.toString()}` : window.location.pathname;
      window.history.replaceState({}, document.title, newQuery);
    }
  }, [refreshData]);

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

  const handleConnectGmail = async () => {
    if (!isAuthenticated) {
      setOauthNotice({
        type: 'error',
        message: 'Authentication required. Please log in.',
      });
      return;
    }
    setIsConnectingGmail(true);
    setOauthNotice(null);
    try {
      const authUrl = await initiateGmailOAuth();
      if (authUrl) {
        window.location.href = authUrl;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initiate Google OAuth.';
      setOauthNotice({
        type: 'error',
        message: msg,
      });
      setIsConnectingGmail(false);
    }
  };

  const handleTestGmail = async () => {
    setIsTestingGmail(true);
    setTestResult(null);
    setTestError(null);
    try {
      const res = await testGmailConnection();
      setTestResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection test failed.';
      setTestError(msg);
    } finally {
      setIsTestingGmail(false);
    }
  };

  const handleViewMessages = async () => {
    setShowMessagesModal(true);
    setIsLoadingMessages(true);
    try {
      const msgs = await getRecentGmailMessages(5);
      setTestMessages(msgs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch test messages.';
      setTestError(msg);
      setTestMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleConnectSheetsClick = () => {
    setOauthNotice({
      type: 'info',
      message: 'Google Sheets integration is scheduled for a future update. Real Gmail OAuth integration is currently active.',
    });
  };

  const isGmailConnected = gmailConn?.status === 'CONNECTED';
  const isGmailError = gmailConn?.status === 'ERROR' || gmailConn?.status === 'EXPIRED';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Connected Integrations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage authorized Google Workspace tokens, test live API connectivity, and review tenant permissions.
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

      {/* Global Alerts / Notices */}
      {oauthNotice && (
        <div
          className={`rounded-xl border p-4 flex items-start justify-between gap-3 text-xs ${
            oauthNotice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : oauthNotice.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-900'
              : 'border-indigo-200 bg-indigo-50/80 text-indigo-900'
          }`}
        >
          <div className="flex items-start gap-2">
            {oauthNotice.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />}
            {oauthNotice.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />}
            {oauthNotice.type === 'info' && <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />}
            <span className="font-medium">{oauthNotice.message}</span>
          </div>
          <button
            onClick={() => setOauthNotice(null)}
            className="text-xs font-bold hover:underline opacity-80 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gmail Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Gmail / Google Workspace</h3>
                  <p className="text-xs text-slate-500">Read-only inbox connection for invoice detection</p>
                </div>
              </div>

              {isGmailConnected ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Connected
                </span>
              ) : isGmailError ? (
                <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {gmailConn?.status === 'EXPIRED' ? 'Expired' : 'Error'}
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                  Disconnected
                </span>
              )}
            </div>

            {/* Connection Metadata Box */}
            <div className="space-y-2 rounded-xl bg-slate-50 p-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Connected Account:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                  {isGmailConnected && gmailConn?.accountIdentifier
                    ? gmailConn.accountIdentifier
                    : 'None (OAuth Required)'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">OAuth Scope:</span>
                <span className="font-mono text-[10.5px] bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded font-medium">
                  gmail.readonly
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Token Storage:</span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  AES-256-GCM Encrypted
                </span>
              </div>
              {gmailConn?.lastTestedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Last Verified:</span>
                  <span className="font-medium text-slate-700">
                    {formatDate(gmailConn.lastTestedAt)}
                  </span>
                </div>
              )}
              {gmailConn?.errorMessage && (
                <div className="pt-2 border-t border-slate-200/60 text-rose-600 text-[11px]">
                  {gmailConn.errorMessage}
                </div>
              )}
            </div>

            {/* Test Results Display */}
            {testResult && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Gmail API Health: Verified Active</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Authenticated as <strong className="font-semibold">{testResult.email}</strong>. Total inbox messages:{' '}
                  {testResult.messagesTotal ?? 'N/A'}.
                </p>
              </div>
            )}

            {testError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                  <span>Connection Test Failed</span>
                </div>
                <p className="text-[11px] text-rose-800">{testError}</p>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            {isGmailConnected ? (
              <>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTestGmail}
                    disabled={isTestingGmail}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 text-indigo-600 ${isTestingGmail ? 'animate-spin' : ''}`} />
                    <span>{isTestingGmail ? 'Testing…' : 'Test API'}</span>
                  </button>

                  <button
                    onClick={handleViewMessages}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                  >
                    <Eye className="h-3 w-3 text-slate-500" />
                    <span>View Messages</span>
                  </button>
                </div>

                <button
                  onClick={() => setDisconnectModalTarget('GMAIL')}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={handleConnectGmail}
                disabled={isConnectingGmail || !isAuthenticated}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-xs disabled:opacity-50"
              >
                {isConnectingGmail ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="h-3.5 w-3.5" />
                )}
                <span>{isGmailError ? 'Reconnect Gmail' : 'Connect Gmail'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Google Sheets Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
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

            <div className="space-y-2 rounded-xl bg-slate-50 p-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Connected Account:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                  {sheetsConn?.status === 'CONNECTED' ? (sheetsConn.accountIdentifier || user.email) : 'None (OAuth Required)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-semibold text-slate-800">
                  {sheetsConn?.status === 'CONNECTED' ? 'Active' : 'Scheduled Release'}
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
                onClick={handleConnectSheetsClick}
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
              Disconnecting will revoke stored access tokens and pause email checks for this organization. Existing tracked invoices and historical logs will remain safely in your workspace.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setDisconnectModalTarget(null)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Keep Connected
              </button>
              <button
                onClick={async () => {
                  if (disconnectModalTarget === 'GMAIL') {
                    await disconnectGmail();
                  } else {
                    await disconnectConnection(disconnectModalTarget as any);
                  }
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

      {/* Real Messages Modal (Read-Only Verification Proof) */}
      {showMessagesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900">
                <Mail className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold">Gmail API Read Test</h3>
              </div>
              <button
                onClick={() => setShowMessagesModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-2 mb-4">
              Real message headers and snippets retrieved live from your connected Gmail mailbox via the{' '}
              <span className="font-mono text-slate-700 font-semibold">gmail.readonly</span> API scope.
            </p>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {isLoadingMessages ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-xs">
                  <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin mb-2" />
                  <span>Loading recent inbox messages from Google API…</span>
                </div>
              ) : testMessages && testMessages.length > 0 ? (
                testMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-slate-900 truncate">{msg.subject}</h4>
                      <span className="text-[11px] text-slate-400 shrink-0">{formatDate(msg.date)}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-2 truncate">
                      <span><strong>From:</strong> {msg.from}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] line-clamp-2 bg-white p-2 rounded-lg border border-slate-100 italic">
                      "{msg.snippet || 'No snippet available'}"
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No recent messages found in inbox.
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowMessagesModal(false)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

