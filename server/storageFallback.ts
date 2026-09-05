import fs from 'fs';
import path from 'path';
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
} from '../src/types';

export interface GmailConnectionSecrets {
  id: string;
  organizationId: string;
  status: string;
  accountIdentifier: string;
  encryptedAccessToken?: string;
  encryptedRefreshToken?: string;
  tokenExpiresAt?: string;
  scopes: string[];
}

interface LocalStoreData {
  users: Record<string, User>;
  organizations: Record<string, Organization>;
  memberships: Record<string, Membership>;
  clients: Record<string, Client>;
  invoices: Record<string, Invoice>;
  reminders: Record<string, Reminder>;
  emailEvents: Record<string, EmailEvent>;
  auditLogs: Record<string, AuditLog>;
  connections: Record<string, Connection>;
  connectionSecrets: Record<string, GmailConnectionSecrets>;
  automationSettings: Record<string, AutomationSettings>;
  aiSettings: Record<string, AISettings>;
  subscriptions: Record<string, Subscription>;
  usage: Record<string, Usage>;
  notifications: Record<string, NotificationItem>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

let inMemoryStore: LocalStoreData | null = null;

function loadStore(): LocalStoreData {
  if (inMemoryStore) return inMemoryStore;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      inMemoryStore = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to read local storage file, starting fresh in-memory:', err);
  }

  if (!inMemoryStore) {
    inMemoryStore = {
      users: {},
      organizations: {},
      memberships: {},
      clients: {},
      invoices: {},
      reminders: {},
      emailEvents: {},
      auditLogs: {},
      connections: {},
      connectionSecrets: {},
      automationSettings: {},
      aiSettings: {},
      subscriptions: {},
      usage: {},
      notifications: {},
    };
  }

  return inMemoryStore;
}

function persistStore(): void {
  try {
    if (!inMemoryStore) return;
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(inMemoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to persist store to disk:', err);
  }
}

export function isSchemaCacheMissing(error: any): boolean {
  if (!error) return false;
  const msg = (typeof error === 'string' ? error : `${error.message || ''} ${error.details || ''} ${error.hint || ''} ${JSON.stringify(error)}`).toLowerCase();
  const code = String(error.code || '');
  return (
    code.startsWith('PGRST') ||
    msg.includes('schema cache') ||
    msg.includes('could not find the table') ||
    (msg.includes('relation') && msg.includes('does not exist')) ||
    msg.includes('pgrst')
  );
}

// ============================================================================
// STORE OPERATIONS
// ============================================================================

export const localStore = {
  // Users
  getUser(id: string): User | null {
    const s = loadStore();
    return s.users[id] || null;
  },
  getUserByEmail(email: string): User | null {
    const s = loadStore();
    const normalized = email.trim().toLowerCase();
    return Object.values(s.users).find((u) => u.email.toLowerCase() === normalized) || null;
  },
  upsertUser(user: User): User {
    const s = loadStore();
    s.users[user.id] = user;
    persistStore();
    return user;
  },

  // Organizations
  getOrganization(id: string): Organization | null {
    const s = loadStore();
    return s.organizations[id] || null;
  },
  upsertOrganization(org: Organization): Organization {
    const s = loadStore();
    s.organizations[org.id] = org;
    persistStore();
    return org;
  },
  getUserOrganizations(userId: string): Organization[] {
    const s = loadStore();
    const userMemOrgIds = Object.values(s.memberships)
      .filter((m) => m.userId === userId)
      .map((m) => m.organizationId);

    return Object.values(s.organizations).filter((o) => userMemOrgIds.includes(o.id));
  },

  // Memberships
  getMembership(userId: string, orgId: string): Membership | null {
    const s = loadStore();
    return (
      Object.values(s.memberships).find(
        (m) => m.userId === userId && m.organizationId === orgId
      ) || null
    );
  },
  upsertMembership(m: Membership): Membership {
    const s = loadStore();
    s.memberships[m.id] = m;
    persistStore();
    return m;
  },

  // Connections
  getConnections(orgId: string): Connection[] {
    const s = loadStore();
    return Object.values(s.connections).filter((c) => c.organizationId === orgId);
  },
  getConnection(orgId: string, provider: string): Connection | null {
    const s = loadStore();
    return (
      Object.values(s.connections).find(
        (c) => c.organizationId === orgId && c.provider === provider
      ) || null
    );
  },
  upsertConnection(conn: Connection): Connection {
    const s = loadStore();
    s.connections[conn.id] = conn;
    persistStore();
    return conn;
  },
  getConnectionSecrets(orgId: string): GmailConnectionSecrets | null {
    const s = loadStore();
    return s.connectionSecrets[orgId] || null;
  },
  saveConnectionSecrets(orgId: string, secrets: GmailConnectionSecrets): void {
    const s = loadStore();
    s.connectionSecrets[orgId] = secrets;
    persistStore();
  },

  // Automation Settings
  getAutomationSettings(orgId: string): AutomationSettings | null {
    const s = loadStore();
    return s.automationSettings[orgId] || null;
  },
  upsertAutomationSettings(settings: AutomationSettings): AutomationSettings {
    const s = loadStore();
    s.automationSettings[settings.organizationId] = settings;
    persistStore();
    return settings;
  },

  // AI Settings
  getAISettings(orgId: string): AISettings | null {
    const s = loadStore();
    return s.aiSettings[orgId] || null;
  },
  upsertAISettings(settings: AISettings): AISettings {
    const s = loadStore();
    s.aiSettings[settings.organizationId] = settings;
    persistStore();
    return settings;
  },

  // Subscription
  getSubscription(orgId: string): Subscription | null {
    const s = loadStore();
    return s.subscriptions[orgId] || null;
  },
  upsertSubscription(sub: Subscription): Subscription {
    const s = loadStore();
    s.subscriptions[sub.organizationId] = sub;
    persistStore();
    return sub;
  },

  // Usage
  getUsage(orgId: string): Usage | null {
    const s = loadStore();
    return s.usage[orgId] || null;
  },
  upsertUsage(u: Usage): Usage {
    const s = loadStore();
    s.usage[u.organizationId] = u;
    persistStore();
    return u;
  },

  // Notifications
  getNotifications(orgId: string): NotificationItem[] {
    const s = loadStore();
    return Object.values(s.notifications).filter((n) => n.organizationId === orgId);
  },
  addNotification(n: NotificationItem): NotificationItem {
    const s = loadStore();
    s.notifications[n.id] = n;
    persistStore();
    return n;
  },

  // Audit logs
  getAuditLogs(orgId: string): AuditLog[] {
    const s = loadStore();
    return Object.values(s.auditLogs).filter((a) => a.organizationId === orgId);
  },
  addAuditLog(a: AuditLog): AuditLog {
    const s = loadStore();
    s.auditLogs[a.id] = a;
    persistStore();
    return a;
  },

  // Clients
  getClients(orgId: string): Client[] {
    const s = loadStore();
    return Object.values(s.clients).filter((c) => c.organizationId === orgId);
  },
  getClient(orgId: string, id: string): Client | null {
    const s = loadStore();
    const c = s.clients[id];
    return c && c.organizationId === orgId ? c : null;
  },
  upsertClient(c: Client): Client {
    const s = loadStore();
    s.clients[c.id] = c;
    persistStore();
    return c;
  },
  deleteClient(id: string): void {
    const s = loadStore();
    delete s.clients[id];
    persistStore();
  },

  // Invoices
  getInvoices(orgId: string): Invoice[] {
    const s = loadStore();
    return Object.values(s.invoices).filter((i) => i.organizationId === orgId);
  },
  getInvoice(orgId: string, id: string): Invoice | null {
    const s = loadStore();
    const inv = s.invoices[id];
    return inv && inv.organizationId === orgId ? inv : null;
  },
  upsertInvoice(inv: Invoice): Invoice {
    const s = loadStore();
    s.invoices[inv.id] = inv;
    persistStore();
    return inv;
  },
  deleteInvoice(id: string): void {
    const s = loadStore();
    delete s.invoices[id];
    persistStore();
  },

  // Reminders
  getReminders(orgId: string): Reminder[] {
    const s = loadStore();
    return Object.values(s.reminders).filter((r) => r.organizationId === orgId);
  },
  getReminder(orgId: string, id: string): Reminder | null {
    const s = loadStore();
    const r = s.reminders[id];
    return r && r.organizationId === orgId ? r : null;
  },
  upsertReminder(r: Reminder): Reminder {
    const s = loadStore();
    s.reminders[r.id] = r;
    persistStore();
    return r;
  },
  deleteReminder(id: string): void {
    const s = loadStore();
    delete s.reminders[id];
    persistStore();
  },

  // Notifications update helpers
  markNotificationRead(orgId: string, id: string): void {
    const s = loadStore();
    if (s.notifications[id] && s.notifications[id].organizationId === orgId) {
      s.notifications[id].read = true;
      persistStore();
    }
  },
  markAllNotificationsRead(orgId: string): void {
    const s = loadStore();
    Object.values(s.notifications).forEach((n) => {
      if (n.organizationId === orgId) n.read = true;
    });
    persistStore();
  },

  // Email events
  getEmailEvents(orgId: string): EmailEvent[] {
    const s = loadStore();
    return Object.values(s.emailEvents).filter((e) => e.organizationId === orgId);
  },
  addEmailEvent(e: EmailEvent): EmailEvent {
    const s = loadStore();
    s.emailEvents[e.id] = e;
    persistStore();
    return e;
  },
};


