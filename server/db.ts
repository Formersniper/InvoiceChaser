import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
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
  SubscriptionPlan,
  PlanLimits,
} from '../src/types';
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
} from '../src/utils/storage';

// Supabase lazy client configuration
let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (url && key) {
    try {
      supabaseInstance = createSupabaseClient(url, key, {
        auth: { persistSession: false },
      });
      console.log('Connected to remote Supabase instance at', url);
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
    }
  }
  return supabaseInstance;
}

// User Record with Password Hash
export interface UserRecord extends User {
  passwordHash?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Memory database tables for seamless standalone & fallback operation
interface MemoryDB {
  users: Map<string, UserRecord>;
  organizations: Map<string, Organization>;
  memberships: Map<string, Membership>;
  clients: Map<string, Client>;
  invoices: Map<string, Invoice>;
  reminders: Map<string, Reminder>;
  emailEvents: Map<string, EmailEvent>;
  auditLogs: Map<string, AuditLog>;
  connections: Map<string, Connection>;
  automationSettings: Map<string, AutomationSettings>;
  aiSettings: Map<string, AISettings>;
  subscriptions: Map<string, Subscription>;
  usage: Map<string, Usage>;
  notifications: Map<string, NotificationItem>;
}

const db: MemoryDB = {
  users: new Map(),
  organizations: new Map(),
  memberships: new Map(),
  clients: new Map(),
  invoices: new Map(),
  reminders: new Map(),
  emailEvents: new Map(),
  auditLogs: new Map(),
  connections: new Map(),
  automationSettings: new Map(),
  aiSettings: new Map(),
  subscriptions: new Map(),
  usage: new Map(),
  notifications: new Map(),
};

// Seed initial demo data for instant out-of-the-box experience
let isSeeded = false;
export async function seedInitialDataIfNeeded() {
  if (isSeeded) return;
  isSeeded = true;

  const defaultHash = await bcrypt.hash('password123', 10);
  const demoUser: UserRecord = {
    ...INITIAL_USER,
    passwordHash: defaultHash,
    createdAt: '2026-07-01T10:00:00Z',
    updatedAt: '2026-08-28T15:30:00Z',
  };

  db.users.set(demoUser.id, demoUser);
  db.organizations.set(INITIAL_ORG.id, INITIAL_ORG);

  const demoMembership: Membership = {
    id: `mem_${demoUser.id}_${INITIAL_ORG.id}`,
    organizationId: INITIAL_ORG.id,
    userId: demoUser.id,
    role: 'owner',
    createdAt: '2026-07-01T10:00:00Z',
  };
  db.memberships.set(demoMembership.id, demoMembership);

  INITIAL_CLIENTS.forEach((c) => db.clients.set(c.id, { ...c }));
  INITIAL_INVOICES.forEach((i) => db.invoices.set(i.id, { ...i }));
  INITIAL_REMINDERS.forEach((r) => db.reminders.set(r.id, { ...r }));
  INITIAL_EMAIL_EVENTS.forEach((e) => db.emailEvents.set(e.id, { ...e }));
  INITIAL_AUDIT_LOGS.forEach((a) => db.auditLogs.set(a.id, { ...a }));
  INITIAL_CONNECTIONS.forEach((c) => db.connections.set(`${c.organizationId}_${c.provider}`, { ...c }));
  db.automationSettings.set(INITIAL_AUTOMATION_SETTINGS.organizationId, { ...INITIAL_AUTOMATION_SETTINGS });
  db.aiSettings.set(INITIAL_AI_SETTINGS.organizationId, { ...INITIAL_AI_SETTINGS });
  db.subscriptions.set(INITIAL_SUBSCRIPTION.organizationId, { ...INITIAL_SUBSCRIPTION });
  db.usage.set(INITIAL_USAGE.organizationId, { ...INITIAL_USAGE });
  INITIAL_NOTIFICATIONS.forEach((n) => db.notifications.set(n.id, { ...n }));
}

// Plan Limits Generator
export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  switch (plan) {
    case 'FREE':
      return {
        activeInvoices: 5,
        remindersPerMonth: 10,
        gmailAccounts: 1,
        aiReminders: false,
        relationshipIntelligence: false,
        customRules: false,
        teamMembers: 1,
      };
    case 'STARTER':
      return {
        activeInvoices: 25,
        remindersPerMonth: 100,
        gmailAccounts: 2,
        aiReminders: true,
        relationshipIntelligence: true,
        customRules: true,
        teamMembers: 3,
      };
    case 'PROFESSIONAL':
      return {
        activeInvoices: 100,
        remindersPerMonth: 500,
        gmailAccounts: 5,
        aiReminders: true,
        relationshipIntelligence: true,
        customRules: true,
        teamMembers: 10,
      };
    case 'BUSINESS':
      return {
        activeInvoices: 9999,
        remindersPerMonth: 9999,
        gmailAccounts: 20,
        aiReminders: true,
        relationshipIntelligence: true,
        customRules: true,
        teamMembers: 50,
      };
  }
}

/* -------------------------------------------------------------
   USERS & AUTH OPERATIONS
------------------------------------------------------------- */
export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  await seedInitialDataIfNeeded();
  const normalized = email.trim().toLowerCase();
  for (const u of db.users.values()) {
    if (u.email.toLowerCase() === normalized) {
      return u;
    }
  }
  return null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  await seedInitialDataIfNeeded();
  return db.users.get(id) || null;
}

export async function createUser(params: {
  email: string;
  name: string;
  password: string;
  avatarUrl?: string;
}): Promise<UserRecord> {
  await seedInitialDataIfNeeded();
  const normalized = params.email.trim().toLowerCase();
  const existing = await findUserByEmail(normalized);
  if (existing) {
    throw new Error('User already exists with this email.');
  }

  const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const passwordHash = await bcrypt.hash(params.password, 10);
  const user: UserRecord = {
    id,
    email: normalized,
    name: params.name.trim(),
    avatarUrl:
      params.avatarUrl ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(params.name)}`,
    passwordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.users.set(id, user);
  return user;
}

export async function updateUserProfile(
  userId: string,
  data: Partial<Pick<User, 'name' | 'avatarUrl'>>
): Promise<UserRecord> {
  const user = await findUserById(userId);
  if (!user) throw new Error('User not found.');
  const updated: UserRecord = {
    ...user,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  db.users.set(userId, updated);
  return updated;
}

/* -------------------------------------------------------------
   ORGANIZATIONS & MEMBERSHIPS (Multi-Tenancy)
------------------------------------------------------------- */
export async function createOrganizationForUser(
  user: UserRecord,
  companyName: string
): Promise<{ organization: Organization; membership: Membership }> {
  await seedInitialDataIfNeeded();
  const orgId = `org_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const org: Organization = {
    id: orgId,
    name: companyName.trim() || `${user.name}'s Studio`,
    slug: slug || `org-${Date.now()}`,
    ownerUserId: user.id,
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.organizations.set(orgId, org);

  const membershipId = `mem_${user.id}_${orgId}`;
  const membership: Membership = {
    id: membershipId,
    organizationId: orgId,
    userId: user.id,
    role: 'owner',
    createdAt: new Date().toISOString(),
  };
  db.memberships.set(membershipId, membership);

  // Initialize tenant default configs (empty invoices/clients for new user)
  const defaultAutomation: AutomationSettings = {
    id: `auto_${orgId}`,
    organizationId: orgId,
    automaticReminders: true,
    automaticallyStopWhenPaid: true,
    avoidWeekends: true,
    preferredSendingTime: '10:00',
    timezone: org.timezone,
    policyTier: 'STANDARD',
    policyIntervals: {
      firstReminderDays: 3,
      secondReminderDays: 10,
      finalReminderDays: 17,
    },
    maxReminders: 3,
  };
  db.automationSettings.set(orgId, defaultAutomation);

  const defaultAI: AISettings = {
    id: `ai_${orgId}`,
    organizationId: orgId,
    communicationStyle: 'PROFESSIONAL',
    relationshipAwarePersonalization: true,
    reviewBeforeSending: true,
    customToneInstructions: 'Maintain calm, cordial, and strictly professional communication.',
  };
  db.aiSettings.set(orgId, defaultAI);

  const defaultSub: Subscription = {
    id: `sub_${orgId}`,
    organizationId: orgId,
    plan: 'FREE',
    status: 'ACTIVE',
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    cancelAtPeriodEnd: false,
    limits: getPlanLimits('FREE'),
  };
  db.subscriptions.set(orgId, defaultSub);

  const defaultUsage: Usage = {
    organizationId: orgId,
    month: new Date().toISOString().substring(0, 7),
    activeInvoicesCount: 0,
    remindersSentCount: 0,
    aiGenerationsCount: 0,
    connectedGmailAccounts: 0,
  };
  db.usage.set(orgId, defaultUsage);

  // Welcome notification
  const welcomeNotif: NotificationItem = {
    id: `notif_${Date.now()}`,
    organizationId: orgId,
    type: 'INFO',
    title: 'Workspace Initialized',
    message: `Welcome to InvoiceChaser! Your accounts receivable engine for ${org.name} is ready.`,
    actionUrl: '/app/dashboard',
    read: false,
    createdAt: new Date().toISOString(),
  };
  db.notifications.set(welcomeNotif.id, welcomeNotif);

  // Audit log
  await createAuditLog(orgId, {
    userId: user.id,
    eventType: 'WORKSPACE_CREATED',
    entityType: 'SETTINGS',
    entityId: orgId,
    message: `Created workspace ${org.name} for ${user.email}.`,
  });

  return { organization: org, membership };
}

export async function getUserOrganizations(userId: string): Promise<Organization[]> {
  await seedInitialDataIfNeeded();
  const orgs: Organization[] = [];
  for (const mem of db.memberships.values()) {
    if (mem.userId === userId) {
      const org = db.organizations.get(mem.organizationId);
      if (org) orgs.push(org);
    }
  }
  return orgs;
}

export async function getUserMembership(
  userId: string,
  organizationId: string
): Promise<Membership | null> {
  await seedInitialDataIfNeeded();
  for (const mem of db.memberships.values()) {
    if (mem.userId === userId && mem.organizationId === organizationId) {
      return mem;
    }
  }
  return null;
}

export async function getOrganizationById(id: string): Promise<Organization | null> {
  await seedInitialDataIfNeeded();
  return db.organizations.get(id) || null;
}

export async function updateOrganization(
  orgId: string,
  data: Partial<Pick<Organization, 'name' | 'timezone' | 'currency'>>
): Promise<Organization> {
  const org = await getOrganizationById(orgId);
  if (!org) throw new Error('Organization not found.');
  const updated: Organization = {
    ...org,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  db.organizations.set(orgId, updated);
  return updated;
}

/* -------------------------------------------------------------
   WORKSPACE SNAPSHOT
------------------------------------------------------------- */
export async function getWorkspaceSnapshot(userId: string, organizationId?: string) {
  await seedInitialDataIfNeeded();
  const orgs = await getUserOrganizations(userId);
  if (orgs.length === 0) {
    throw new Error('User has no organizations. Please create one.');
  }

  const selectedOrg = (organizationId && orgs.find((o) => o.id === organizationId)) || orgs[0];
  const membership = await getUserMembership(userId, selectedOrg.id);
  const automationSettings =
    db.automationSettings.get(selectedOrg.id) ||
    ({
      id: `auto_${selectedOrg.id}`,
      organizationId: selectedOrg.id,
      automaticReminders: true,
      automaticallyStopWhenPaid: true,
      avoidWeekends: true,
      preferredSendingTime: '10:00',
      timezone: selectedOrg.timezone,
      policyTier: 'STANDARD',
      policyIntervals: { firstReminderDays: 3, secondReminderDays: 10, finalReminderDays: 17 },
      maxReminders: 3,
    } as AutomationSettings);

  const aiSettings =
    db.aiSettings.get(selectedOrg.id) ||
    ({
      id: `ai_${selectedOrg.id}`,
      organizationId: selectedOrg.id,
      communicationStyle: 'PROFESSIONAL',
      relationshipAwarePersonalization: true,
      reviewBeforeSending: true,
      customToneInstructions: '',
    } as AISettings);

  const subscription =
    db.subscriptions.get(selectedOrg.id) ||
    ({
      id: `sub_${selectedOrg.id}`,
      organizationId: selectedOrg.id,
      plan: 'FREE',
      status: 'ACTIVE',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
      limits: getPlanLimits('FREE'),
    } as Subscription);

  const currentMonth = new Date().toISOString().substring(0, 7);
  let usage = db.usage.get(selectedOrg.id);
  if (!usage || usage.month !== currentMonth) {
    const activeInvCount = Array.from(db.invoices.values()).filter(
      (i) => i.organizationId === selectedOrg.id && i.status !== 'PAID' && i.status !== 'STOPPED'
    ).length;
    usage = {
      organizationId: selectedOrg.id,
      month: currentMonth,
      activeInvoicesCount: activeInvCount,
      remindersSentCount: usage ? usage.remindersSentCount : 0,
      aiGenerationsCount: usage ? usage.aiGenerationsCount : 0,
      connectedGmailAccounts: usage ? usage.connectedGmailAccounts : 0,
    };
    db.usage.set(selectedOrg.id, usage);
  }

  return {
    organization: selectedOrg,
    organizations: orgs,
    membership,
    automationSettings,
    aiSettings,
    subscription,
    usage,
  };
}

/* -------------------------------------------------------------
   CLIENTS OPERATIONS
------------------------------------------------------------- */
export async function getClients(orgId: string): Promise<Client[]> {
  await seedInitialDataIfNeeded();
  return Array.from(db.clients.values()).filter((c) => c.organizationId === orgId);
}

export async function getClientById(orgId: string, clientId: string): Promise<Client | null> {
  await seedInitialDataIfNeeded();
  const c = db.clients.get(clientId);
  if (c && c.organizationId === orgId) return c;
  return null;
}

export async function createClient(
  orgId: string,
  data: Omit<Client, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>
): Promise<Client> {
  await seedInitialDataIfNeeded();
  const id = `cli_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const client: Client = {
    ...data,
    id,
    organizationId: orgId,
    totalInvoiced: data.totalInvoiced || 0,
    totalPaid: data.totalPaid || 0,
    totalOutstanding: data.totalOutstanding || 0,
    paymentReliabilityScore: data.paymentReliabilityScore ?? 85,
    averagePaymentDelayDays: data.averagePaymentDelayDays ?? 0,
    neverContact: !!data.neverContact,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.clients.set(id, client);
  return client;
}

export async function updateClient(
  orgId: string,
  clientId: string,
  data: Partial<Client>
): Promise<Client> {
  const client = await getClientById(orgId, clientId);
  if (!client) throw new Error('Client not found.');
  const updated: Client = {
    ...client,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  db.clients.set(clientId, updated);
  return updated;
}

export async function deleteClient(orgId: string, clientId: string): Promise<boolean> {
  const client = await getClientById(orgId, clientId);
  if (!client) return false;
  db.clients.delete(clientId);
  return true;
}

export async function recalculateClientTotals(orgId: string, clientId: string) {
  const client = await getClientById(orgId, clientId);
  if (!client) return;

  const invoices = Array.from(db.invoices.values()).filter(
    (i) => i.organizationId === orgId && i.clientId === clientId
  );

  let totalInvoiced = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;

  for (const inv of invoices) {
    totalInvoiced += inv.invoiceAmount;
    if (inv.status === 'PAID') {
      totalPaid += inv.invoiceAmount;
    } else {
      totalOutstanding += inv.invoiceAmount;
    }
  }

  client.totalInvoiced = totalInvoiced;
  client.totalPaid = totalPaid;
  client.totalOutstanding = totalOutstanding;
  client.updatedAt = new Date().toISOString();
  db.clients.set(clientId, client);
}

/* -------------------------------------------------------------
   INVOICES OPERATIONS
------------------------------------------------------------- */
export async function getInvoices(orgId: string): Promise<Invoice[]> {
  await seedInitialDataIfNeeded();
  return Array.from(db.invoices.values()).filter((i) => i.organizationId === orgId);
}

export async function getInvoiceById(orgId: string, invoiceId: string): Promise<Invoice | null> {
  await seedInitialDataIfNeeded();
  const inv = db.invoices.get(invoiceId);
  if (inv && inv.organizationId === orgId) return inv;
  return null;
}

export async function createInvoice(
  orgId: string,
  data: Omit<Invoice, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>
): Promise<Invoice> {
  await seedInitialDataIfNeeded();
  const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const invoice: Invoice = {
    ...data,
    id,
    organizationId: orgId,
    isPaused: data.isPaused ?? false,
    reminderCount: data.reminderCount ?? 0,
    daysOverdue: data.daysOverdue ?? 0,
    status: data.status || 'DUE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.invoices.set(id, invoice);

  // Recalculate client financial totals
  if (invoice.clientId) {
    await recalculateClientTotals(orgId, invoice.clientId);
  }

  // Record audit log
  await createAuditLog(orgId, {
    eventType: 'INVOICE_CREATED',
    entityType: 'INVOICE',
    entityId: id,
    message: `Created invoice #${invoice.invoiceNumber} for ${invoice.clientName} (${invoice.currency} ${invoice.invoiceAmount.toLocaleString()}).`,
  });

  return invoice;
}

export async function updateInvoice(
  orgId: string,
  invoiceId: string,
  data: Partial<Invoice>
): Promise<Invoice> {
  const invoice = await getInvoiceById(orgId, invoiceId);
  if (!invoice) throw new Error('Invoice not found.');
  const updated: Invoice = {
    ...invoice,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  db.invoices.set(invoiceId, updated);

  if (updated.clientId) {
    await recalculateClientTotals(orgId, updated.clientId);
  }
  return updated;
}

export async function deleteInvoice(orgId: string, invoiceId: string): Promise<boolean> {
  const invoice = await getInvoiceById(orgId, invoiceId);
  if (!invoice) return false;
  db.invoices.delete(invoiceId);
  if (invoice.clientId) {
    await recalculateClientTotals(orgId, invoice.clientId);
  }
  return true;
}

export async function markInvoicePaid(orgId: string, invoiceId: string): Promise<Invoice> {
  const invoice = await getInvoiceById(orgId, invoiceId);
  if (!invoice) throw new Error('Invoice not found.');

  invoice.status = 'PAID';
  invoice.paymentReceivedAt = new Date().toISOString();
  invoice.daysOverdue = 0;
  invoice.nextReminderAt = undefined;
  invoice.updatedAt = new Date().toISOString();
  db.invoices.set(invoiceId, invoice);

  // Cancel any scheduled / pending approval reminders for this invoice
  let cancelledCount = 0;
  for (const rem of db.reminders.values()) {
    if (rem.organizationId === orgId && rem.invoiceId === invoiceId) {
      if (rem.status === 'SCHEDULED' || rem.status === 'PENDING_APPROVAL' || rem.status === 'GENERATING') {
        rem.status = 'CANCELLED';
        rem.updatedAt = new Date().toISOString();
        db.reminders.set(rem.id, rem);
        cancelledCount++;
      }
    }
  }

  // Recalculate client finances
  if (invoice.clientId) {
    await recalculateClientTotals(orgId, invoice.clientId);
  }

  // Audit Log
  await createAuditLog(orgId, {
    eventType: 'INVOICE_MARKED_PAID',
    entityType: 'INVOICE',
    entityId: invoiceId,
    message: `Invoice #${invoice.invoiceNumber} marked as PAID. ${cancelledCount} pending reminder(s) cancelled automatically.`,
  });

  // Notification
  const notif: NotificationItem = {
    id: `notif_${Date.now()}`,
    organizationId: orgId,
    type: 'SUCCESS',
    title: 'Payment Detected & Follow-ups Stopped',
    message: `Invoice #${invoice.invoiceNumber} (${invoice.currency} ${invoice.invoiceAmount.toLocaleString()}) was marked PAID.`,
    actionUrl: `/app/invoices/${invoice.id}`,
    read: false,
    createdAt: new Date().toISOString(),
  };
  db.notifications.set(notif.id, notif);

  return invoice;
}

export async function pauseInvoice(orgId: string, invoiceId: string): Promise<Invoice> {
  const invoice = await getInvoiceById(orgId, invoiceId);
  if (!invoice) throw new Error('Invoice not found.');
  invoice.isPaused = true;
  invoice.updatedAt = new Date().toISOString();
  db.invoices.set(invoiceId, invoice);

  await createAuditLog(orgId, {
    eventType: 'INVOICE_PAUSED',
    entityType: 'INVOICE',
    entityId: invoiceId,
    message: `Automated reminders paused for Invoice #${invoice.invoiceNumber}.`,
  });
  return invoice;
}

export async function resumeInvoice(orgId: string, invoiceId: string): Promise<Invoice> {
  const invoice = await getInvoiceById(orgId, invoiceId);
  if (!invoice) throw new Error('Invoice not found.');
  invoice.isPaused = false;
  invoice.updatedAt = new Date().toISOString();
  db.invoices.set(invoiceId, invoice);

  await createAuditLog(orgId, {
    eventType: 'INVOICE_RESUMED',
    entityType: 'INVOICE',
    entityId: invoiceId,
    message: `Automated reminders resumed for Invoice #${invoice.invoiceNumber}.`,
  });
  return invoice;
}

export async function disputeInvoice(orgId: string, invoiceId: string): Promise<Invoice> {
  const invoice = await getInvoiceById(orgId, invoiceId);
  if (!invoice) throw new Error('Invoice not found.');
  invoice.status = 'DISPUTED';
  invoice.isPaused = true;
  invoice.updatedAt = new Date().toISOString();
  db.invoices.set(invoiceId, invoice);

  await createAuditLog(orgId, {
    eventType: 'INVOICE_DISPUTED',
    entityType: 'INVOICE',
    entityId: invoiceId,
    message: `Invoice #${invoice.invoiceNumber} marked as DISPUTED. Reminders halted.`,
  });
  return invoice;
}

/* -------------------------------------------------------------
   REMINDERS OPERATIONS
------------------------------------------------------------- */
export async function getReminders(orgId: string): Promise<Reminder[]> {
  await seedInitialDataIfNeeded();
  return Array.from(db.reminders.values()).filter((r) => r.organizationId === orgId);
}

export async function getReminderById(orgId: string, reminderId: string): Promise<Reminder | null> {
  await seedInitialDataIfNeeded();
  const r = db.reminders.get(reminderId);
  if (r && r.organizationId === orgId) return r;
  return null;
}

export async function createReminder(
  orgId: string,
  data: Omit<Reminder, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>
): Promise<Reminder> {
  await seedInitialDataIfNeeded();
  const id = `rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const reminder: Reminder = {
    ...data,
    id,
    organizationId: orgId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.reminders.set(id, reminder);

  await createAuditLog(orgId, {
    eventType: 'REMINDER_CREATED',
    entityType: 'REMINDER',
    entityId: id,
    message: `Reminder draft (Step ${reminder.sequenceNumber}) prepared for Invoice #${reminder.invoiceId}.`,
  });

  return reminder;
}

export async function updateReminder(
  orgId: string,
  reminderId: string,
  data: Partial<Reminder>
): Promise<Reminder> {
  const reminder = await getReminderById(orgId, reminderId);
  if (!reminder) throw new Error('Reminder not found.');
  const updated: Reminder = {
    ...reminder,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  db.reminders.set(reminderId, updated);
  return updated;
}

export async function approveAndSendReminder(
  orgId: string,
  reminderId: string,
  senderEmail?: string
): Promise<{ reminder: Reminder; emailEvent: EmailEvent }> {
  const reminder = await getReminderById(orgId, reminderId);
  if (!reminder) throw new Error('Reminder not found.');

  const invoice = await getInvoiceById(orgId, reminder.invoiceId);
  const client = await getClientById(orgId, reminder.clientId);

  reminder.status = 'SENT';
  reminder.approvedByUser = true;
  reminder.requiresReview = false;
  reminder.sentAt = new Date().toISOString();
  reminder.gmailMessageId = `msg_gmail_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  reminder.updatedAt = new Date().toISOString();
  db.reminders.set(reminderId, reminder);

  // Update invoice last reminder timestamp & status
  if (invoice) {
    invoice.lastReminderAt = reminder.sentAt;
    invoice.reminderCount = (invoice.reminderCount || 0) + 1;
    if (reminder.sequenceNumber === 1) invoice.status = 'REMINDER_1';
    else if (reminder.sequenceNumber === 2) invoice.status = 'REMINDER_2';
    else if (reminder.sequenceNumber === 3) invoice.status = 'FINAL_NOTICE';
    invoice.updatedAt = new Date().toISOString();
    db.invoices.set(invoice.id, invoice);
  }

  // Create Outbound Email Event
  const emailEventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const emailEvent: EmailEvent = {
    id: emailEventId,
    organizationId: orgId,
    invoiceId: reminder.invoiceId,
    clientId: reminder.clientId,
    gmailMessageId: reminder.gmailMessageId,
    direction: 'OUTBOUND',
    eventType: 'REMINDER_SENT',
    subject: reminder.subject,
    sender: senderEmail || 'accounts@invoiceweb.ai',
    recipient: invoice?.clientEmail || client?.email || 'client@example.com',
    bodyPreview: reminder.body.substring(0, 160) + (reminder.body.length > 160 ? '...' : ''),
    eventTimestamp: reminder.sentAt,
    createdAt: reminder.sentAt,
  };
  db.emailEvents.set(emailEventId, emailEvent);

  // Audit log
  await createAuditLog(orgId, {
    eventType: 'REMINDER_SENT',
    entityType: 'REMINDER',
    entityId: reminderId,
    message: `Sent Reminder #${reminder.sequenceNumber} to ${emailEvent.recipient} for Invoice #${invoice?.invoiceNumber || reminder.invoiceId}.`,
  });

  // Increment usage count
  await incrementUsage(orgId, 'remindersSentCount', 1);

  return { reminder, emailEvent };
}

export async function cancelReminder(orgId: string, reminderId: string): Promise<Reminder> {
  const reminder = await getReminderById(orgId, reminderId);
  if (!reminder) throw new Error('Reminder not found.');
  reminder.status = 'CANCELLED';
  reminder.updatedAt = new Date().toISOString();
  db.reminders.set(reminderId, reminder);

  await createAuditLog(orgId, {
    eventType: 'REMINDER_CANCELLED',
    entityType: 'REMINDER',
    entityId: reminderId,
    message: `Cancelled follow-up reminder #${reminder.sequenceNumber} for Invoice #${reminder.invoiceId}.`,
  });

  return reminder;
}

/* -------------------------------------------------------------
   EMAIL EVENTS & AUDIT LOGS
------------------------------------------------------------- */
export async function getEmailEvents(orgId: string): Promise<EmailEvent[]> {
  await seedInitialDataIfNeeded();
  return Array.from(db.emailEvents.values())
    .filter((e) => e.organizationId === orgId)
    .sort((a, b) => new Date(b.eventTimestamp).getTime() - new Date(a.eventTimestamp).getTime());
}

export async function getAuditLogs(orgId: string): Promise<AuditLog[]> {
  await seedInitialDataIfNeeded();
  return Array.from(db.auditLogs.values())
    .filter((a) => a.organizationId === orgId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createAuditLog(
  orgId: string,
  data: Omit<AuditLog, 'id' | 'organizationId' | 'createdAt'>
): Promise<AuditLog> {
  await seedInitialDataIfNeeded();
  const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const log: AuditLog = {
    ...data,
    id,
    organizationId: orgId,
    createdAt: new Date().toISOString(),
  };
  db.auditLogs.set(id, log);
  return log;
}

/* -------------------------------------------------------------
   CONNECTIONS OPERATIONS
------------------------------------------------------------- */
export async function getConnections(orgId: string): Promise<Connection[]> {
  await seedInitialDataIfNeeded();
  return Array.from(db.connections.values()).filter((c) => c.organizationId === orgId);
}

export async function upsertConnection(
  orgId: string,
  provider: 'GMAIL' | 'GOOGLE_SHEETS',
  data: Partial<Connection>
): Promise<Connection> {
  await seedInitialDataIfNeeded();
  const key = `${orgId}_${provider}`;
  const existing = db.connections.get(key);

  const conn: Connection = {
    id: existing?.id || `conn_${provider.toLowerCase()}_${Date.now()}`,
    organizationId: orgId,
    provider,
    status: data.status || 'CONNECTED',
    accountIdentifier: data.accountIdentifier || existing?.accountIdentifier || 'connected@account.com',
    scopes: data.scopes || existing?.scopes || ['https://www.googleapis.com/auth/userinfo.email'],
    lastSyncAt: new Date().toISOString(),
    sheetMetadata: data.sheetMetadata || existing?.sheetMetadata,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.connections.set(key, conn);

  await createAuditLog(orgId, {
    eventType: 'CONNECTION_UPDATED',
    entityType: 'CONNECTION',
    entityId: conn.id,
    message: `Updated integration ${provider} (${conn.status}).`,
  });

  return conn;
}

export async function disconnectConnection(
  orgId: string,
  provider: 'GMAIL' | 'GOOGLE_SHEETS'
): Promise<Connection> {
  const key = `${orgId}_${provider}`;
  const existing = db.connections.get(key);
  if (!existing) {
    const conn: Connection = {
      id: `conn_${provider.toLowerCase()}_${Date.now()}`,
      organizationId: orgId,
      provider,
      status: 'DISCONNECTED',
      accountIdentifier: '',
      scopes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.connections.set(key, conn);
    return conn;
  }

  existing.status = 'DISCONNECTED';
  existing.updatedAt = new Date().toISOString();
  db.connections.set(key, existing);

  await createAuditLog(orgId, {
    eventType: 'CONNECTION_DISCONNECTED',
    entityType: 'CONNECTION',
    entityId: existing.id,
    message: `Disconnected integration ${provider}.`,
  });

  return existing;
}

/* -------------------------------------------------------------
   SETTINGS & SUBSCRIPTIONS & NOTIFICATIONS
------------------------------------------------------------- */
export async function updateAutomationSettings(
  orgId: string,
  data: Partial<AutomationSettings>
): Promise<AutomationSettings> {
  await seedInitialDataIfNeeded();
  const current =
    db.automationSettings.get(orgId) ||
    ({
      id: `auto_${orgId}`,
      organizationId: orgId,
      automaticReminders: true,
      automaticallyStopWhenPaid: true,
      avoidWeekends: true,
      preferredSendingTime: '10:00',
      timezone: 'Asia/Kolkata',
      policyTier: 'STANDARD',
      policyIntervals: { firstReminderDays: 3, secondReminderDays: 10, finalReminderDays: 17 },
      maxReminders: 3,
    } as AutomationSettings);

  const updated: AutomationSettings = {
    ...current,
    ...data,
  };
  db.automationSettings.set(orgId, updated);
  return updated;
}

export async function updateAISettings(
  orgId: string,
  data: Partial<AISettings>
): Promise<AISettings> {
  await seedInitialDataIfNeeded();
  const current =
    db.aiSettings.get(orgId) ||
    ({
      id: `ai_${orgId}`,
      organizationId: orgId,
      communicationStyle: 'PROFESSIONAL',
      relationshipAwarePersonalization: true,
      reviewBeforeSending: true,
      customToneInstructions: '',
    } as AISettings);

  const updated: AISettings = {
    ...current,
    ...data,
  };
  db.aiSettings.set(orgId, updated);
  return updated;
}

export async function updateSubscriptionPlan(
  orgId: string,
  plan: SubscriptionPlan
): Promise<Subscription> {
  await seedInitialDataIfNeeded();
  const current =
    db.subscriptions.get(orgId) ||
    ({
      id: `sub_${orgId}`,
      organizationId: orgId,
      plan: 'FREE',
      status: 'ACTIVE',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
      limits: getPlanLimits('FREE'),
    } as Subscription);

  const updated: Subscription = {
    ...current,
    plan,
    limits: getPlanLimits(plan),
  };
  db.subscriptions.set(orgId, updated);

  await createAuditLog(orgId, {
    eventType: 'SUBSCRIPTION_UPGRADED',
    entityType: 'BILLING',
    entityId: updated.id,
    message: `Plan upgraded to ${plan}.`,
  });

  return updated;
}

export async function incrementUsage(
  orgId: string,
  field: 'remindersSentCount' | 'aiGenerationsCount' | 'activeInvoicesCount' | 'connectedGmailAccounts',
  amount: number = 1
) {
  await seedInitialDataIfNeeded();
  const currentMonth = new Date().toISOString().substring(0, 7);
  let usage = db.usage.get(orgId);
  if (!usage || usage.month !== currentMonth) {
    usage = {
      organizationId: orgId,
      month: currentMonth,
      activeInvoicesCount: 0,
      remindersSentCount: 0,
      aiGenerationsCount: 0,
      connectedGmailAccounts: 0,
    };
  }
  usage[field] = (usage[field] || 0) + amount;
  db.usage.set(orgId, usage);
}

export async function getNotifications(orgId: string): Promise<NotificationItem[]> {
  await seedInitialDataIfNeeded();
  return Array.from(db.notifications.values())
    .filter((n) => n.organizationId === orgId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function markNotificationRead(orgId: string, notifId: string): Promise<boolean> {
  const notif = db.notifications.get(notifId);
  if (notif && notif.organizationId === orgId) {
    notif.read = true;
    db.notifications.set(notifId, notif);
    return true;
  }
  return false;
}

export async function markAllNotificationsRead(orgId: string): Promise<void> {
  for (const notif of db.notifications.values()) {
    if (notif.organizationId === orgId) {
      notif.read = true;
      db.notifications.set(notif.id, notif);
    }
  }
}
