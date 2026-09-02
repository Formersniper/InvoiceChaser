import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronDown,
  Building2,
  Mail,
  FileSpreadsheet,
  ExternalLink,
  ShieldCheck,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface NavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, navigate }) => {
  const {
    user,
    organization,
    organizations,
    switchOrganization,
    connections,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    isBackendConnected,
  } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const gmailConn = connections.find((c) => c.provider === 'GMAIL');
  const sheetsConn = connections.find((c) => c.provider === 'GOOGLE_SHEETS');
  const isGmailActive = gmailConn?.status === 'CONNECTED';
  const isSheetsActive = sheetsConn?.status === 'CONNECTED';

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header id="app-navbar" className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#e6dfd3] bg-[#fdfaf5]/95 px-4 backdrop-blur sm:px-6">
      {/* Left side: Org Switcher and Status */}
      <div className="flex items-center gap-3">
        {/* Organization Switcher */}
        <div className="relative">
          <button
            id="btn-org-switcher"
            onClick={() => setShowOrgDropdown(!showOrgDropdown)}
            className="flex items-center gap-2 rounded-lg border border-[#e6dfd3] bg-white px-3 py-1.5 text-sm font-semibold text-[#3c473a] transition hover:bg-[#f8f5ee]"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#3c473a] text-xs font-bold text-[#fdfaf5]">
              {organization.name.charAt(0)}
            </div>
            <span className="max-w-[140px] truncate sm:max-w-[200px]">{organization.name}</span>
            <ChevronDown className="h-4 w-4 text-[#8b9789]" />
          </button>

          {showOrgDropdown && (
            <div className="absolute left-0 mt-2 w-64 rounded-xl border border-[#e6dfd3] bg-white p-2 shadow-lg z-50">
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#8b9789]">
                Organizations
              </div>
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    switchOrganization(org.id);
                    setShowOrgDropdown(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                    org.id === organization.id
                      ? 'bg-[#eef3ec] font-medium text-[#2d382b]'
                      : 'text-[#3c473a] hover:bg-[#f8f5ee]'
                  }`}
                >
                  <span className="truncate">{org.name}</span>
                  {org.id === organization.id && <CheckCircle2 className="h-4 w-4 text-[#4a5f45]" />}
                </button>
              ))}
              <div className="my-1 border-t border-[#efeae1]" />
              <button
                onClick={() => {
                  navigate('/app/account');
                  setShowOrgDropdown(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#637061] hover:bg-[#f8f5ee]"
              >
                <Building2 className="h-3.5 w-3.5" />
                Manage Organization & Teams
              </button>
            </div>
          )}
        </div>

        {/* Integration Status Badges */}
        <div className="hidden items-center gap-2 sm:flex">
          <button
            onClick={() => navigate('/app/connections')}
            title={isGmailActive ? 'Gmail Connected (Active Outgoing & Reading)' : 'Gmail Not Connected'}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
              isGmailActive
                ? 'bg-[#e7f0e4] text-[#2d4d29] border border-[#c5dcc0] hover:bg-[#dcead8]'
                : 'bg-[#fbf3db] text-[#785315] border border-[#f0deaa] hover:bg-[#f8ebc7]'
            }`}
          >
            <Mail className="h-3 w-3" />
            <span>Gmail</span>
            <span className={`h-1.5 w-1.5 rounded-full ${isGmailActive ? 'bg-[#3e6b36]' : 'bg-[#c27803]'}`} />
          </button>

          <button
            onClick={() => navigate('/app/connections')}
            title={isSheetsActive ? 'Google Sheets Sync Active' : 'Sheets Not Connected'}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
              isSheetsActive
                ? 'bg-[#e7f0e4] text-[#2d4d29] border border-[#c5dcc0] hover:bg-[#dcead8]'
                : 'bg-[#f2ede4] text-[#637061] border border-[#e6dfd3] hover:bg-[#eae3d6]'
            }`}
          >
            <FileSpreadsheet className="h-3 w-3" />
            <span>Sheets</span>
            <span className={`h-1.5 w-1.5 rounded-full ${isSheetsActive ? 'bg-[#3e6b36]' : 'bg-[#8b9789]'}`} />
          </button>
        </div>
      </div>

      {/* Right side: Actions, Notifications, User */}
      <div className="flex items-center gap-3">
        {/* Switch to Marketing Website */}
        <button
          onClick={() => navigate('/')}
          className="hidden md:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#637061] hover:bg-[#f2ede4] transition"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Public Site</span>
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            id="btn-notifications"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#e6dfd3] bg-white text-[#637061] transition hover:bg-[#f8f5ee] hover:text-[#3c473a]"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#c85a48] text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-[#e6dfd3] bg-white p-3 shadow-xl z-50">
              <div className="flex items-center justify-between pb-2 border-b border-[#efeae1]">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#3c473a]">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-[#eef3ec] px-2 py-0.5 text-xs font-semibold text-[#345330]">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-xs font-medium text-[#4a5f45] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-[#efeae1] py-1">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#8b9789]">No notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markNotificationRead(n.id);
                        if (n.actionUrl) {
                          navigate(n.actionUrl);
                          setShowNotifications(false);
                        }
                      }}
                      className={`flex gap-3 p-2.5 rounded-lg transition cursor-pointer ${
                        n.read ? 'hover:bg-[#f8f5ee] opacity-75' : 'bg-[#f7f4ed] hover:bg-[#f0ebe0]'
                      }`}
                    >
                      <div className="mt-0.5">
                        {n.type === 'ALERT' && <AlertCircle className="h-4 w-4 text-[#c27803]" />}
                        {n.type === 'SUCCESS' && <CheckCircle2 className="h-4 w-4 text-[#3e6b36]" />}
                        {n.type === 'WARNING' && <Clock className="h-4 w-4 text-[#c85a48]" />}
                        {n.type === 'INFO' && <Sparkles className="h-4 w-4 text-[#566852]" />}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-xs font-semibold text-[#3c473a]">{n.title}</p>
                        <p className="text-xs text-[#637061] line-clamp-2 mt-0.5">{n.message}</p>
                        <span className="text-[10px] text-[#8b9789] mt-1 block">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile dropdown */}
        <div className="relative">
          <button
            id="btn-user-menu"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 rounded-lg p-1 transition hover:bg-[#f2ede4]"
          >
            <img
              src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt={user.name}
              className="h-8 w-8 rounded-full border border-[#ded6c7] object-cover"
            />
            <span className="hidden text-xs font-semibold text-[#3c473a] sm:block">{user.name.split(' ')[0]}</span>
            <ChevronDown className="h-3.5 w-3.5 text-[#8b9789]" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[#e6dfd3] bg-white p-2 shadow-xl z-50">
              <div className="border-b border-[#efeae1] px-3 py-2">
                <p className="text-xs font-bold text-[#3c473a]">{user.name}</p>
                <p className="truncate text-xs text-[#8b9789]">{user.email}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    navigate('/app/account');
                    setShowUserDropdown(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#3c473a] hover:bg-[#f8f5ee]"
                >
                  Account Profile & Teams
                </button>
                <button
                  onClick={() => {
                    navigate('/app/billing');
                    setShowUserDropdown(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#3c473a] hover:bg-[#f8f5ee]"
                >
                  Billing & Plan Usage
                </button>
                <button
                  onClick={() => {
                    navigate('/app/settings');
                    setShowUserDropdown(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#3c473a] hover:bg-[#f8f5ee]"
                >
                  Settings & AI Policies
                </button>
                <button
                  onClick={() => {
                    navigate('/admin');
                    setShowUserDropdown(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#3c473a] hover:bg-[#eef3ec]"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-[#4a5f45]" />
                  Platform Admin View
                </button>
              </div>

              <div className="border-t border-[#efeae1] pt-1">
                <button
                  onClick={() => {
                    navigate('/login');
                    setShowUserDropdown(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#b84838] hover:bg-[#fbeae7]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
