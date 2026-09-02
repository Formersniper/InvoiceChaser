import React, { useState } from 'react';
import {
  Sliders,
  ShieldCheck,
  Sparkles,
  Clock,
  Save,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ReminderPolicyTier } from '../../types';

export const SettingsPage: React.FC = () => {
  const {
    organization,
    updateOrganization,
    automationSettings,
    updateAutomationSettings,
  } = useApp();

  const [saved, setSaved] = useState(false);

  const [orgName, setOrgName] = useState(organization.name);
  const [currency, setCurrency] = useState(organization.currency || 'INR');
  const [senderName, setSenderName] = useState(organization.senderName || 'Finance Team');
  const [reviewBeforeSend, setReviewBeforeSend] = useState(
    automationSettings.reviewBeforeSend
  );
  const [policyTier, setPolicyTier] = useState<ReminderPolicyTier>(
    automationSettings.policyTier
  );
  const [firstDays, setFirstDays] = useState(
    automationSettings.policyIntervals.firstReminderDays
  );
  const [secondDays, setSecondDays] = useState(
    automationSettings.policyIntervals.secondReminderDays
  );
  const [finalDays, setFinalDays] = useState(
    automationSettings.policyIntervals.finalReminderDays
  );
  const [quietHoursStart, setQuietHoursStart] = useState(
    automationSettings.quietHoursStart || '20:00'
  );
  const [quietHoursEnd, setQuietHoursEnd] = useState(
    automationSettings.quietHoursEnd || '08:00'
  );
  const [customInstructions, setCustomInstructions] = useState(
    automationSettings.customPromptInstructions || ''
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrganization({
      name: orgName,
      currency,
      senderName,
    });
    updateAutomationSettings({
      reviewBeforeSend,
      policyTier,
      policyIntervals: {
        firstReminderDays: Number(firstDays),
        secondReminderDays: Number(secondDays),
        finalReminderDays: Number(finalDays),
      },
      quietHoursStart,
      quietHoursEnd,
      customPromptInstructions: customInstructions,
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Organization & AI Policies</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure default reminder cadences, human review guardrails, quiet hours, and AI prompting rules.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Org Profile */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Organization Profile
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Company / Studio Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 font-semibold"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Default Base Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 font-semibold"
              >
                <option value="INR">INR (₹ Indian Rupee)</option>
                <option value="USD">USD ($ United States Dollar)</option>
                <option value="EUR">EUR (€ Euro)</option>
                <option value="GBP">GBP (£ British Pound)</option>
                <option value="CAD">CAD (CA$ Canadian Dollar)</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Sender Display Name</label>
              <input
                type="text"
                placeholder="Finance Team"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Human Oversight & Safe Mode */}
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-6 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-6 w-6 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Review Before Send (Human Safe Mode)</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  When enabled, AI-drafted reminders enter the Pending Queue for single-click review before being dispatched through your Gmail account.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={reviewBeforeSend}
                onChange={(e) => setReviewBeforeSend(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {/* Reminder Interval Policy */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Cadence & Schedule Policies (Days After Due Date)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Reminder #1 (Polite)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={firstDays}
                  onChange={(e) => setFirstDays(Number(e.target.value))}
                  className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold focus:bg-white focus:outline-none"
                />
                <span className="text-slate-500">days overdue</span>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Reminder #2 (Firm)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="2"
                  max="90"
                  value={secondDays}
                  onChange={(e) => setSecondDays(Number(e.target.value))}
                  className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold focus:bg-white focus:outline-none"
                />
                <span className="text-slate-500">days overdue</span>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Final Notice</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="3"
                  max="120"
                  value={finalDays}
                  onChange={(e) => setFinalDays(Number(e.target.value))}
                  className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold focus:bg-white focus:outline-none"
                />
                <span className="text-slate-500">days overdue</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Custom Prompt Instructions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Custom AI Generation Directives</h3>
          </div>
          <p className="text-xs text-slate-500">
            Provide additional agency context or custom signature policies passed to Gemini 3.7 Flash for every generated reminder.
          </p>
          <textarea
            rows={3}
            placeholder="e.g. Always append bank transfer details (HDFC A/C: 9876543210, IFSC: HDFC0001234) and maintain an empathetic partnership tone."
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 font-sans"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          {saved && (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4" />
              Settings Saved Successfully
            </span>
          )}
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-sm"
          >
            <Save className="h-4 w-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
