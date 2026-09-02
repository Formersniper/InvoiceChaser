export type RelationshipType = 'NEW' | 'REGULAR' | 'VIP' | 'DELICATE' | 'LATE_PAYER' | 'DISPUTED';

export type InvoiceStatus = 
  | 'DRAFT'
  | 'SENT'
  | 'DUE'
  | 'OVERDUE'
  | 'REMINDER_1'
  | 'REMINDER_2'
  | 'FINAL_NOTICE'
  | 'PAID'
  | 'STOPPED'
  | 'FAILED'
  | 'DISPUTED';

export type ReminderStatus = 
  | 'SCHEDULED'
  | 'GENERATING'
  | 'PENDING_APPROVAL'
  | 'SENT'
  | 'CANCELLED'
  | 'FAILED'
  | 'SKIPPED';

export type EmailDirection = 'INBOUND' | 'OUTBOUND';

export type EmailEventType = 
  | 'INVOICE_SENT'
  | 'REMINDER_SENT'
  | 'CLIENT_REPLY'
  | 'PAYMENT_CONFIRMATION'
  | 'OTHER';

export type ConnectionProvider = 'GMAIL' | 'GOOGLE_SHEETS';
export type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'EXPIRED' | 'ERROR';

export type ReminderPolicyTier = 'GENTLE' | 'STANDARD' | 'FIRM' | 'CUSTOM';

export type CommunicationStyle = 'FRIENDLY' | 'PROFESSIONAL' | 'FIRM';

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

export type SubscriptionPlan = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'BUSINESS';
export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerUserId: string;
  timezone: string;
  currency: string; // e.g. INR, USD, EUR, GBP
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  organizationId: string;
  userId: string;
  role: UserRole;
  createdAt: string;
}

export interface Client {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  companyName: string;
  relationshipType: RelationshipType;
  paymentReliabilityScore: number; // 0 - 100
  averagePaymentDelayDays: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  neverContact: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  organizationId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  companyName: string;
  invoiceNumber: string;
  invoiceAmount: number;
  currency: string;
  invoiceDate: string;
  dueDate: string;
  status: InvoiceStatus;
  daysOverdue: number;
  source: 'GMAIL' | 'GOOGLE_SHEETS' | 'MANUAL';
  sourceReference?: string;
  lastReminderAt?: string;
  reminderCount: number;
  nextReminderAt?: string;
  paymentReceivedAt?: string;
  isPaused: boolean;
  extractionConfidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  organizationId: string;
  invoiceId: string;
  clientId: string;
  sequenceNumber: 1 | 2 | 3;
  scheduledAt: string;
  sentAt?: string;
  status: ReminderStatus;
  tone: CommunicationStyle;
  subject: string;
  body: string;
  gmailMessageId?: string;
  aiGenerated: boolean;
  approvedByUser: boolean;
  requiresReview: boolean;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailEvent {
  id: string;
  organizationId: string;
  invoiceId?: string;
  clientId?: string;
  gmailMessageId?: string;
  threadId?: string;
  direction: EmailDirection;
  eventType: EmailEventType;
  subject: string;
  sender: string;
  recipient: string;
  bodyPreview?: string;
  eventTimestamp: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AutomationJob {
  id: string;
  organizationId: string;
  invoiceId?: string;
  jobType: 'INVOICE_DETECTION' | 'INVOICE_NORMALIZATION' | 'REMINDER_CHECK' | 'REMINDER_GENERATION' | 'REMINDER_SEND' | 'PAYMENT_CHECK' | 'PAYMENT_STOP';
  scheduledAt: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  attemptCount: number;
  lastError?: string;
  executedAt?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  userId?: string;
  eventType: string;
  entityType: 'INVOICE' | 'REMINDER' | 'CLIENT' | 'CONNECTION' | 'SETTINGS' | 'BILLING' | 'ORGANIZATION' | 'INTEGRATION' | 'SUBSCRIPTION' | 'AUTH';
  entityId: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Connection {
  id: string;
  organizationId: string;
  provider: ConnectionProvider;
  status: ConnectionStatus;
  accountIdentifier: string;
  scopes: string[];
  lastSyncAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  sheetMetadata?: {
    spreadsheetId?: string;
    spreadsheetName?: string;
    sheetName?: string;
    columnMapping?: {
      invoiceNumber: string;
      clientName: string;
      clientEmail: string;
      amount: string;
      currency: string;
      invoiceDate: string;
      dueDate: string;
      status: string;
      notes: string;
    };
  };
}

export interface AutomationSettings {
  id: string;
  organizationId: string;
  automaticReminders: boolean;
  automaticallyStopWhenPaid: boolean;
  avoidWeekends: boolean;
  preferredSendingTime: string; // e.g. "10:00"
  timezone: string;
  policyTier: ReminderPolicyTier;
  policyIntervals: {
    firstReminderDays: number; // days after due date
    secondReminderDays: number;
    finalReminderDays: number;
  };
  maxReminders: number; // default 3
}

export interface AISettings {
  id: string;
  organizationId: string;
  communicationStyle: CommunicationStyle;
  relationshipAwarePersonalization: boolean;
  reviewBeforeSending: boolean;
  customToneInstructions?: string;
}

export interface PlanLimits {
  activeInvoices: number;
  remindersPerMonth: number;
  gmailAccounts: number;
  aiReminders: boolean;
  relationshipIntelligence: boolean;
  customRules: boolean;
  teamMembers: number;
}

export interface Subscription {
  id: string;
  organizationId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  limits: PlanLimits;
}

export interface Usage {
  organizationId: string;
  month: string; // e.g. "2026-09"
  activeInvoicesCount: number;
  remindersSentCount: number;
  remindersSentThisMonth?: number;
  aiGenerationsCount: number;
  connectedGmailAccounts: number;
}

export interface NotificationItem {
  id: string;
  organizationId: string;
  type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  title: string;
  message: string;
  actionUrl?: string;
  read: boolean;
  createdAt: string;
}
