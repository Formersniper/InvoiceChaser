import React, { useState } from 'react';
import { Calculator, TrendingUp, DollarSign, ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface CalculatorPageProps {
  navigate: (path: string) => void;
}

export const CalculatorPage: React.FC<CalculatorPageProps> = ({ navigate }) => {
  const [monthlyRevenue, setMonthlyRevenue] = useState(500000);
  const [avgDelayDays, setAvgDelayDays] = useState(25);
  const [opportunityCostRate, setOpportunityCostRate] = useState(12); // 12% APR

  // Calculations
  const lockedCapital = (monthlyRevenue * avgDelayDays) / 30;
  const annualOpportunityCost = lockedCapital * (opportunityCostRate / 100);
  const hoursWastedPerMonth = Math.round((monthlyRevenue / 100000) * 3.5);
  const annualHoursSaved = hoursWastedPerMonth * 12;
  const estimatedCashflowAcceleration = lockedCapital * 0.65;

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
          <Calculator className="h-3.5 w-3.5" />
          <span>Interactive Working Capital Calculator</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          How Much Are Late Invoices Costing You?
        </h1>
        <p className="text-sm text-slate-600">
          Calculate the hidden capital drag and opportunity cost of delayed client payments.
        </p>
      </div>

      {/* Calculator Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-lg">
        {/* Left Inputs */}
        <div className="space-y-6">
          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-2">
              <span>Monthly Billed Revenue (₹)</span>
              <span className="font-mono text-indigo-600 text-sm">
                {formatCurrency(monthlyRevenue, 'INR')}
              </span>
            </div>
            <input
              type="range"
              min="50000"
              max="5000000"
              step="25000"
              value={monthlyRevenue}
              onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-2">
              <span>Average Payment Delay Past Due Date</span>
              <span className="font-mono text-indigo-600 text-sm">{avgDelayDays} Days</span>
            </div>
            <input
              type="range"
              min="5"
              max="90"
              step="1"
              value={avgDelayDays}
              onChange={(e) => setAvgDelayDays(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-2">
              <span>Cost of Capital / Interest Hurdle Rate</span>
              <span className="font-mono text-indigo-600 text-sm">{opportunityCostRate}%</span>
            </div>
            <input
              type="range"
              min="6"
              max="24"
              step="1"
              value={opportunityCostRate}
              onChange={(e) => setOpportunityCostRate(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500 space-y-1.5 border border-slate-100">
            <p className="font-semibold text-slate-700">How this is computed:</p>
            <p>
              Locked working capital represents overdue cash unavailable for payroll, marketing, or short-term yield, compounding at {opportunityCostRate}% APR.
            </p>
          </div>
        </div>

        {/* Right Output Card */}
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Your Annual Cashflow Drag
            </span>

            <div>
              <span className="text-3xl sm:text-4xl font-black text-rose-600">
                {formatCurrency(annualOpportunityCost, 'INR')}
              </span>
              <p className="text-xs text-slate-600 mt-1">Lost each year in dead capital cost</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-indigo-200/60 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Avg Locked Cash</span>
                <span className="font-black text-slate-900 text-sm mt-0.5 block">
                  {formatCurrency(lockedCapital, 'INR')}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Time Saved / Year</span>
                <span className="font-black text-emerald-700 text-sm mt-0.5 block">
                  {annualHoursSaved} Hours
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-indigo-200/60 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-950">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>InvoiceChaser reduces average delay from {avgDelayDays} days to &lt; 7 days.</span>
            </div>
            <button
              onClick={() => navigate('/app/dashboard')}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-700 shadow-md transition"
            >
              <span>Automate My Receivables Now</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
