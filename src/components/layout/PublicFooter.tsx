import React from 'react';
import { ShieldCheck, Mail, Lock, CheckCircle2 } from 'lucide-react';

interface PublicFooterProps {
  navigate: (path: string) => void;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({ navigate }) => {
  return (
    <footer className="border-t border-[#e6dfd3] bg-[#f8f5ee] text-[#637061]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3c473a] text-[#fdfaf5] font-black text-sm">
                IC
              </div>
              <span className="font-extrabold text-[#3c473a] tracking-tight text-lg">InvoiceChaser AI</span>
            </div>
            <p className="text-sm text-[#637061] max-w-sm leading-relaxed">
              Automated, relationship-aware accounts-receivable follow-up assistant for agencies, freelancers, and small businesses. Connect Gmail & Google Sheets once; get paid without chasing clients.
            </p>
            <div className="flex items-center gap-4 text-xs text-[#637061] pt-1">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#3e6b36]" />
                <span>Zero client secrets stored</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-[#8b9789]" />
                <span>Encrypted OAuth</span>
              </div>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#3c473a]">Product</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <button onClick={() => navigate('/features')} className="hover:text-[#3c473a]">Features</button>
              </li>
              <li>
                <button onClick={() => navigate('/how-it-works')} className="hover:text-[#3c473a]">How It Works</button>
              </li>
              <li>
                <button onClick={() => navigate('/pricing')} className="hover:text-[#3c473a]">Pricing</button>
              </li>
              <li>
                <button onClick={() => navigate('/app/dashboard')} className="hover:text-[#2d382b] font-semibold text-[#3c473a]">Live Dashboard</button>
              </li>
            </ul>
          </div>

          {/* Free Tools */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#3c473a]">Free Tools</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <button onClick={() => navigate('/calculator')} className="hover:text-[#3c473a]">Late Payment Calculator</button>
              </li>
              <li>
                <button onClick={() => navigate('/templates')} className="hover:text-[#3c473a]">Reminder Template Library</button>
              </li>
              <li>
                <button onClick={() => navigate('/faq')} className="hover:text-[#3c473a]">FAQ</button>
              </li>
            </ul>
          </div>

          {/* Trust & Legal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#3c473a]">Security & Trust</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <button onClick={() => navigate('/security')} className="hover:text-[#3c473a]">Security Architecture</button>
              </li>
              <li>
                <span className="text-[#8b9789]">Privacy Policy (Standard)</span>
              </li>
              <li>
                <span className="text-[#8b9789]">Terms of Service</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-[#e6dfd3] pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8b9789] gap-4">
          <p>© 2026 InvoiceChaser AI. All rights reserved.</p>
          <p className="max-w-md text-center sm:text-right text-[11px] text-[#8b9789]">
            InvoiceChaser AI is an accounts-receivable workflow assistant, not an accounting platform, payment processor, or debt-collection service.
          </p>
        </div>
      </div>
    </footer>
  );
};
