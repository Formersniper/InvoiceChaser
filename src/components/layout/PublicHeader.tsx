import React, { useState } from 'react';
import { Sparkles, Menu, X, ArrowRight, ShieldCheck } from 'lucide-react';

interface PublicHeaderProps {
  currentPath: string;
  navigate: (path: string) => void;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({ currentPath, navigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const links = [
    { label: 'Features', path: '/features' },
    { label: 'How It Works', path: '/how-it-works' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'Calculator', path: '/calculator' },
    { label: 'Templates', path: '/templates' },
    { label: 'Security', path: '/security' },
    { label: 'FAQ', path: '/faq' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#e6dfd3] bg-[#fdfaf5]/95 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3c473a] text-[#fdfaf5] font-black text-base shadow-sm">
            IC
          </div>
          <div>
            <span className="font-extrabold text-[#3c473a] tracking-tight text-lg">InvoiceChaser</span>
            <span className="ml-1.5 rounded bg-[#eef3ec] px-1.5 py-0.5 text-[11px] font-bold text-[#345330] uppercase">
              AI
            </span>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-7">
          {links.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`text-sm font-semibold transition ${
                currentPath === link.path
                  ? 'text-[#3c473a] font-bold underline underline-offset-4 decoration-[#8da080]'
                  : 'text-[#637061] hover:text-[#3c473a]'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Right CTA */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-[#3c473a] hover:text-[#2d372b] hover:bg-[#f2ede4] transition"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/app/dashboard')}
            className="flex items-center gap-2 rounded-lg bg-[#3c473a] px-4.5 py-2 text-sm font-semibold text-[#fdfaf5] shadow-sm transition hover:bg-[#2d372b] active:scale-[0.99]"
          >
            <span>Launch App</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile menu trigger */}
        <div className="lg:hidden flex items-center gap-2">
          <button
            onClick={() => navigate('/app/dashboard')}
            className="rounded-lg bg-[#3c473a] px-3 py-1.5 text-xs font-semibold text-[#fdfaf5] sm:hidden"
          >
            App
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#637061] hover:text-[#3c473a]"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-[#e6dfd3] bg-[#fdfaf5] px-4 pt-2 pb-6 space-y-2">
          {links.map((link) => (
            <button
              key={link.path}
              onClick={() => {
                navigate(link.path);
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left py-2 text-sm font-semibold text-[#3c473a] hover:text-[#2d382b]"
            >
              {link.label}
            </button>
          ))}
          <div className="pt-3 border-t border-[#efeae1] flex flex-col gap-2">
            <button
              onClick={() => {
                navigate('/login');
                setMobileMenuOpen(false);
              }}
              className="w-full text-center py-2 text-sm font-semibold text-[#3c473a] bg-[#f8f5ee] rounded-lg"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                navigate('/app/dashboard');
                setMobileMenuOpen(false);
              }}
              className="w-full text-center py-2.5 text-sm font-semibold text-[#fdfaf5] bg-[#3c473a] rounded-lg shadow-sm"
            >
              Launch Dashboard
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
