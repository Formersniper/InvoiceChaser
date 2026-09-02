import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Users,
  Clock,
  Activity,
  BarChart3,
  Plug,
  Settings,
  CreditCard,
  User,
  ShieldCheck,
  Plus,
  Mail,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  currentPath: string;
  navigate: (path: string) => void;
  onOpenAddInvoice: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath, navigate, onOpenAddInvoice }) => {
  const { reminders, connections, usage, subscription } = useApp();

  const pendingReviewCount = reminders.filter((r) => r.status === 'PENDING_APPROVAL').length;
  const gmailConn = connections.find((c) => c.provider === 'GMAIL');
  const isGmailConnected = gmailConn?.status === 'CONNECTED';

  const navItems = [
    { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { label: 'Invoices', path: '/app/invoices', icon: FileText },
    { label: 'Clients', path: '/app/clients', icon: Users },
    {
      label: 'Reminders',
      path: '/app/reminders',
      icon: Clock,
      badge: pendingReviewCount > 0 ? pendingReviewCount : undefined,
    },
    { label: 'Activity', path: '/app/activity', icon: Activity },
    { label: 'Analytics', path: '/app/analytics', icon: BarChart3 },
  ];

  const secondaryNavItems = [
    { label: 'Connections', path: '/app/connections', icon: Plug },
    { label: 'Settings', path: '/app/settings', icon: Settings },
    { label: 'Billing', path: '/app/billing', icon: CreditCard },
    { label: 'Account', path: '/app/account', icon: User },
  ];

  return (
    <aside id="app-sidebar" className="flex h-screen w-64 flex-col border-r border-[#e6dfd3] bg-white select-none">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-2.5 px-6 border-b border-[#efeae1]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3c473a] text-[#fdfaf5] font-black text-sm shadow-sm">
          IC
        </div>
        <div>
          <span className="font-extrabold text-[#3c473a] tracking-tight text-base">InvoiceChaser</span>
          <span className="ml-1 rounded bg-[#eef3ec] px-1.5 py-0.5 text-[10px] font-bold text-[#345330] uppercase">
            AI
          </span>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="p-4">
        <button
          id="btn-track-invoice-sidebar"
          onClick={onOpenAddInvoice}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3c473a] px-4 py-2.5 text-sm font-semibold text-[#fdfaf5] shadow-sm transition hover:bg-[#2d372b] active:scale-[0.99]"
        >
          <Plus className="h-4 w-4" />
          <span>Track Invoice</span>
        </button>
      </div>

      {/* Main Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-6">
        <div>
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-[#8b9789]">
            Workspace
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path || (item.path !== '/app/dashboard' && currentPath.startsWith(item.path));
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-[#eef3ec] text-[#2d382b] font-semibold'
                      : 'text-[#637061] hover:bg-[#f8f5ee] hover:text-[#3c473a]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-[#3c473a]' : 'text-[#8b9789]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="flex h-5 items-center justify-center rounded-full bg-[#fbf3db] px-2 text-xs font-bold text-[#785315]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-[#8b9789]">
            Configuration
          </div>
          <nav className="space-y-1">
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath.startsWith(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-[#eef3ec] text-[#2d382b] font-semibold'
                      : 'text-[#637061] hover:bg-[#f8f5ee] hover:text-[#3c473a]'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-[#3c473a]' : 'text-[#8b9789]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Gmail Connect Banner if not connected */}
      {!isGmailConnected && (
        <div className="p-3 mx-3 mb-2 rounded-xl bg-[#fbf3db] border border-[#f0deaa]">
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-[#785315] mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[#5c3e0a]">Connect Gmail</p>
              <p className="text-[11px] text-[#785315] mt-0.5">
                Enable automated invoice detection & sending.
              </p>
              <button
                onClick={() => navigate('/app/connections')}
                className="mt-2 text-xs font-bold text-[#3c473a] hover:text-[#2d372b] flex items-center gap-1"
              >
                Connect now &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Usage summary footer */}
      <div className="border-t border-[#e6dfd3] p-4 bg-[#f8f5ee]">
        <div className="flex items-center justify-between text-xs font-medium text-[#637061] mb-1.5">
          <span>Plan: {subscription.plan}</span>
          <span className="font-semibold text-[#3c473a]">{usage.activeInvoicesCount} / {subscription.limits.activeInvoices} Invoices</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#ded6c7]">
          <div
            className="h-full bg-[#3c473a] rounded-full transition-all"
            style={{
              width: `${Math.min(100, (usage.activeInvoicesCount / subscription.limits.activeInvoices) * 100)}%`,
            }}
          />
        </div>
      </div>
    </aside>
  );
};
