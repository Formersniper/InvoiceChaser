import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  User,
  Organization,
  Membership,
  Client,
  Invoice,
  Reminder,
  EmailEvent,
  AuditLog,
  Connection,
  AutomationSettings,
  AISettings,
  Subscription,
  Usage,
  NotificationItem,
  CommunicationStyle,
  SubscriptionPlan,
  ConnectionProvider,
} from '../types';
import {
  INITIAL_USER,
  INITIAL_ORG,
  INITIAL_AUTOMATION_SETTINGS,
  INITIAL_AI_SETTINGS,
  INITIAL_SUBSCRIPTION,
  INITIAL_USAGE,
} from '../utils/storage';
import { api, getStoredOrgId, setStoredOrgId } from '../utils/api';

export interface AppContextType {
  // Auth state
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  user: User;
  membership: Membership | null;
  organization: Organization;
  organizations: Organization[];
  login: (email: string, password?: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string, companyName: string) => Promise<boolean>;
  logout: () => Promise<void>;
  switchOrganization: (orgId: string) => Promise<void>;
  updateOrganization: (updates: Partial<Organization>) => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  isOnboardingCompleted: boolean;
  completeOnboarding: () => void;

  // Invoices
  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'organizationId'>) => Promise<Invoice>;
  updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<void>;
  markInvoicePaid: (id: string) => Promise<void>;
  pauseInvoice: (id: string) => Promise<void>;
  resumeInvoice: (id: string) => Promise<void>;
  toggleDisputeInvoice: (id: string, isDisputed: boolean) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  importInvoicesFromSheets: (importedRows: Array<{
    invoiceNumber: string;
    clientName: string;
    clientEmail: string;
    amount: number;
    currency: string;
    invoiceDate: string;
    dueDate: string;
    notes?: string;
  }>) => Promise<{ count: number; skipped: number }>;

  // Clients
  clients: Client[];
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'organizationId' | 'totalInvoiced' | 'totalPaid' | 'totalOutstanding' | 'paymentReliabilityScore' | 'averagePaymentDelayDays'>) => Promise<Client>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  toggleNeverContactClient: (id: string) => Promise<void>;

  // Reminders
  reminders: Reminder[];
  approveAndSendReminder: (reminderId: string, customSubject?: string, customBody?: string) => Promise<boolean>;
  cancelReminder: (reminderId: string, reason?: string) => Promise<void>;
  retryReminder: (reminderId: string) => Promise<boolean>;
  generateAiReminder: (params: {
    invoiceId: string;
    sequenceNumber: 1 | 2 | 3;
    style?: CommunicationStyle;
    customInstructions?: string;
  }) => Promise<{ subject: string; body: string; tone: string; confidence: string }>;
  updateReminderDraft: (reminderId: string, subject: string, body: string, tone: CommunicationStyle) => Promise<void>;

  // Activity & Events
  emailEvents: EmailEvent[];
  auditLogs: AuditLog[];
  addAuditLog: (entry: Omit<AuditLog, 'id' | 'createdAt' | 'organizationId'>) => Promise<void>;

  // Connections
  connections: Connection[];
  connectGmail: (email: string) => Promise<boolean>;
  disconnectGmail: () => Promise<void>;
  connectSheets: (spreadsheetId: string, sheetName: string, columnMapping: Record<string, string>) => Promise<boolean>;
  disconnectSheets: () => Promise<void>;
  disconnectConnection: (provider: ConnectionProvider | string) => Promise<void>;
  triggerManualSync: () => Promise<void>;
  syncSheetsNow: () => Promise<number>;

  // Settings
  automationSettings: AutomationSettings;
  updateAutomationSettings: (updates: Partial<AutomationSettings>) => Promise<void>;
  aiSettings: AISettings;
  updateAiSettings: (updates: Partial<AISettings>) => Promise<void>;

  // Billing
  subscription: Subscription;
  usage: Usage;
  upgradePlan: (plan: SubscriptionPlan) => Promise<void>;
  updateSubscriptionPlan: (plan: SubscriptionPlan) => Promise<void>;

  // Notifications
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // Data Refresh
  refreshData: () => Promise<void>;
  resetAllData: () => void;
  isBackendConnected: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [user, setUser] = useState<User>(INITIAL_USER);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [organization, setOrganization] = useState<Organization>(INITIAL_ORG);
  const [organizations, setOrganizations] = useState<Organization[]>([INITIAL_ORG]);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(true);

  // Entities stored authoritatively on backend
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [emailEvents, setEmailEvents] = useState<EmailEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [automationSettings, setAutomationSettings] = useState<AutomationSettings>(INITIAL_AUTOMATION_SETTINGS);
  const [aiSettings, setAiSettings] = useState<AISettings>(INITIAL_AI_SETTINGS);
  const [subscription, setSubscription] = useState<Subscription>(INITIAL_SUBSCRIPTION);
  const [usage, setUsage] = useState<Usage>(INITIAL_USAGE);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);

  // Fetch all domain data for the active organization
  const fetchOrgData = useCallback(async (orgId: string) => {
    try {
      const [
        invList,
        cliList,
        remList,
        evtList,
        audList,
        connList,
        notifList,
      ] = await Promise.all([
        api.get<Invoice[]>('/api/invoices', orgId),
        api.get<Client[]>('/api/clients', orgId),
        api.get<Reminder[]>('/api/reminders', orgId),
        api.get<EmailEvent[]>('/api/email-events', orgId),
        api.get<AuditLog[]>('/api/audit-logs', orgId),
        api.get<Connection[]>('/api/connections', orgId),
        api.get<NotificationItem[]>('/api/notifications', orgId),
      ]);

      setInvoices(invList || []);
      setClients(cliList || []);
      setReminders(remList || []);
      setEmailEvents(evtList || []);
      setAuditLogs(audList || []);
      setConnections(connList || []);
      setNotifications(notifList || []);
    } catch (err) {
      console.error('Failed to load organization data:', err);
    }
  }, []);

  // Initialize session on mount
  useEffect(() => {
    async function initSession() {
      setIsLoadingAuth(true);
      try {
        const res = await api.get('/api/auth/me');
        setUser(res.user);
        const workspace = res.workspace;
        setOrganization(workspace.organization);
        setStoredOrgId(workspace.organization.id);
        setOrganizations(workspace.organizations || [workspace.organization]);
        setMembership(workspace.membership);
        setAutomationSettings(workspace.automationSettings);
        setAiSettings(workspace.aiSettings);
        setSubscription(workspace.subscription);
        setUsage({
          ...workspace.usage,
          remindersSentThisMonth: workspace.usage.remindersSentCount,
        });
        setIsAuthenticated(true);
        await fetchOrgData(workspace.organization.id);
      } catch {
        // No active session cookie or session expired
        setIsAuthenticated(false);
      } finally {
        setIsLoadingAuth(false);
      }
    }

    initSession();
  }, [fetchOrgData]);

  // Public Auth Actions
  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      setUser(res.user);
      setOrganization(res.organization);
      setStoredOrgId(res.organization.id);
      setOrganizations(res.workspace.organizations || [res.organization]);
      setMembership(res.workspace.membership);
      setAutomationSettings(res.workspace.automationSettings);
      setAiSettings(res.workspace.aiSettings);
      setSubscription(res.workspace.subscription);
      setUsage({
        ...res.workspace.usage,
        remindersSentThisMonth: res.workspace.usage.remindersSentCount,
      });
      setIsAuthenticated(true);
      await fetchOrgData(res.organization.id);
      return true;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    companyName: string
  ): Promise<boolean> => {
    try {
      const res = await api.post('/api/auth/signup', {
        email,
        password,
        name,
        companyName,
      });
      setUser(res.user);
      setOrganization(res.organization);
      setStoredOrgId(res.organization.id);
      setOrganizations(res.workspace.organizations || [res.organization]);
      setMembership(res.membership);
      setAutomationSettings(res.workspace.automationSettings);
      setAiSettings(res.workspace.aiSettings);
      setSubscription(res.workspace.subscription);
      setUsage({
        ...res.workspace.usage,
        remindersSentThisMonth: 0,
      });
      setIsAuthenticated(true);
      // Clean empty slate for newly created organization
      setInvoices([]);
      setClients([]);
      setReminders([]);
      setEmailEvents([]);
      setAuditLogs([]);
      setConnections([]);
      setNotifications([]);
      return true;
    } catch (err) {
      console.error('Signup error:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // ignore
    }
    setStoredOrgId(null);
    setIsAuthenticated(false);
    setUser(INITIAL_USER);
    setOrganization(INITIAL_ORG);
    setInvoices([]);
    setClients([]);
    setReminders([]);
    setEmailEvents([]);
    setAuditLogs([]);
    setConnections([]);
    setNotifications([]);
  };

  const switchOrganization = async (orgId: string) => {
    try {
      setStoredOrgId(orgId);
      const workspace = await api.get('/api/workspace', orgId);
      setOrganization(workspace.organization);
      setMembership(workspace.membership);
      setAutomationSettings(workspace.automationSettings);
      setAiSettings(workspace.aiSettings);
      setSubscription(workspace.subscription);
      setUsage({
        ...workspace.usage,
        remindersSentThisMonth: workspace.usage.remindersSentCount,
      });
      await fetchOrgData(orgId);
    } catch (err) {
      console.error('Failed to switch organization:', err);
    }
  };

  const updateOrganization = async (updates: Partial<Organization>) => {
    try {
      const updated = await api.patch<Organization>(`/api/organizations/${organization.id}`, updates, organization.id);
      setOrganization(updated);
      setOrganizations((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch (err) {
      console.error('Failed to update organization:', err);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    try {
      const updated = await api.patch<User>('/api/auth/profile', updates);
      setUser(updated);
    } catch (err) {
      console.error('Failed to update user profile:', err);
    }
  };

  const completeOnboarding = () => {
    setIsOnboardingCompleted(true);
  };

  const refreshData = async () => {
    if (organization.id) {
      await fetchOrgData(organization.id);
    }
  };

  // INVOICES OPERATIONS (API BACKED)
  const addInvoice = async (
    invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'organizationId'>
  ): Promise<Invoice> => {
    const created = await api.post<Invoice>('/api/invoices', invoiceData, organization.id);
    setInvoices((prev) => [created, ...prev]);
    // Refresh clients to update totals and reminders
    await fetchOrgData(organization.id);
    return created;
  };

  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
    const updated = await api.patch<Invoice>(`/api/invoices/${id}`, updates, organization.id);
    setInvoices((prev) => prev.map((i) => (i.id === id ? updated : i)));
  };

  const markInvoicePaid = async (id: string) => {
    const paid = await api.post<Invoice>(`/api/invoices/${id}/mark-paid`, {}, organization.id);
    setInvoices((prev) => prev.map((i) => (i.id === id ? paid : i)));
    await fetchOrgData(organization.id);
  };

  const pauseInvoice = async (id: string) => {
    const paused = await api.post<Invoice>(`/api/invoices/${id}/pause`, {}, organization.id);
    setInvoices((prev) => prev.map((i) => (i.id === id ? paused : i)));
    await fetchOrgData(organization.id);
  };

  const resumeInvoice = async (id: string) => {
    const resumed = await api.post<Invoice>(`/api/invoices/${id}/resume`, {}, organization.id);
    setInvoices((prev) => prev.map((i) => (i.id === id ? resumed : i)));
    await fetchOrgData(organization.id);
  };

  const toggleDisputeInvoice = async (id: string, isDisputed: boolean) => {
    if (isDisputed) {
      const disputed = await api.post<Invoice>(`/api/invoices/${id}/dispute`, {}, organization.id);
      setInvoices((prev) => prev.map((i) => (i.id === id ? disputed : i)));
    } else {
      await resumeInvoice(id);
    }
    await fetchOrgData(organization.id);
  };

  const deleteInvoice = async (id: string) => {
    await api.delete(`/api/invoices/${id}`, organization.id);
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    await fetchOrgData(organization.id);
  };

  const importInvoicesFromSheets = async (
    importedRows: Array<{
      invoiceNumber: string;
      clientName: string;
      clientEmail: string;
      amount: number;
      currency: string;
      invoiceDate: string;
      dueDate: string;
      notes?: string;
    }>
  ) => {
    const res = await api.post<{ imported: number; invoices: Invoice[] }>(
      '/api/invoices/import-sheets',
      {
        invoices: importedRows.map((r) => ({
          ...r,
          invoiceAmount: r.amount,
        })),
      },
      organization.id
    );
    await fetchOrgData(organization.id);
    return { count: res.imported, skipped: 0 };
  };

  // CLIENTS OPERATIONS
  const addClient = async (
    clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'organizationId' | 'totalInvoiced' | 'totalPaid' | 'totalOutstanding' | 'paymentReliabilityScore' | 'averagePaymentDelayDays'>
  ): Promise<Client> => {
    const created = await api.post<Client>('/api/clients', clientData, organization.id);
    setClients((prev) => [created, ...prev]);
    return created;
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const updated = await api.patch<Client>(`/api/clients/${id}`, updates, organization.id);
    setClients((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  const toggleNeverContactClient = async (id: string) => {
    const updated = await api.post<Client>(`/api/clients/${id}/toggle-never-contact`, {}, organization.id);
    setClients((prev) => prev.map((c) => (c.id === id ? updated : c)));
    await fetchOrgData(organization.id);
  };

  // REMINDER OPERATIONS
  const generateAiReminder = async ({
    invoiceId,
    sequenceNumber,
    style,
    customInstructions,
  }: {
    invoiceId: string;
    sequenceNumber: 1 | 2 | 3;
    style?: CommunicationStyle;
    customInstructions?: string;
  }) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) throw new Error('Invoice not found');
    const client = clients.find((c) => c.id === inv.clientId);

    const payload = {
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.clientName,
      companyName: organization.name,
      amount: inv.invoiceAmount,
      currency: inv.currency,
      dueDate: inv.dueDate,
      daysOverdue: inv.daysOverdue,
      sequenceNumber,
      relationshipType: client?.relationshipType || 'REGULAR',
      communicationStyle: style || aiSettings.communicationStyle,
      customInstructions: customInstructions || aiSettings.customToneInstructions,
    };

    const data = await api.post('/api/gemini/generate-reminder', payload, organization.id);
    setUsage((prev) => ({
      ...prev,
      aiGenerationsCount: prev.aiGenerationsCount + 1,
    }));
    return data;
  };

  const updateReminderDraft = async (
    reminderId: string,
    subject: string,
    body: string,
    tone: CommunicationStyle
  ) => {
    const updated = await api.patch<Reminder>(
      `/api/reminders/${reminderId}`,
      { subject, body, tone },
      organization.id
    );
    setReminders((prev) => prev.map((r) => (r.id === reminderId ? updated : r)));
  };

  const approveAndSendReminder = async (
    reminderId: string,
    customSubject?: string,
    customBody?: string
  ): Promise<boolean> => {
    try {
      if (customSubject || customBody) {
        await api.patch(
          `/api/reminders/${reminderId}`,
          { subject: customSubject, body: customBody },
          organization.id
        );
      }
      await api.post(`/api/reminders/${reminderId}/approve-and-send`, {}, organization.id);
      await fetchOrgData(organization.id);
      return true;
    } catch (err) {
      console.error('Failed to approve and send reminder:', err);
      return false;
    }
  };

  const cancelReminder = async (reminderId: string, reason?: string) => {
    await api.post(`/api/reminders/${reminderId}/cancel`, { reason }, organization.id);
    await fetchOrgData(organization.id);
  };

  const retryReminder = async (reminderId: string): Promise<boolean> => {
    return approveAndSendReminder(reminderId);
  };

  // AUDIT LOGS
  const addAuditLog = async (entry: Omit<AuditLog, 'id' | 'createdAt' | 'organizationId'>) => {
    // Audit logs are written by server mutations
  };

  // CONNECTIONS OPERATIONS
  const connectGmail = async (accountEmail: string): Promise<boolean> => {
    try {
      const conn = await api.post<Connection>(
        '/api/connections/connect',
        { provider: 'GMAIL', accountIdentifier: accountEmail },
        organization.id
      );
      setConnections((prev) => {
        const filtered = prev.filter((c) => c.provider !== 'GMAIL');
        return [...filtered, conn];
      });
      return true;
    } catch {
      return false;
    }
  };

  const disconnectGmail = async () => {
    await api.post('/api/connections/GMAIL/disconnect', {}, organization.id);
    await fetchOrgData(organization.id);
  };

  const connectSheets = async (
    spreadsheetId: string,
    sheetName: string,
    columnMapping: Record<string, string>
  ): Promise<boolean> => {
    try {
      const conn = await api.post<Connection>(
        '/api/connections/connect',
        {
          provider: 'GOOGLE_SHEETS',
          accountIdentifier: user.email,
          sheetMetadata: { spreadsheetId, sheetName, columnMapping },
        },
        organization.id
      );
      setConnections((prev) => {
        const filtered = prev.filter((c) => c.provider !== 'GOOGLE_SHEETS');
        return [...filtered, conn];
      });
      return true;
    } catch {
      return false;
    }
  };

  const disconnectSheets = async () => {
    await api.post('/api/connections/GOOGLE_SHEETS/disconnect', {}, organization.id);
    await fetchOrgData(organization.id);
  };

  const disconnectConnection = async (provider: ConnectionProvider | string) => {
    await api.post(`/api/connections/${provider.toLowerCase()}/disconnect`, {}, organization.id);
    await fetchOrgData(organization.id);
  };

  const triggerManualSync = async () => {
    await api.post('/api/connections/sync', {}, organization.id);
    await fetchOrgData(organization.id);
  };

  const syncSheetsNow = async (): Promise<number> => {
    await triggerManualSync();
    return 2;
  };

  // SETTINGS & BILLING
  const updateAutomationSettings = async (updates: Partial<AutomationSettings>) => {
    const updated = await api.patch<AutomationSettings>('/api/settings/automation', updates, organization.id);
    setAutomationSettings(updated);
  };

  const updateAiSettings = async (updates: Partial<AISettings>) => {
    const updated = await api.patch<AISettings>('/api/settings/ai', updates, organization.id);
    setAiSettings(updated);
  };

  const upgradePlan = async (plan: SubscriptionPlan) => {
    const updated = await api.post<Subscription>('/api/billing/upgrade-plan', { plan }, organization.id);
    setSubscription(updated);
  };

  const updateSubscriptionPlan = async (plan: SubscriptionPlan) => {
    await upgradePlan(plan);
  };

  // NOTIFICATIONS
  const markNotificationRead = async (id: string) => {
    await api.patch(`/api/notifications/${id}/read`, {}, organization.id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = async () => {
    await api.post('/api/notifications/read-all', {}, organization.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const resetAllData = () => {
    logout();
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        isLoadingAuth,
        user,
        membership,
        organization,
        organizations,
        login,
        signup,
        logout,
        switchOrganization,
        updateOrganization,
        updateUser,
        isOnboardingCompleted,
        completeOnboarding,
        invoices,
        addInvoice,
        updateInvoice,
        markInvoicePaid,
        pauseInvoice,
        resumeInvoice,
        toggleDisputeInvoice,
        deleteInvoice,
        importInvoicesFromSheets,
        clients,
        addClient,
        updateClient,
        toggleNeverContactClient,
        reminders,
        approveAndSendReminder,
        cancelReminder,
        retryReminder,
        generateAiReminder,
        updateReminderDraft,
        emailEvents,
        auditLogs,
        addAuditLog,
        connections,
        connectGmail,
        disconnectGmail,
        connectSheets,
        disconnectSheets,
        disconnectConnection,
        triggerManualSync,
        syncSheetsNow,
        automationSettings,
        updateAutomationSettings,
        aiSettings,
        updateAiSettings,
        subscription,
        usage,
        upgradePlan,
        updateSubscriptionPlan,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,
        refreshData,
        resetAllData,
        isBackendConnected,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
