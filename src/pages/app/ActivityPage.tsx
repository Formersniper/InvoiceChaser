import React, { useState } from 'react';
import { Clock, ShieldCheck, Mail, FileText, CheckCircle2, Filter } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDateTime } from '../../utils/formatters';

export const ActivityPage: React.FC = () => {
  const { auditLogs } = useApp();
  const [filter, setFilter] = useState('ALL');

  const filteredLogs = auditLogs.filter((l) => {
    if (filter === 'INVOICE') return l.entityType === 'INVOICE';
    if (filter === 'REMINDER') return l.entityType === 'REMINDER';
    if (filter === 'CONNECTION') return l.entityType === 'CONNECTION';
    if (filter === 'ORGANIZATION') return l.entityType === 'ORGANIZATION';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Traceable Activity Audit</h1>
        <p className="text-xs text-slate-500 mt-1">
          Complete chronological ledger of AI generations, email dispatches, status synchronizations, and stop engine triggers.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {['ALL', 'INVOICE', 'REMINDER', 'CONNECTION', 'ORGANIZATION'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filter === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Audit Log Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="divide-y divide-slate-100">
          {filteredLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-slate-50/70 transition text-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 shrink-0 mt-0.5">
                {log.entityType === 'REMINDER' ? (
                  <Mail className="h-4 w-4 text-indigo-600" />
                ) : log.entityType === 'INVOICE' ? (
                  <FileText className="h-4 w-4 text-emerald-600" />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-slate-600" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{log.action.replace(/_/g, ' ')}</span>
                  <span className="text-[11px] text-slate-400 font-mono">{formatDateTime(log.createdAt)}</span>
                </div>
                <p className="text-slate-600 mt-1">{log.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
