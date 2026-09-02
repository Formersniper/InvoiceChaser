import React, { useState } from 'react';
import { User, Building2, ShieldCheck, Mail, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AccountPage: React.FC = () => {
  const { user, organization, organizations, switchOrganization, updateOrganization } = useApp();

  const [userName, setUserName] = useState(user.name);
  const [orgName, setOrgName] = useState(organization.name);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');

  const [teamMembers, setTeamMembers] = useState([
    {
      id: 'usr_1',
      name: user.name,
      email: user.email,
      role: 'Owner',
      status: 'Active',
    },
    {
      id: 'usr_2',
      name: 'Pooja Mehta',
      email: 'pooja@apexstudios.in',
      role: 'Finance Admin',
      status: 'Active',
    },
    {
      id: 'usr_3',
      name: 'Karan Patel',
      email: 'karan@apexstudios.in',
      role: 'Member',
      status: 'Active',
    },
  ]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setTeamMembers([
      ...teamMembers,
      {
        id: `usr_${Date.now()}`,
        name: inviteEmail.split('@')[0],
        email: inviteEmail.trim(),
        role: inviteRole === 'ADMIN' ? 'Finance Admin' : 'Member',
        status: 'Invited',
      },
    ]);
    setInviteEmail('');
    setShowInviteModal(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account & Team Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage personal credentials, organization membership, and team member permissions.
        </p>
      </div>

      {/* User Profile Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
          Personal Profile
        </h3>

        <div className="flex items-center gap-4">
          <img
            src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
            alt={user.name}
            className="h-14 w-14 rounded-full border border-slate-200 object-cover"
          />
          <div>
            <h4 className="font-bold text-slate-900 text-base">{user.name}</h4>
            <p className="text-xs text-slate-500">{user.email}</p>
            <span className="inline-block mt-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
              Platform Role: {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Organization Switcher & Details */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Your Organizations</h3>
          <span className="text-xs text-slate-400">Multi-tenant Workspace</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {organizations.map((org) => (
            <div
              key={org.id}
              onClick={() => switchOrganization(org.id)}
              className={`cursor-pointer rounded-xl border p-4 transition flex items-center justify-between ${
                org.id === organization.id
                  ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-xs">
                  {org.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs">{org.name}</p>
                  <p className="text-[11px] text-slate-500">Plan: {org.plan}</p>
                </div>
              </div>

              {org.id === organization.id && (
                <CheckCircle2 className="h-4 w-4 text-indigo-600" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Team Members List */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Team Members & Delegations</h3>
            <p className="text-xs text-slate-500">Co-workers with access to this AR workspace</p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Invite Colleague</span>
          </button>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {teamMembers.map((member) => (
            <div key={member.id} className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900">{member.name}</span>
                <span className="text-slate-400 ml-2">({member.email})</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                  {member.role}
                </span>
                <span className="text-[10px] font-medium text-emerald-600">{member.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-3">Invite Team Member</h3>
            <form onSubmit={handleInvite} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email Address *</label>
                <input
                  type="email"
                  placeholder="colleague@agency.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Role Permissions</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="MEMBER">Member (Can review and create invoices)</option>
                  <option value="ADMIN">Finance Admin (Full billing and integration controls)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700 shadow-sm"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
