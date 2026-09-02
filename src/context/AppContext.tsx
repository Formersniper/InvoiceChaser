import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  Organization,
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
  InvoiceStatus,
  RelationshipType,
  CommunicationStyle,
  ReminderPolicyTier,
  SubscriptionPlan,
} from '../types';
import {
  INITIAL_USER,
  INITIAL_ORG,
  INITIAL_CLIENTS,
  INITIAL_INVOICES,
  INITIAL_REMINDERS,
  INITIAL_EMAIL_EVENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CONNECTIONS,
  INITIAL_AUTOMATION_SETTINGS,
  INITIAL_AI_SETTINGS,
  INITIAL_SUBSCRIPTION,
  INITIAL_USAGE,
  INITIAL_NOTIFICATIONS,
  loadFromStorage,
  saveToStorage,
} from '../utils/storage';
import { getDaysOverdue } from '../utils/formatters';

interface AppContextType {
  // Auth & Org
  user: User;
  organization: Organization;
  organizations: Organization[];
  switchOrganization: (orgId: string) => void;
  updateOrganization: (updates: Partial<Organization>) => void;
  updateUser: (updates: Partial<User>) => void;
  isOnboardingCompleted: boolean;
  completeOnboarding: () => void;

  // Invoices
  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'organizationId'>) => Invoice;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  markInvoicePaid: (id: string) => void;
  pauseInvoice: (id: string) => void;
  resumeInvoice: (id: string) => void;
  toggleDisputeInvoice: (id: string, isDisputed: boolean) => void;
  deleteInvoice: (id: string) => void;
  importInvoicesFromSheets: (importedRows: Array<{
    invoiceNumber: string;
    clientName: string;
    clientEmail: string;
    amount: number;
    currency: string;
    invoiceDate: string;
    dueDate: string;
    notes?: string;
  }>) => { count: number; skipped: number };

  // Clients
  clients: Client[];
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'organizationId' | 'totalInvoiced' | 'totalPaid' | 'totalOutstanding' | 'paymentReliabilityScore' | 'averagePaymentDelayDays'>) => Client;
  updateClient: (id: string, updates: Partial<Client>) => void;
  toggleNeverContactClient: (id: string) => void;

  // Reminders
  reminders: Reminder[];
  approveAndSendReminder: (reminderId: string, customSubject?: string, customBody?: string) => Promise<boolean>;
  cancelReminder: (reminderId: string, reason?: string) => void;
  retryReminder: (reminderId: string) => Promise<boolean>;
  generateAiReminder: (params: {
    invoiceId: string;
    sequenceNumber: 1 | 2 | 3;
    style?: CommunicationStyle;
    customInstructions?: string;
  }) => Promise<{ subject: string; body: string; tone: string; confidence: string }>;
  updateReminderDraft: (reminderId: string, subject: string, body: string, tone: CommunicationStyle) => void;

  // Email Events & Activity
  emailEvents: EmailEvent[];
  auditLogs: AuditLog[];
  addAuditLog: (entry: Omit<AuditLog, 'id' | 'createdAt' | 'organizationId'>) => void;

  // Connections
  connections: Connection[];
  connectGmail: (email: string) => Promise<boolean>;
  disconnectGmail: () => void;
  connectSheets: (spreadsheetId: string, sheetName: string, columnMapping: Record<string, string>) => Promise<boolean>;
  disconnectSheets: () => void;
  syncSheetsNow: () => Promise<number>;

  // Settings
  automationSettings: AutomationSettings;
  updateAutomationSettings: (updates: Partial<AutomationSettings>) => void;
  aiSettings: AISettings;
  updateAiSettings: (updates: Partial<AISettings>) => void;

  // Subscription & Usage
  subscription: Subscription;
  usage: Usage;
  upgradePlan: (plan: SubscriptionPlan) => void;

  // Notifications
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // System
  resetAllData: () => void;
  isBackendConnected: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(() => loadFromStorage('ic_user', INITIAL_USER));
  const [organization, setOrganization] = useState<Organization>(() => loadFromStorage('ic_org', INITIAL_ORG));
  const [organizations, setOrganizations] = useState<Organization[]>([INITIAL_ORG]);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(() =>
    loadFromStorage('ic_onboarding_completed', true)
  );

  const [invoices, setInvoices] = useState<Invoice[]>(() =>
    loadFromStorage('ic_invoices', INITIAL_INVOICES)
  );
  const [clients, setClients] = useState<Client[]>(() =>
    loadFromStorage('ic_clients', INITIAL_CLIENTS)
  );
  const [reminders, setReminders] = useState<Reminder[]>(() =>
    loadFromStorage('ic_reminders', INITIAL_REMINDERS)
  );
  const [emailEvents, setEmailEvents] = useState<EmailEvent[]>(() =>
    loadFromStorage('ic_email_events', INITIAL_EMAIL_EVENTS)
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() =>
    loadFromStorage('ic_audit_logs', INITIAL_AUDIT_LOGS)
  );
  const [connections, setConnections] = useState<Connection[]>(() =>
    loadFromStorage('ic_connections', INITIAL_CONNECTIONS)
  );
  const [automationSettings, setAutomationSettings] = useState<AutomationSettings>(() =>
    loadFromStorage('ic_auto_settings', INITIAL_AUTOMATION_SETTINGS)
  );
  const [aiSettings, setAiSettings] = useState<AISettings>(() =>
    loadFromStorage('ic_ai_settings', INITIAL_AI_SETTINGS)
  );
  const [subscription, setSubscription] = useState<Subscription>(() =>
    loadFromStorage('ic_subscription', INITIAL_SUBSCRIPTION)
  );
  const [usage, setUsage] = useState<Usage>(() =>
    loadFromStorage('ic_usage', INITIAL_USAGE)
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    loadFromStorage('ic_notifications', INITIAL_NOTIFICATIONS)
  );
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);

  // Sync state to local storage
  useEffect(() => { saveToStorage('ic_user', user); }, [user]);
  useEffect(() => { saveToStorage('ic_org', organization); }, [organization]);
  useEffect(() => { saveToStorage('ic_onboarding_completed', isOnboardingCompleted); }, [isOnboardingCompleted]);
  useEffect(() => { saveToStorage('ic_invoices', invoices); }, [invoices]);
  useEffect(() => { saveToStorage('ic_clients', clients); }, [clients]);
  useEffect(() => { saveToStorage('ic_reminders', reminders); }, [reminders]);
  useEffect(() => { saveToStorage('ic_email_events', emailEvents); }, [emailEvents]);
  useEffect(() => { saveToStorage('ic_audit_logs', auditLogs); }, [auditLogs]);
  useEffect(() => { saveToStorage('ic_connections', connections); }, [connections]);
  useEffect(() => { saveToStorage('ic_auto_settings', automationSettings); }, [automationSettings]);
  useEffect(() => { saveToStorage('ic_ai_settings', aiSettings); }, [aiSettings]);
  useEffect(() => { saveToStorage('ic_subscription', subscription); }, [subscription]);
  useEffect(() => { saveToStorage('ic_usage', usage); }, [usage]);
  useEffect(() => { saveToStorage('ic_notifications', notifications); }, [notifications]);

  // Periodic health check with backend
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then(() => setIsBackendConnected(true))
      .catch(() => setIsBackendConnected(false));
  }, []);

  const addAuditLog = (entry: Omit<AuditLog, 'id' | 'createdAt' | 'organizationId'>) => {
    const newEntry: AuditLog = {
      ...entry,
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organizationId: organization.id,
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  const switchOrganization = (orgId: string) => {
    const target = organizations.find((o) => o.id === orgId);
    if (target) {
      setOrganization(target);
      addAuditLog({
        eventType: 'ORGANIZATION_SWITCHED',
        entityType: 'SETTINGS',
        entityId: orgId,
        message: `Switched active organization to ${target.name}.`,
      });
    }
  };

  const updateOrganization = (updates: Partial<Organization>) => {
    setOrganization((prev) => {
      const updated = { ...prev, ...updates, updatedAt: new Date().toISOString() };
      return updated;
    });
    addAuditLog({
      eventType: 'ORGANIZATION_UPDATED',
      entityType: 'SETTINGS',
      entityId: organization.id,
      message: `Organization settings updated.`,
    });
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => ({ ...prev, ...updates }));
  };

  const completeOnboarding = () => {
    setIsOnboardingCompleted(true);
    addAuditLog({
      eventType: 'ONBOARDING_COMPLETED',
      entityType: 'SETTINGS',
      entityId: organization.id,
      message: 'Initial workspace onboarding completed and automation activated.',
    });
  };

  // INVOICE OPERATIONS
  const addInvoice = (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'organizationId'>): Invoice => {
    const newId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const daysOverdue = getDaysOverdue(invoiceData.dueDate);
    const newInvoice: Invoice = {
      ...invoiceData,
      id: newId,
      organizationId: organization.id,
      daysOverdue,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setInvoices((prev) => [newInvoice, ...prev]);
    
    // Update usage
    setUsage((prev) => ({
      ...prev,
      activeInvoicesCount: prev.activeInvoicesCount + (newInvoice.status !== 'PAID' ? 1 : 0),
    }));

    addAuditLog({
      eventType: 'INVOICE_CREATED',
      entityType: 'INVOICE',
      entityId: newId,
      message: `Invoice #${newInvoice.invoiceNumber} (${organization.currency} ${newInvoice.invoiceAmount.toLocaleString()}) for ${newInvoice.clientName} added to tracker.`,
    });

    return newInvoice;
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, ...updates, updatedAt: new Date().toISOString() } : inv))
    );
    addAuditLog({
      eventType: 'INVOICE_UPDATED',
      entityType: 'INVOICE',
      entityId: id,
      message: `Invoice data updated for #${invoices.find((i) => i.id === id)?.invoiceNumber || id}.`,
    });
  };

  /**
   * CRITICAL STOP ENGINE:
   * When an invoice becomes PAID:
   * 1. Status updated to PAID
   * 2. Cancel all pending/scheduled reminders
   * 3. Record paymentReceivedAt
   * 4. Write audit log
   * 5. Record payment event
   */
  const markInvoicePaid = (id: string) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;

    const now = new Date().toISOString();

    // 1. Update invoice
    setInvoices((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              status: 'PAID',
              paymentReceivedAt: now,
              nextReminderAt: undefined,
              daysOverdue: 0,
              updatedAt: now,
            }
          : i
      )
    );

    // 2. Stop & Cancel all future/pending reminders for this invoice
    setReminders((prev) =>
      prev.map((r) =>
        r.invoiceId === id && (r.status === 'SCHEDULED' || r.status === 'PENDING_APPROVAL' || r.status === 'GENERATING')
          ? {
              ...r,
              status: 'CANCELLED',
              updatedAt: now,
            }
          : r
      )
    );

    // 3. Update Client financial balances
    setClients((prev) =>
      prev.map((c) =>
        c.id === inv.clientId
          ? {
              ...c,
              totalPaid: c.totalPaid + inv.invoiceAmount,
              totalOutstanding: Math.max(0, c.totalOutstanding - inv.invoiceAmount),
              updatedAt: now,
            }
          : c
      )
    );

    // 4. Update usage active invoices count
    setUsage((prev) => ({
      ...prev,
      activeInvoicesCount: Math.max(0, prev.activeInvoicesCount - 1),
    }));

    // 5. Audit logs & notification
    addAuditLog({
      eventType: 'INVOICE_MARKED_PAID',
      entityType: 'INVOICE',
      entityId: id,
      message: `Invoice #${inv.invoiceNumber} marked as PAID. Stop engine executed: all pending reminders cancelled.`,
    });

    const notif: NotificationItem = {
      id: `notif_${Date.now()}`,
      organizationId: organization.id,
      type: 'SUCCESS',
      title: `Invoice #${inv.invoiceNumber} Paid`,
      message: `Payment registered for ${inv.clientName}. Automatic reminders have been stopped.`,
      actionUrl: `/app/invoices/${id}`,
      read: false,
      createdAt: now,
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  const pauseInvoice = (id: string) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;

    setInvoices((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isPaused: true, status: 'STOPPED', updatedAt: new Date().toISOString() } : i))
    );

    setReminders((prev) =>
      prev.map((r) =>
        r.invoiceId === id && (r.status === 'SCHEDULED' || r.status === 'PENDING_APPROVAL')
          ? { ...r, status: 'CANCELLED', updatedAt: new Date().toISOString() }
          : r
      )
    );

    addAuditLog({
      eventType: 'REMINDERS_PAUSED',
      entityType: 'INVOICE',
      entityId: id,
      message: `User paused automated reminders for Invoice #${inv.invoiceNumber}.`,
    });
  };

  const resumeInvoice = (id: string) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;

    const daysOverdue = getDaysOverdue(inv.dueDate);
    const newStatus: InvoiceStatus = daysOverdue > 0 ? 'OVERDUE' : 'DUE';

    setInvoices((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              isPaused: false,
              status: newStatus,
              daysOverdue,
              updatedAt: new Date().toISOString(),
            }
          : i
      )
    );

    addAuditLog({
      eventType: 'REMINDERS_RESUMED',
      entityType: 'INVOICE',
      entityId: id,
      message: `User resumed automated reminders for Invoice #${inv.invoiceNumber}.`,
    });
  };

  const toggleDisputeInvoice = (id: string, isDisputed: boolean) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;

    if (isDisputed) {
      setInvoices((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, status: 'DISPUTED', isPaused: true, updatedAt: new Date().toISOString() }
            : i
        )
      );
      setReminders((prev) =>
        prev.map((r) =>
          r.invoiceId === id && (r.status === 'SCHEDULED' || r.status === 'PENDING_APPROVAL')
            ? { ...r, status: 'CANCELLED', updatedAt: new Date().toISOString() }
            : r
        )
      );
      addAuditLog({
        eventType: 'INVOICE_DISPUTED',
        entityType: 'INVOICE',
        entityId: id,
        message: `Invoice #${inv.invoiceNumber} marked as DISPUTED. Automation halted.`,
      });
    } else {
      resumeInvoice(id);
    }
  };

  const deleteInvoice = (id: string) => {
    const inv = invoices.find((i) => i.id === id);
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    setReminders((prev) => prev.filter((r) => r.invoiceId !== id));
    if (inv) {
      addAuditLog({
        eventType: 'INVOICE_DELETED',
        entityType: 'INVOICE',
        entityId: id,
        message: `Invoice #${inv.invoiceNumber} was removed from tracking.`,
      });
    }
  };

  const importInvoicesFromSheets = (
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
    let count = 0;
    let skipped = 0;
    const existingNumbers = new Set(invoices.map((i) => i.invoiceNumber.toLowerCase().trim()));

    const newInvoices: Invoice[] = [];

    for (const row of importedRows) {
      if (!row.invoiceNumber || !row.clientName || existingNumbers.has(row.invoiceNumber.toLowerCase().trim())) {
        skipped++;
        continue;
      }

      existingNumbers.add(row.invoiceNumber.toLowerCase().trim());

      // Ensure client exists
      let client = clients.find((c) => c.email.toLowerCase() === row.clientEmail.toLowerCase());
      let clientId = client?.id;

      if (!client) {
        const newClient: Client = {
          id: `cli_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          organizationId: organization.id,
          name: row.clientName,
          email: row.clientEmail || `${row.clientName.toLowerCase().replace(/\s+/g, '')}@example.com`,
          companyName: row.clientName,
          relationshipType: 'REGULAR',
          paymentReliabilityScore: 85,
          averagePaymentDelayDays: 4.0,
          totalInvoiced: row.amount,
          totalPaid: 0,
          totalOutstanding: row.amount,
          neverContact: false,
          notes: 'Imported from Google Sheet',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setClients((prev) => [...prev, newClient]);
        clientId = newClient.id;
      }

      const daysOverdue = getDaysOverdue(row.dueDate);
      const invoice: Invoice = {
        id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        organizationId: organization.id,
        clientId: clientId || 'cli_imported',
        clientName: row.clientName,
        clientEmail: row.clientEmail,
        companyName: row.clientName,
        invoiceNumber: row.invoiceNumber,
        invoiceAmount: Number(row.amount) || 0,
        currency: row.currency || organization.currency || 'INR',
        invoiceDate: row.invoiceDate || new Date().toISOString().split('T')[0],
        dueDate: row.dueDate || new Date().toISOString().split('T')[0],
        status: daysOverdue > 0 ? 'OVERDUE' : 'DUE',
        daysOverdue,
        source: 'GOOGLE_SHEETS',
        reminderCount: 0,
        isPaused: false,
        extractionConfidence: 'HIGH',
        notes: row.notes || 'Imported via Google Sheets sync',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      newInvoices.push(invoice);
      count++;
    }

    if (newInvoices.length > 0) {
      setInvoices((prev) => [...newInvoices, ...prev]);
      addAuditLog({
        eventType: 'SHEETS_INVOICES_IMPORTED',
        entityType: 'INVOICE',
        entityId: 'batch_import',
        message: `Imported ${count} new invoices from Google Sheet (${skipped} duplicates/invalid skipped).`,
      });
    }

    return { count, skipped };
  };

  // CLIENT OPERATIONS
  const addClient = (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'organizationId' | 'totalInvoiced' | 'totalPaid' | 'totalOutstanding' | 'paymentReliabilityScore' | 'averagePaymentDelayDays'>): Client => {
    const newClient: Client = {
      ...clientData,
      id: `cli_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organizationId: organization.id,
      totalInvoiced: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      paymentReliabilityScore: 88,
      averagePaymentDelayDays: 3.5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setClients((prev) => [...prev, newClient]);
    addAuditLog({
      eventType: 'CLIENT_CREATED',
      entityType: 'CLIENT',
      entityId: newClient.id,
      message: `Client ${newClient.name} (${newClient.companyName}) created with profile ${newClient.relationshipType}.`,
    });
    return newClient;
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c))
    );
    addAuditLog({
      eventType: 'CLIENT_UPDATED',
      entityType: 'CLIENT',
      entityId: id,
      message: `Client profile updated for ${clients.find((c) => c.id === id)?.name || id}.`,
    });
  };

  const toggleNeverContactClient = (id: string) => {
    const client = clients.find((c) => c.id === id);
    if (!client) return;
    const nextState = !client.neverContact;

    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, neverContact: nextState, updatedAt: new Date().toISOString() } : c))
    );

    if (nextState) {
      // Cancel pending reminders for all this client's invoices
      const clientInvoiceIds = new Set(invoices.filter((i) => i.clientId === id).map((i) => i.id));
      setReminders((prev) =>
        prev.map((r) =>
          clientInvoiceIds.has(r.invoiceId) && (r.status === 'SCHEDULED' || r.status === 'PENDING_APPROVAL')
            ? { ...r, status: 'CANCELLED', updatedAt: new Date().toISOString() }
            : r
        )
      );
    }

    addAuditLog({
      eventType: 'CLIENT_EXCLUSION_TOGGLED',
      entityType: 'CLIENT',
      entityId: id,
      message: `Client ${client.name} set to ${nextState ? 'NEVER CONTACT (all reminders paused)' : 'Active Follow-ups'}.`,
    });
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
  }): Promise<{ subject: string; body: string; tone: string; confidence: string }> => {
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

    const res = await fetch('/api/gemini/generate-reminder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.details || 'Failed to generate reminder');
    }

    const data = await res.json();
    
    // Update usage AI generation count
    setUsage((prev) => ({
      ...prev,
      aiGenerationsCount: prev.aiGenerationsCount + 1,
    }));

    return data;
  };

  const updateReminderDraft = (reminderId: string, subject: string, body: string, tone: CommunicationStyle) => {
    setReminders((prev) =>
      prev.map((r) =>
        r.id === reminderId
          ? {
              ...r,
              subject,
              body,
              tone,
              updatedAt: new Date().toISOString(),
            }
          : r
      )
    );
  };

  const approveAndSendReminder = async (reminderId: string, customSubject?: string, customBody?: string): Promise<boolean> => {
    const rem = reminders.find((r) => r.id === reminderId);
    if (!rem) return false;

    const inv = invoices.find((i) => i.id === rem.invoiceId);
    if (!inv || inv.status === 'PAID' || inv.isPaused || inv.status === 'DISPUTED') {
      // Safety rule 62: Do not send if already paid or paused
      return false;
    }

    const client = clients.find((c) => c.id === rem.clientId);
    if (client?.neverContact) {
      return false;
    }

    const finalSubject = customSubject || rem.subject;
    const finalBody = customBody || rem.body;
    const now = new Date().toISOString();
    const mockGmailId = `${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;

    // 1. Update reminder status
    setReminders((prev) =>
      prev.map((r) =>
        r.id === reminderId
          ? {
              ...r,
              status: 'SENT',
              sentAt: now,
              subject: finalSubject,
              body: finalBody,
              gmailMessageId: mockGmailId,
              approvedByUser: true,
              requiresReview: false,
              updatedAt: now,
            }
          : r
      )
    );

    // 2. Update invoice reminder count & status
    const nextStatus: InvoiceStatus =
      rem.sequenceNumber === 1 ? 'REMINDER_1' : rem.sequenceNumber === 2 ? 'REMINDER_2' : 'FINAL_NOTICE';

    setInvoices((prev) =>
      prev.map((i) =>
        i.id === rem.invoiceId
          ? {
              ...i,
              reminderCount: Math.max(i.reminderCount, rem.sequenceNumber),
              lastReminderAt: now,
              status: nextStatus,
              updatedAt: now,
            }
          : i
      )
    );

    // 3. Record email event
    const newEmailEvent: EmailEvent = {
      id: `evt_${Date.now()}`,
      organizationId: organization.id,
      invoiceId: rem.invoiceId,
      clientId: rem.clientId,
      gmailMessageId: mockGmailId,
      direction: 'OUTBOUND',
      eventType: 'REMINDER_SENT',
      subject: finalSubject,
      sender: user.email,
      recipient: inv.clientEmail,
      bodyPreview: finalBody.substring(0, 140) + '...',
      eventTimestamp: now,
      createdAt: now,
    };
    setEmailEvents((prev) => [newEmailEvent, ...prev]);

    // 4. Update usage
    setUsage((prev) => ({
      ...prev,
      remindersSentCount: prev.remindersSentCount + 1,
    }));

    // 5. Audit Log
    addAuditLog({
      eventType: 'REMINDER_SENT',
      entityType: 'REMINDER',
      entityId: reminderId,
      message: `Sent Reminder #${rem.sequenceNumber} to ${inv.clientEmail} for Invoice #${inv.invoiceNumber} (${organization.currency} ${inv.invoiceAmount.toLocaleString()}).`,
    });

    return true;
  };

  const cancelReminder = (reminderId: string, reason?: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === reminderId ? { ...r, status: 'CANCELLED', updatedAt: new Date().toISOString() } : r))
    );
    addAuditLog({
      eventType: 'REMINDER_CANCELLED',
      entityType: 'REMINDER',
      entityId: reminderId,
      message: `Reminder was cancelled manually.${reason ? ` Reason: ${reason}` : ''}`,
    });
  };

  const retryReminder = async (reminderId: string): Promise<boolean> => {
    return approveAndSendReminder(reminderId);
  };

  // CONNECTIONS
  const connectGmail = async (accountEmail: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/integrations/test-gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountEmail }),
      });
      const data = await res.json();

      setConnections((prev) => {
        const withoutGmail = prev.filter((c) => c.provider !== 'GMAIL');
        const newConn: Connection = {
          id: `conn_gmail_${Date.now()}`,
          organizationId: organization.id,
          provider: 'GMAIL',
          status: 'CONNECTED',
          accountIdentifier: data.accountIdentifier || accountEmail,
          scopes: data.scopes || ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
          lastSyncAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return [...withoutGmail, newConn];
      });

      addAuditLog({
        eventType: 'CONNECTION_ESTABLISHED',
        entityType: 'CONNECTION',
        entityId: 'gmail',
        message: `Gmail connected for ${accountEmail}. Automated invoice detection and sending active.`,
      });

      return true;
    } catch {
      return false;
    }
  };

  const disconnectGmail = () => {
    setConnections((prev) =>
      prev.map((c) =>
        c.provider === 'GMAIL' ? { ...c, status: 'DISCONNECTED', updatedAt: new Date().toISOString() } : c
      )
    );
    addAuditLog({
      eventType: 'CONNECTION_DISCONNECTED',
      entityType: 'CONNECTION',
      entityId: 'gmail',
      message: `Gmail connection disconnected by user. Outgoing email automation paused.`,
    });
  };

  const connectSheets = async (
    spreadsheetId: string,
    sheetName: string,
    columnMapping: Record<string, string>
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/integrations/test-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId }),
      });
      const data = await res.json();

      setConnections((prev) => {
        const withoutSheets = prev.filter((c) => c.provider !== 'GOOGLE_SHEETS');
        const newConn: Connection = {
          id: `conn_sheets_${Date.now()}`,
          organizationId: organization.id,
          provider: 'GOOGLE_SHEETS',
          status: 'CONNECTED',
          accountIdentifier: user.email,
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
          lastSyncAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sheetMetadata: {
            spreadsheetId: data.spreadsheetId || spreadsheetId,
            spreadsheetName: 'Client Invoices Tracker',
            sheetName: sheetName || 'Invoices',
            columnMapping: columnMapping as any,
          },
        };
        return [...withoutSheets, newConn];
      });

      addAuditLog({
        eventType: 'CONNECTION_ESTABLISHED',
        entityType: 'CONNECTION',
        entityId: 'sheets',
        message: `Google Sheets integration configured with Sheet "${sheetName}".`,
      });

      return true;
    } catch {
      return false;
    }
  };

  const disconnectSheets = () => {
    setConnections((prev) =>
      prev.map((c) =>
        c.provider === 'GOOGLE_SHEETS' ? { ...c, status: 'DISCONNECTED', updatedAt: new Date().toISOString() } : c
      )
    );
    addAuditLog({
      eventType: 'CONNECTION_DISCONNECTED',
      entityType: 'CONNECTION',
      entityId: 'sheets',
      message: `Google Sheets connection disconnected.`,
    });
  };

  const syncSheetsNow = async (): Promise<number> => {
    // Simulate reading the latest rows from the mapped sheet
    await new Promise((r) => setTimeout(r, 600));
    const now = new Date().toISOString();
    setConnections((prev) =>
      prev.map((c) => (c.provider === 'GOOGLE_SHEETS' ? { ...c, lastSyncAt: now } : c))
    );
    return 3;
  };

  // SETTINGS & SUBSCRIPTIONS
  const updateAutomationSettings = (updates: Partial<AutomationSettings>) => {
    setAutomationSettings((prev) => ({ ...prev, ...updates }));
    addAuditLog({
      eventType: 'SETTINGS_UPDATED',
      entityType: 'SETTINGS',
      entityId: automationSettings.id,
      message: `Updated reminder automation policies (Policy: ${updates.policyTier || automationSettings.policyTier}).`,
    });
  };

  const updateAiSettings = (updates: Partial<AISettings>) => {
    setAiSettings((prev) => ({ ...prev, ...updates }));
    addAuditLog({
      eventType: 'AI_SETTINGS_UPDATED',
      entityType: 'SETTINGS',
      entityId: aiSettings.id,
      message: `Updated AI communication parameters (Default Tone: ${updates.communicationStyle || aiSettings.communicationStyle}).`,
    });
  };

  const upgradePlan = (plan: SubscriptionPlan) => {
    const limitsByPlan = {
      FREE: { activeInvoices: 5, remindersPerMonth: 10, gmailAccounts: 1, aiReminders: false, relationshipIntelligence: false, customRules: false, teamMembers: 1 },
      STARTER: { activeInvoices: 25, remindersPerMonth: 100, gmailAccounts: 1, aiReminders: true, relationshipIntelligence: false, customRules: false, teamMembers: 2 },
      PROFESSIONAL: { activeInvoices: 100, remindersPerMonth: 500, gmailAccounts: 2, aiReminders: true, relationshipIntelligence: true, customRules: true, teamMembers: 5 },
      BUSINESS: { activeInvoices: 500, remindersPerMonth: 2000, gmailAccounts: 5, aiReminders: true, relationshipIntelligence: true, customRules: true, teamMembers: 15 },
    };

    setSubscription((prev) => ({
      ...prev,
      plan,
      status: 'ACTIVE',
      limits: limitsByPlan[plan],
    }));

    addAuditLog({
      eventType: 'SUBSCRIPTION_UPGRADED',
      entityType: 'BILLING',
      entityId: subscription.id,
      message: `Plan updated to ${plan}. Limit increased to ${limitsByPlan[plan].activeInvoices} invoices and ${limitsByPlan[plan].remindersPerMonth} reminders.`,
    });
  };

  // NOTIFICATIONS
  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // RESET
  const resetAllData = () => {
    setUser(INITIAL_USER);
    setOrganization(INITIAL_ORG);
    setInvoices(INITIAL_INVOICES);
    setClients(INITIAL_CLIENTS);
    setReminders(INITIAL_REMINDERS);
    setEmailEvents(INITIAL_EMAIL_EVENTS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setConnections(INITIAL_CONNECTIONS);
    setAutomationSettings(INITIAL_AUTOMATION_SETTINGS);
    setAiSettings(INITIAL_AI_SETTINGS);
    setSubscription(INITIAL_SUBSCRIPTION);
    setUsage(INITIAL_USAGE);
    setNotifications(INITIAL_NOTIFICATIONS);
    setIsOnboardingCompleted(true);
    localStorage.clear();
  };

  return (
    <AppContext.Provider
      value={{
        user,
        organization,
        organizations,
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
        syncSheetsNow,
        automationSettings,
        updateAutomationSettings,
        aiSettings,
        updateAiSettings,
        subscription,
        usage,
        upgradePlan,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,
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
