import { getSupabase } from './supabase';
import { localStore, isSchemaCacheMissing } from './storageFallback';
import {
  User,
  Organization,
  Membership,
  Client,
  Invoice,
  InvoiceStatus,
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
  CommunicationStyle,
  ReminderDraftUpdate,
  CreateInvoiceInput,
  UpdateInvoiceInput,
} from '../src/types';

// ============================================================================
// PLAN LIMITS HELPER
// ============================================================================
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

// ============================================================================
// ROW MAPPER HELPERS (PostgreSQL snake_case <-> TypeScript camelCase)
// ============================================================================
function mapUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(row.name)}`,
  };
}

function mapOrganization(row: any): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    ownerUserId: row.owner_user_id,
    timezone: row.timezone || 'Asia/Kolkata',
    currency: row.currency || 'INR',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMembership(row: any): Membership {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    role: row.role || 'owner',
    createdAt: row.created_at,
  };
}

function mapClient(row: any): Client {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    email: row.email,
    companyName: row.company_name,
    relationshipType: row.relationship_type || 'REGULAR',
    paymentReliabilityScore: Number(row.payment_reliability_score ?? 85),
    averagePaymentDelayDays: Number(row.average_payment_delay_days ?? 0),
    totalInvoiced: Number(row.total_invoiced ?? 0),
    totalPaid: Number(row.total_paid ?? 0),
    totalOutstanding: Number(row.total_outstanding ?? 0),
    neverContact: Boolean(row.never_contact),
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapInvoice(row: any): Invoice {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientId: row.client_id || '',
    clientName: row.client_name,
    clientEmail: row.client_email,
    companyName: row.company_name || undefined,
    invoiceNumber: row.invoice_number,
    invoiceAmount: Number(row.invoice_amount),
    currency: row.currency || 'INR',
    invoiceDate: row.invoice_date,
    dueDate: row.due_date,
    status: row.status,
    daysOverdue: Number(row.days_overdue ?? 0),
    source: row.source || 'MANUAL',
    sourceReference: row.source_reference || undefined,
    lastReminderAt: row.last_reminder_at || undefined,
    reminderCount: Number(row.reminder_count ?? 0),
    nextReminderAt: row.next_reminder_at || undefined,
    paymentReceivedAt: row.payment_received_at || undefined,
    isPaused: Boolean(row.is_paused),
    extractionConfidence: row.extraction_confidence || 'HIGH',
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReminder(row: any): Reminder {
  return {
    id: row.id,
    organizationId: row.organization_id,
    invoiceId: row.invoice_id,
    clientId: row.client_id,
    sequenceNumber: (Number(row.sequence_number) as 1 | 2 | 3) || 1,
    scheduledAt: row.scheduled_at,
    sentAt: row.sent_at || undefined,
    status: row.status,
    tone: row.tone || 'PROFESSIONAL',
    subject: row.subject,
    body: row.body,
    gmailMessageId: row.gmail_message_id || undefined,
    aiGenerated: Boolean(row.ai_generated),
    approvedByUser: Boolean(row.approved_by_user),
    requiresReview: Boolean(row.requires_review),
    lastError: row.last_error || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEmailEvent(row: any): EmailEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    invoiceId: row.invoice_id || undefined,
    clientId: row.client_id || undefined,
    gmailMessageId: row.gmail_message_id || undefined,
    threadId: row.thread_id || undefined,
    direction: row.direction || 'OUTBOUND',
    eventType: row.event_type,
    subject: row.subject,
    sender: row.sender,
    recipient: row.recipient,
    bodyPreview: row.body_preview || undefined,
    eventTimestamp: row.event_timestamp || row.created_at,
    metadata: row.metadata || undefined,
    createdAt: row.created_at,
  };
}

function mapAuditLog(row: any): AuditLog {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id || undefined,
    eventType: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    message: row.message,
    createdAt: row.created_at,
    metadata: row.metadata || undefined,
  };
}

function mapConnection(row: any): Connection {
  return {
    id: row.id,
    organizationId: row.organization_id,
    provider: row.provider,
    status: row.status,
    accountIdentifier: row.account_identifier,
    scopes: Array.isArray(row.scopes) ? row.scopes : [],
    lastSyncAt: row.last_sync_at || undefined,
    lastTestedAt: row.last_tested_at || undefined,
    lastError: row.last_error || undefined,
    errorMessage: row.error_message || row.last_error || undefined,
    sheetMetadata: row.sheet_metadata || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAutomationSettings(row: any): AutomationSettings {
  return {
    id: row.id,
    organizationId: row.organization_id,
    automaticReminders: Boolean(row.automatic_reminders),
    automaticallyStopWhenPaid: Boolean(row.automatically_stop_when_paid),
    avoidWeekends: Boolean(row.avoid_weekends),
    preferredSendingTime: row.preferred_sending_time || '10:00',
    timezone: row.timezone || 'Asia/Kolkata',
    policyTier: row.policy_tier || 'STANDARD',
    policyIntervals: row.policy_intervals || {
      firstReminderDays: 3,
      secondReminderDays: 10,
      finalReminderDays: 17,
    },
    maxReminders: Number(row.max_reminders ?? 3),
  };
}

function mapAISettings(row: any): AISettings {
  return {
    id: row.id,
    organizationId: row.organization_id,
    communicationStyle: row.communication_style || 'PROFESSIONAL',
    relationshipAwarePersonalization: Boolean(row.relationship_aware_personalization),
    reviewBeforeSending: Boolean(row.review_before_sending),
    customToneInstructions: row.custom_tone_instructions || undefined,
  };
}

function mapSubscription(row: any): Subscription {
  return {
    id: row.id,
    organizationId: row.organization_id,
    plan: row.plan || 'FREE',
    status: row.status || 'ACTIVE',
    currentPeriodStart: row.current_period_start || new Date().toISOString(),
    currentPeriodEnd: row.current_period_end || new Date(Date.now() + 30 * 86400000).toISOString(),
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    limits: row.limits || getPlanLimits(row.plan || 'FREE'),
  };
}

function mapUsage(row: any): Usage {
  return {
    organizationId: row.organization_id,
    month: row.month,
    activeInvoicesCount: Number(row.active_invoices_count ?? 0),
    remindersSentCount: Number(row.reminders_sent_count ?? 0),
    aiGenerationsCount: Number(row.ai_generations_count ?? 0),
    connectedGmailAccounts: Number(row.connected_gmail_accounts ?? 0),
  };
}

function mapNotification(row: any): NotificationItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    type: row.type || 'INFO',
    title: row.title,
    message: row.message,
    actionUrl: row.action_url || undefined,
    read: Boolean(row.read),
    createdAt: row.created_at,
  };
}

// ============================================================================
// USERS OPERATIONS (Authoritative Supabase PostgreSQL)
// ============================================================================
export async function findUserById(id: string): Promise<User | null> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        return localStore.getUser(id);
      }
      return null;
    }
    return data ? mapUser(data) : null;
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) return localStore.getUser(id);
    return null;
  }
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const supabase = getSupabase();
  const normalized = email.trim().toLowerCase();
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalized)
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        return localStore.getUserByEmail(normalized);
      }
      return null;
    }
    return data ? mapUser(data) : null;
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) return localStore.getUserByEmail(normalized);
    return null;
  }
}

export async function upsertUserRecord(params: {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}): Promise<User> {
  const supabase = getSupabase();
  const avatarUrl =
    params.avatarUrl ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(params.name.trim())}`;
  const now = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          id: params.id,
          email: params.email.trim().toLowerCase(),
          name: params.name.trim(),
          avatar_url: avatarUrl,
          updated_at: now,
        },
        { onConflict: 'id' }
      )
      .select('*')
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        return localStore.upsertUser({
          id: params.id,
          email: params.email.trim().toLowerCase(),
          name: params.name.trim(),
          avatarUrl,
        });
      }
      throw new Error(`Failed to save user profile: ${error.message}`);
    }
    return mapUser(data);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      return localStore.upsertUser({
        id: params.id,
        email: params.email.trim().toLowerCase(),
        name: params.name.trim(),
        avatarUrl,
      });
    }
    throw err;
  }
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, 'name' | 'avatarUrl'>>
): Promise<User> {
  const supabase = getSupabase();
  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updatePayload.name = updates.name.trim();
  if (updates.avatarUrl !== undefined) updatePayload.avatar_url = updates.avatarUrl;

  try {
    const { data, error } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', userId)
      .select('*')
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        const u = localStore.getUser(userId);
        if (u) {
          if (updates.name !== undefined) u.name = updates.name.trim();
          if (updates.avatarUrl !== undefined) u.avatarUrl = updates.avatarUrl;
          return localStore.upsertUser(u);
        }
      }
      throw new Error(`Failed to update profile: ${error.message}`);
    }
    return mapUser(data);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      const u = localStore.getUser(userId);
      if (u) {
        if (updates.name !== undefined) u.name = updates.name.trim();
        if (updates.avatarUrl !== undefined) u.avatarUrl = updates.avatarUrl;
        return localStore.upsertUser(u);
      }
    }
    throw err;
  }
}

// ============================================================================
// ORGANIZATIONS & MEMBERSHIPS (Multi-Tenancy)
// ============================================================================
function createOrgFallback(user: User, name: string, slug: string, now: string) {
  const orgId = 'org_' + Math.random().toString(36).substring(2, 12);
  const memId = 'mem_' + Math.random().toString(36).substring(2, 12);
  const organization: Organization = {
    id: orgId,
    name: name.trim(),
    slug,
    ownerUserId: user.id,
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    createdAt: now,
    updatedAt: now,
  };
  const membership: Membership = {
    id: memId,
    organizationId: orgId,
    userId: user.id,
    role: 'owner',
    createdAt: now,
  };
  localStore.upsertOrganization(organization);
  localStore.upsertMembership(membership);
  localStore.upsertAutomationSettings({
    id: 'as_' + orgId,
    organizationId: orgId,
    automaticReminders: true,
    automaticallyStopWhenPaid: true,
    avoidWeekends: true,
    preferredSendingTime: '10:00',
    timezone: 'Asia/Kolkata',
    policyTier: 'STANDARD',
    policyIntervals: { firstReminderDays: 3, secondReminderDays: 10, finalReminderDays: 17 },
    maxReminders: 3,
  });
  localStore.upsertAISettings({
    id: 'ai_' + orgId,
    organizationId: orgId,
    communicationStyle: 'PROFESSIONAL',
    relationshipAwarePersonalization: true,
    reviewBeforeSending: true,
  });
  localStore.upsertSubscription({
    id: 'sub_' + orgId,
    organizationId: orgId,
    plan: 'FREE',
    status: 'ACTIVE',
    currentPeriodStart: now,
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    cancelAtPeriodEnd: false,
    limits: getPlanLimits('FREE'),
  });
  localStore.upsertUsage({
    organizationId: orgId,
    month: now.substring(0, 7),
    activeInvoicesCount: 0,
    remindersSentCount: 0,
    aiGenerationsCount: 0,
    connectedGmailAccounts: 0,
  });
  return { organization, membership };
}

export async function createOrganizationForUser(
  user: User,
  name: string
): Promise<{ organization: Organization; membership: Membership }> {
  const supabase = getSupabase();
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  try {
    // 1. Insert organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: name.trim(),
        slug,
        owner_user_id: user.id,
        timezone: 'Asia/Kolkata',
        currency: 'INR',
      })
      .select('*')
      .single();

    if (orgError) {
      if (isSchemaCacheMissing(orgError)) {
        return createOrgFallback(user, name, slug, now);
      }
      throw new Error(`Failed to create organization: ${orgError?.message}`);
    }

    const organization = mapOrganization(orgData);

    // 2. Insert owner membership
    const { data: memData, error: memError } = await supabase
      .from('memberships')
      .insert({
        organization_id: organization.id,
        user_id: user.id,
        role: 'owner',
      })
      .select('*')
      .single();

    if (memError) {
      if (isSchemaCacheMissing(memError)) {
        return createOrgFallback(user, name, slug, now);
      }
      throw new Error(`Failed to create organization membership: ${memError?.message}`);
    }

    const membership = mapMembership(memData);

    // 3. Initialize default settings safely
    try {
      await supabase.from('automation_settings').upsert({
        organization_id: organization.id,
        automatic_reminders: true,
        automatically_stop_when_paid: true,
        avoid_weekends: true,
        preferred_sending_time: '10:00',
        timezone: 'Asia/Kolkata',
        policy_tier: 'STANDARD',
        policy_intervals: { firstReminderDays: 3, secondReminderDays: 10, finalReminderDays: 17 },
        max_reminders: 3,
      });
      await supabase.from('ai_settings').upsert({
        organization_id: organization.id,
        communication_style: 'PROFESSIONAL',
        relationship_aware_personalization: true,
        review_before_sending: true,
      });
      await supabase.from('subscriptions').upsert({
        organization_id: organization.id,
        plan: 'FREE',
        status: 'ACTIVE',
        limits: getPlanLimits('FREE'),
      });
      await supabase.from('usage').upsert({
        organization_id: organization.id,
        month: now.substring(0, 7),
        active_invoices_count: 0,
        reminders_sent_count: 0,
        ai_generations_count: 0,
        connected_gmail_accounts: 0,
      });
    } catch {
      // auxiliary schema cache missing safe to continue
    }

    return { organization, membership };
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      return createOrgFallback(user, name, slug, now);
    }
    throw err;
  }
}

export async function getOrganizationById(orgId: string): Promise<Organization | null> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        return localStore.getOrganization(orgId);
      }
      return null;
    }
    return data ? mapOrganization(data) : null;
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) return localStore.getOrganization(orgId);
    return null;
  }
}

export async function getUserOrganizations(userId: string): Promise<Organization[]> {
  const supabase = getSupabase();
  try {
    const { data: memberships, error: memError } = await supabase
      .from('memberships')
      .select('organization_id')
      .eq('user_id', userId);

    if (memError) {
      if (isSchemaCacheMissing(memError)) {
        return localStore.getUserOrganizations(userId);
      }
      return [];
    }

    if (!memberships || memberships.length === 0) {
      return [];
    }

    const orgIds = memberships.map((m) => m.organization_id);
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .in('id', orgIds)
      .order('created_at', { ascending: true });

    if (orgError) {
      if (isSchemaCacheMissing(orgError)) {
        return localStore.getUserOrganizations(userId);
      }
      return [];
    }
    return (orgs || []).map(mapOrganization);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) return localStore.getUserOrganizations(userId);
    return [];
  }
}

export async function getUserMembership(
  userId: string,
  orgId: string
): Promise<Membership | null> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('memberships')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        return localStore.getMembership(userId, orgId);
      }
      return null;
    }
    return data ? mapMembership(data) : null;
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) return localStore.getMembership(userId, orgId);
    return null;
  }
}

export async function updateOrganization(
  orgId: string,
  updates: Partial<Pick<Organization, 'name' | 'timezone' | 'currency'>>
): Promise<Organization> {
  const supabase = getSupabase();
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.timezone !== undefined) payload.timezone = updates.timezone;
  if (updates.currency !== undefined) payload.currency = updates.currency;

  try {
    const { data, error } = await supabase
      .from('organizations')
      .update(payload)
      .eq('id', orgId)
      .select('*')
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        const o = localStore.getOrganization(orgId);
        if (o) {
          if (updates.name !== undefined) o.name = updates.name.trim();
          if (updates.timezone !== undefined) o.timezone = updates.timezone;
          if (updates.currency !== undefined) o.currency = updates.currency;
          return localStore.upsertOrganization(o);
        }
      }
      throw new Error(`Failed to update organization: ${error?.message}`);
    }
    return mapOrganization(data);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      const o = localStore.getOrganization(orgId);
      if (o) {
        if (updates.name !== undefined) o.name = updates.name.trim();
        if (updates.timezone !== undefined) o.timezone = updates.timezone;
        if (updates.currency !== undefined) o.currency = updates.currency;
        return localStore.upsertOrganization(o);
      }
    }
    throw err;
  }
}

// ============================================================================
// WORKSPACE DATA SNAPSHOT (Tenant Scoped)
// ============================================================================
export async function getWorkspaceSnapshot(userId: string, orgId?: string) {
  const user = await findUserById(userId);
  if (!user) throw new Error('User not found.');

  const organizations = await getUserOrganizations(userId);
  let activeOrg = orgId ? organizations.find((o) => o.id === orgId) : organizations[0];

  if (!activeOrg && organizations.length > 0) {
    activeOrg = organizations[0];
  }

  if (!activeOrg) {
    // If no org exists yet for this user, create an initial workspace
    const created = await createOrganizationForUser(user, `${user.name}'s Studio`);
    activeOrg = created.organization;
    organizations.push(activeOrg);
  }

  const resolvedOrgId = activeOrg.id;
  const currentMembership = await getUserMembership(userId, resolvedOrgId);

  // Fetch all tenant-scoped data in parallel
  const [
    clients,
    invoices,
    reminders,
    emailEvents,
    auditLogs,
    connections,
    automationSettings,
    aiSettings,
    subscription,
    usage,
    notifications,
  ] = await Promise.all([
    getClients(resolvedOrgId),
    getInvoices(resolvedOrgId),
    getReminders(resolvedOrgId),
    getEmailEvents(resolvedOrgId),
    getAuditLogs(resolvedOrgId),
    getConnections(resolvedOrgId),
    getAutomationSettings(resolvedOrgId),
    getAISettings(resolvedOrgId),
    getSubscription(resolvedOrgId),
    getUsage(resolvedOrgId),
    getNotifications(resolvedOrgId),
  ]);

  return {
    organization: activeOrg,
    membership: currentMembership,
    organizations,
    clients,
    invoices,
    reminders,
    emailEvents,
    auditLogs,
    connections,
    automationSettings,
    aiSettings,
    subscription,
    usage,
    notifications,
  };
}

// ============================================================================
// CLIENTS CRUD (Tenant Scoped)
// ============================================================================
export async function getClients(orgId: string): Promise<Client[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isSchemaCacheMissing(error)) {
        return localStore.getClients(orgId);
      }
      return [];
    }
    return (data || []).map(mapClient);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) return localStore.getClients(orgId);
    return [];
  }
}

export async function getClientById(orgId: string, id: string): Promise<Client | null> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', orgId)
      .eq('id', id)
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        return localStore.getClient(orgId, id);
      }
      return null;
    }
    return data ? mapClient(data) : null;
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) return localStore.getClient(orgId, id);
    return null;
  }
}

export async function createClient(
  orgId: string,
  clientData: Omit<Client, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>
): Promise<Client> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const insertPayload = {
    organization_id: orgId,
    name: clientData.name.trim(),
    email: clientData.email.trim().toLowerCase(),
    company_name: clientData.companyName.trim(),
    relationship_type: clientData.relationshipType || 'REGULAR',
    payment_reliability_score: clientData.paymentReliabilityScore ?? 85,
    average_payment_delay_days: clientData.averagePaymentDelayDays ?? 0,
    total_invoiced: clientData.totalInvoiced ?? 0,
    total_paid: clientData.totalPaid ?? 0,
    total_outstanding: clientData.totalOutstanding ?? 0,
    never_contact: Boolean(clientData.neverContact),
    notes: clientData.notes || null,
  };

  try {
    const { data, error } = await supabase
      .from('clients')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        const fallbackClient: Client = {
          id: 'cli_' + Math.random().toString(36).substring(2, 12),
          organizationId: orgId,
          name: clientData.name.trim(),
          email: clientData.email.trim().toLowerCase(),
          companyName: clientData.companyName.trim(),
          relationshipType: clientData.relationshipType || 'REGULAR',
          paymentReliabilityScore: clientData.paymentReliabilityScore ?? 85,
          averagePaymentDelayDays: clientData.averagePaymentDelayDays ?? 0,
          totalInvoiced: clientData.totalInvoiced ?? 0,
          totalPaid: clientData.totalPaid ?? 0,
          totalOutstanding: clientData.totalOutstanding ?? 0,
          neverContact: Boolean(clientData.neverContact),
          notes: clientData.notes || null,
          createdAt: now,
          updatedAt: now,
        };
        return localStore.upsertClient(fallbackClient);
      }
      throw new Error(`Failed to create client: ${error?.message}`);
    }
    return mapClient(data);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      const fallbackClient: Client = {
        id: 'cli_' + Math.random().toString(36).substring(2, 12),
        organizationId: orgId,
        name: clientData.name.trim(),
        email: clientData.email.trim().toLowerCase(),
        companyName: clientData.companyName.trim(),
        relationshipType: clientData.relationshipType || 'REGULAR',
        paymentReliabilityScore: clientData.paymentReliabilityScore ?? 85,
        averagePaymentDelayDays: clientData.averagePaymentDelayDays ?? 0,
        totalInvoiced: clientData.totalInvoiced ?? 0,
        totalPaid: clientData.totalPaid ?? 0,
        totalOutstanding: clientData.totalOutstanding ?? 0,
        neverContact: Boolean(clientData.neverContact),
        notes: clientData.notes || null,
        createdAt: now,
        updatedAt: now,
      };
      return localStore.upsertClient(fallbackClient);
    }
    throw err;
  }
}

export async function updateClient(
  orgId: string,
  id: string,
  updates: Partial<Client>
): Promise<Client> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const payload: Record<string, any> = {
    updated_at: now,
  };

  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.email !== undefined) payload.email = updates.email.trim().toLowerCase();
  if (updates.companyName !== undefined) payload.company_name = updates.companyName.trim();
  if (updates.relationshipType !== undefined) payload.relationship_type = updates.relationshipType;
  if (updates.paymentReliabilityScore !== undefined) payload.payment_reliability_score = updates.paymentReliabilityScore;
  if (updates.averagePaymentDelayDays !== undefined) payload.average_payment_delay_days = updates.averagePaymentDelayDays;
  if (updates.totalInvoiced !== undefined) payload.total_invoiced = updates.totalInvoiced;
  if (updates.totalPaid !== undefined) payload.total_paid = updates.totalPaid;
  if (updates.totalOutstanding !== undefined) payload.total_outstanding = updates.totalOutstanding;
  if (updates.neverContact !== undefined) payload.never_contact = updates.neverContact;
  if (updates.notes !== undefined) payload.notes = updates.notes;

  try {
    const { data, error } = await supabase
      .from('clients')
      .update(payload)
      .eq('organization_id', orgId)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        const c = localStore.getClient(orgId, id);
        if (!c) throw new Error('Client not found.');
        const updated = { ...c, ...updates, updatedAt: now };
        return localStore.upsertClient(updated);
      }
      throw new Error(`Failed to update client: ${error?.message}`);
    }
    return mapClient(data);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      const c = localStore.getClient(orgId, id);
      if (!c) throw new Error('Client not found.');
      const updated = { ...c, ...updates, updatedAt: now };
      return localStore.upsertClient(updated);
    }
    throw err;
  }
}

export async function deleteClient(orgId: string, id: string): Promise<void> {
  const supabase = getSupabase();
  try {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('organization_id', orgId)
      .eq('id', id);

    if (error) {
      if (isSchemaCacheMissing(error)) {
        localStore.deleteClient(id);
        return;
      }
      throw new Error(`Failed to delete client: ${error.message}`);
    }
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      localStore.deleteClient(id);
      return;
    }
    throw err;
  }
}

// ============================================================================
// CLIENT RECALCULATION & HELPERS (Authoritative Financial Safety)
// ============================================================================
export async function recalculateClientTotals(orgId: string, clientId: string): Promise<void> {
  const supabase = getSupabase();
  try {
    const { data: invs, error } = await supabase
      .from('invoices')
      .select('invoice_amount, status')
      .eq('organization_id', orgId)
      .eq('client_id', clientId);

    if (error) {
      if (isSchemaCacheMissing(error)) {
        const allInvs = localStore.getInvoices(orgId).filter((i) => i.clientId === clientId);
        let totalInvoiced = 0;
        let totalPaid = 0;
        let totalOutstanding = 0;
        for (const inv of allInvs) {
          const amount = Number(inv.invoiceAmount) || 0;
          totalInvoiced += amount;
          if (inv.status === 'PAID') totalPaid += amount;
          else totalOutstanding += amount;
        }
        const c = localStore.getClient(orgId, clientId);
        if (c) {
          c.totalInvoiced = totalInvoiced;
          c.totalPaid = totalPaid;
          c.totalOutstanding = totalOutstanding;
          localStore.upsertClient(c);
        }
        return;
      }
      return;
    }

    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    for (const inv of invs || []) {
      const amount = Number(inv.invoice_amount) || 0;
      totalInvoiced += amount;
      if (inv.status === 'PAID') {
        totalPaid += amount;
      } else {
        totalOutstanding += amount;
      }
    }

    await supabase
      .from('clients')
      .update({
        total_invoiced: totalInvoiced,
        total_paid: totalPaid,
        total_outstanding: totalOutstanding,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', orgId)
      .eq('id', clientId);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      const allInvs = localStore.getInvoices(orgId).filter((i) => i.clientId === clientId);
      let totalInvoiced = 0;
      let totalPaid = 0;
      let totalOutstanding = 0;
      for (const inv of allInvs) {
        const amount = Number(inv.invoiceAmount) || 0;
        totalInvoiced += amount;
        if (inv.status === 'PAID') totalPaid += amount;
        else totalOutstanding += amount;
      }
      const c = localStore.getClient(orgId, clientId);
      if (c) {
        c.totalInvoiced = totalInvoiced;
        c.totalPaid = totalPaid;
        c.totalOutstanding = totalOutstanding;
        localStore.upsertClient(c);
      }
    }
  }
}

// ============================================================================
// INVOICES CRUD (Tenant Scoped)
// ============================================================================
export async function getInvoices(orgId: string): Promise<Invoice[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isSchemaCacheMissing(error)) {
        return localStore.getInvoices(orgId);
      }
      return [];
    }
    return (data || []).map(mapInvoice);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) return localStore.getInvoices(orgId);
    return [];
  }
}

export async function getInvoiceById(orgId: string, id: string): Promise<Invoice | null> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', orgId)
      .eq('id', id)
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        return localStore.getInvoice(orgId, id);
      }
      return null;
    }
    return data ? mapInvoice(data) : null;
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) return localStore.getInvoice(orgId, id);
    return null;
  }
}

export async function createInvoice(
  orgId: string,
  invoiceInput: CreateInvoiceInput
): Promise<Invoice> {
  const supabase = getSupabase();

  // 1. Resolve and validate client within the same organization
  let clientId = invoiceInput.clientId;
  if (clientId) {
    const client = await getClientById(orgId, clientId);
    if (!client) {
      throw new Error('Specified client not found in your organization.');
    }
  } else if (invoiceInput.clientEmail) {
    const clients = await getClients(orgId);
    const existingClient = clients.find(
      (c) => c.email.toLowerCase() === invoiceInput.clientEmail.toLowerCase()
    );
    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const newClient = await createClient(orgId, {
        name: invoiceInput.clientName,
        email: invoiceInput.clientEmail,
        companyName: invoiceInput.companyName || invoiceInput.clientName,
        relationshipType: 'REGULAR',
        paymentReliabilityScore: 85,
        averagePaymentDelayDays: 0,
        totalInvoiced: invoiceInput.invoiceAmount,
        totalPaid: 0,
        totalOutstanding: invoiceInput.invoiceAmount,
        neverContact: false,
      });
      clientId = newClient.id;
    }
  }

  // 2. Safe initial overdue and status calculation (authoritative server-side determination)
  const dueDateStr = invoiceInput.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().substring(0, 10);
  const invoiceDateStr = invoiceInput.invoiceDate || new Date().toISOString().substring(0, 10);
  
  const dueDateObj = new Date(dueDateStr);
  const nowObj = new Date();
  const diffTime = nowObj.getTime() - dueDateObj.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const daysOverdue = diffDays > 0 ? diffDays : 0;
  const initialStatus: InvoiceStatus = daysOverdue > 0 ? 'OVERDUE' : 'DUE';

  const insertPayload = {
    organization_id: orgId,
    client_id: clientId || null,
    client_name: invoiceInput.clientName,
    client_email: invoiceInput.clientEmail,
    company_name: invoiceInput.companyName || null,
    invoice_number: invoiceInput.invoiceNumber,
    invoice_amount: Number(invoiceInput.invoiceAmount),
    currency: invoiceInput.currency || 'INR',
    invoice_date: invoiceDateStr,
    due_date: dueDateStr,
    status: initialStatus,
    days_overdue: daysOverdue,
    source: 'MANUAL',
    source_reference: null,
    last_reminder_at: null,
    reminder_count: 0,
    next_reminder_at: null,
    payment_received_at: null,
    is_paused: false,
    extraction_confidence: 'HIGH',
    notes: invoiceInput.notes || null,
  };

  try {
    const { data, error } = await supabase
      .from('invoices')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        const now = new Date().toISOString();
        const fallbackInv: Invoice = {
          id: 'inv_' + Math.random().toString(36).substring(2, 12),
          organizationId: orgId,
          clientId: clientId || null,
          clientName: invoiceInput.clientName,
          clientEmail: invoiceInput.clientEmail,
          companyName: invoiceInput.companyName || null,
          invoiceNumber: invoiceInput.invoiceNumber,
          invoiceAmount: Number(invoiceInput.invoiceAmount),
          currency: invoiceInput.currency || 'INR',
          invoiceDate: invoiceDateStr,
          dueDate: dueDateStr,
          status: initialStatus,
          daysOverdue,
          source: 'MANUAL',
          sourceReference: null,
          lastReminderAt: null,
          reminderCount: 0,
          nextReminderAt: null,
          paymentReceivedAt: null,
          isPaused: false,
          extractionConfidence: 'HIGH',
          notes: invoiceInput.notes || null,
          createdAt: now,
          updatedAt: now,
        };
        localStore.upsertInvoice(fallbackInv);
        if (clientId) {
          await recalculateClientTotals(orgId, clientId);
        }
        return fallbackInv;
      }
      throw new Error(`Failed to create invoice: ${error?.message}`);
    }

    const created = mapInvoice(data);
    if (clientId) {
      await recalculateClientTotals(orgId, clientId);
    }
    return created;
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      const now = new Date().toISOString();
      const fallbackInv: Invoice = {
        id: 'inv_' + Math.random().toString(36).substring(2, 12),
        organizationId: orgId,
        clientId: clientId || null,
        clientName: invoiceInput.clientName,
        clientEmail: invoiceInput.clientEmail,
        companyName: invoiceInput.companyName || null,
        invoiceNumber: invoiceInput.invoiceNumber,
        invoiceAmount: Number(invoiceInput.invoiceAmount),
        currency: invoiceInput.currency || 'INR',
        invoiceDate: invoiceDateStr,
        dueDate: dueDateStr,
        status: initialStatus,
        daysOverdue,
        source: 'MANUAL',
        sourceReference: null,
        lastReminderAt: null,
        reminderCount: 0,
        nextReminderAt: null,
        paymentReceivedAt: null,
        isPaused: false,
        extractionConfidence: 'HIGH',
        notes: invoiceInput.notes || null,
        createdAt: now,
        updatedAt: now,
      };
      localStore.upsertInvoice(fallbackInv);
      if (clientId) {
        await recalculateClientTotals(orgId, clientId);
      }
      return fallbackInv;
    }
    throw err;
  }
}

/**
 * Internal invoice updater for authoritative server-side workflows
 */
export async function updateInvoiceInternal(
  orgId: string,
  id: string,
  payload: Record<string, any>
): Promise<Invoice> {
  const supabase = getSupabase();
  const updatePayload = {
    ...payload,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('invoices')
      .update(updatePayload)
      .eq('organization_id', orgId)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        const inv = localStore.getInvoice(orgId, id);
        if (!inv) throw new Error('Invoice not found.');
        const updated: Invoice = {
          ...inv,
          clientName: payload.client_name ?? inv.clientName,
          clientEmail: payload.client_email ?? inv.clientEmail,
          companyName: payload.company_name !== undefined ? payload.company_name : inv.companyName,
          invoiceNumber: payload.invoice_number ?? inv.invoiceNumber,
          invoiceAmount: payload.invoice_amount !== undefined ? Number(payload.invoice_amount) : inv.invoiceAmount,
          currency: payload.currency ?? inv.currency,
          invoiceDate: payload.invoice_date ?? inv.invoiceDate,
          dueDate: payload.due_date ?? inv.dueDate,
          status: payload.status ?? inv.status,
          daysOverdue: payload.days_overdue !== undefined ? payload.days_overdue : inv.daysOverdue,
          isPaused: payload.is_paused !== undefined ? payload.is_paused : inv.isPaused,
          paymentReceivedAt: payload.payment_received_at !== undefined ? payload.payment_received_at : inv.paymentReceivedAt,
          notes: payload.notes !== undefined ? payload.notes : inv.notes,
          clientId: payload.client_id !== undefined ? payload.client_id : inv.clientId,
          updatedAt: updatePayload.updated_at,
        };
        localStore.upsertInvoice(updated);
        if (updated.clientId) {
          await recalculateClientTotals(orgId, updated.clientId);
        }
        return updated;
      }
      throw new Error('Failed to update invoice in database.');
    }

    const updated = mapInvoice(data);
    if (updated.clientId) {
      await recalculateClientTotals(orgId, updated.clientId);
    }
    return updated;
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      const inv = localStore.getInvoice(orgId, id);
      if (!inv) throw new Error('Invoice not found.');
      const updated: Invoice = {
        ...inv,
        clientName: payload.client_name ?? inv.clientName,
        clientEmail: payload.client_email ?? inv.clientEmail,
        companyName: payload.company_name !== undefined ? payload.company_name : inv.companyName,
        invoiceNumber: payload.invoice_number ?? inv.invoiceNumber,
        invoiceAmount: payload.invoice_amount !== undefined ? Number(payload.invoice_amount) : inv.invoiceAmount,
        currency: payload.currency ?? inv.currency,
        invoiceDate: payload.invoice_date ?? inv.invoiceDate,
        dueDate: payload.due_date ?? inv.dueDate,
        status: payload.status ?? inv.status,
        daysOverdue: payload.days_overdue !== undefined ? payload.days_overdue : inv.daysOverdue,
        isPaused: payload.is_paused !== undefined ? payload.is_paused : inv.isPaused,
        paymentReceivedAt: payload.payment_received_at !== undefined ? payload.payment_received_at : inv.paymentReceivedAt,
        notes: payload.notes !== undefined ? payload.notes : inv.notes,
        clientId: payload.client_id !== undefined ? payload.client_id : inv.clientId,
        updatedAt: updatePayload.updated_at,
      };
      localStore.upsertInvoice(updated);
      if (updated.clientId) {
        await recalculateClientTotals(orgId, updated.clientId);
      }
      return updated;
    }
    throw err;
  }
}

/**
 * Generic PATCH /invoices/:id MUST NOT allow client-controlled mutation of authoritative workflow fields.
 * Strips or rejects: status, daysOverdue, reminderCount, lastReminderAt, nextReminderAt, paymentReceivedAt, isPaused.
 * Validates that any updated clientId belongs strictly to the current organization.
 */
export async function updateInvoice(
  orgId: string,
  id: string,
  updates: UpdateInvoiceInput
): Promise<Invoice> {
  const payload: Record<string, any> = {};

  if (updates.clientName !== undefined) payload.client_name = updates.clientName;
  if (updates.clientEmail !== undefined) payload.client_email = updates.clientEmail;
  if (updates.companyName !== undefined) payload.company_name = updates.companyName;
  if (updates.invoiceNumber !== undefined) payload.invoice_number = updates.invoiceNumber;
  if (updates.invoiceAmount !== undefined) payload.invoice_amount = Number(updates.invoiceAmount);
  if (updates.currency !== undefined) payload.currency = updates.currency;
  if (updates.invoiceDate !== undefined) payload.invoice_date = updates.invoiceDate;
  if (updates.dueDate !== undefined) payload.due_date = updates.dueDate;
  if (updates.notes !== undefined) payload.notes = updates.notes;

  if (updates.clientId !== undefined) {
    if (updates.clientId) {
      const client = await getClientById(orgId, updates.clientId);
      if (!client) {
        throw new Error('Specified client not found in your organization.');
      }
      payload.client_id = updates.clientId;
    } else {
      payload.client_id = null;
    }
  }

  return updateInvoiceInternal(orgId, id, payload);
}

export async function deleteInvoice(orgId: string, id: string): Promise<void> {
  const supabase = getSupabase();
  const invoice = await getInvoiceById(orgId, id);

  try {
    // 1. Delete associated reminders
    await supabase
      .from('reminders')
      .delete()
      .eq('organization_id', orgId)
      .eq('invoice_id', id);

    // 2. Delete invoice
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('organization_id', orgId)
      .eq('id', id);

    if (error) {
      if (isSchemaCacheMissing(error)) {
        localStore.deleteInvoice(id);
        const reminders = localStore.getReminders(orgId).filter((r) => r.invoiceId === id);
        for (const rem of reminders) {
          localStore.deleteReminder(rem.id);
        }
        if (invoice?.clientId) {
          await recalculateClientTotals(orgId, invoice.clientId);
        }
        return;
      }
      throw new Error(`Failed to delete invoice: ${error.message}`);
    }
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      localStore.deleteInvoice(id);
      const reminders = localStore.getReminders(orgId).filter((r) => r.invoiceId === id);
      for (const rem of reminders) {
        localStore.deleteReminder(rem.id);
      }
      if (invoice?.clientId) {
        await recalculateClientTotals(orgId, invoice.clientId);
      }
      return;
    }
    throw err;
  }

  // 3. Recalculate client totals
  if (invoice?.clientId) {
    await recalculateClientTotals(orgId, invoice.clientId);
  }
}

/**
 * Strict Reliability Rule:
 * Marking an invoice PAID halts all pending/scheduled reminders permanently.
 * Idempotent: repeated calls do not double-count payments.
 */
export async function markInvoicePaid(orgId: string, id: string): Promise<Invoice> {
  const existing = await getInvoiceById(orgId, id);
  if (!existing) {
    throw new Error('Invoice not found.');
  }

  // Idempotent: if already paid, return existing invoice directly
  if (existing.status === 'PAID') {
    return existing;
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();

  try {
    // 1. Mark invoice PAID
    const { data: invData, error: invError } = await supabase
      .from('invoices')
      .update({
        status: 'PAID',
        payment_received_at: now,
        days_overdue: 0,
        is_paused: false,
        updated_at: now,
      })
      .eq('organization_id', orgId)
      .eq('id', id)
      .select('*')
      .single();

    if (invError) {
      if (isSchemaCacheMissing(invError)) {
        const inv = localStore.getInvoice(orgId, id) || existing;
        inv.status = 'PAID';
        inv.paymentReceivedAt = now;
        inv.daysOverdue = 0;
        inv.isPaused = false;
        inv.updatedAt = now;
        localStore.upsertInvoice(inv);

        // Cancel active/pending reminders in local store
        const reminders = localStore.getReminders(orgId).filter((r) => r.invoiceId === id);
        for (const rem of reminders) {
          if (['SCHEDULED', 'GENERATING', 'PENDING_APPROVAL'].includes(rem.status)) {
            rem.status = 'CANCELLED';
            rem.lastError = 'Auto-cancelled: Invoice marked as PAID';
            rem.updatedAt = now;
            localStore.upsertReminder(rem);
          }
        }

        if (inv.clientId) {
          await recalculateClientTotals(orgId, inv.clientId);
        }

        await createAuditLog(orgId, {
          eventType: 'PAYMENT_RECORDED',
          entityType: 'INVOICE',
          entityId: id,
          message: `Invoice #${inv.invoiceNumber} marked as PAID. All pending reminders halted.`,
        });

        return inv;
      }
      throw new Error(`Failed to mark invoice as paid: ${invError?.message}`);
    }

    const invoice = mapInvoice(invData);

    // 2. Automatically cancel all active/pending reminders for this invoice (never cancel sent history)
    await supabase
      .from('reminders')
      .update({
        status: 'CANCELLED',
        last_error: 'Auto-cancelled: Invoice marked as PAID',
        updated_at: now,
      })
      .eq('organization_id', orgId)
      .eq('invoice_id', id)
      .in('status', ['SCHEDULED', 'GENERATING', 'PENDING_APPROVAL']);

    // 3. Authoritatively recalculate client totals
    if (invoice.clientId) {
      await recalculateClientTotals(orgId, invoice.clientId);
    }

    // 4. Log audit event
    await createAuditLog(orgId, {
      eventType: 'PAYMENT_RECORDED',
      entityType: 'INVOICE',
      entityId: id,
      message: `Invoice #${invoice.invoiceNumber} marked as PAID. All pending reminders halted.`,
    });

    return invoice;
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      const inv = localStore.getInvoice(orgId, id) || existing;
      inv.status = 'PAID';
      inv.paymentReceivedAt = now;
      inv.daysOverdue = 0;
      inv.isPaused = false;
      inv.updatedAt = now;
      localStore.upsertInvoice(inv);

      // Cancel active/pending reminders in local store
      const reminders = localStore.getReminders(orgId).filter((r) => r.invoiceId === id);
      for (const rem of reminders) {
        if (['SCHEDULED', 'GENERATING', 'PENDING_APPROVAL'].includes(rem.status)) {
          rem.status = 'CANCELLED';
          rem.lastError = 'Auto-cancelled: Invoice marked as PAID';
          rem.updatedAt = now;
          localStore.upsertReminder(rem);
        }
      }

      if (inv.clientId) {
        await recalculateClientTotals(orgId, inv.clientId);
      }

      await createAuditLog(orgId, {
        eventType: 'PAYMENT_RECORDED',
        entityType: 'INVOICE',
        entityId: id,
        message: `Invoice #${inv.invoiceNumber} marked as PAID. All pending reminders halted.`,
      });

      return inv;
    }
    throw err;
  }
}

export async function pauseInvoice(orgId: string, id: string): Promise<Invoice> {
  const inv = await getInvoiceById(orgId, id);
  if (!inv) throw new Error('Invoice not found.');

  if (inv.status === 'PAID') {
    throw new Error('Cannot pause reminders for an invoice that is already PAID.');
  }

  // If DISPUTED, preserve DISPUTED status while setting is_paused: true
  if (inv.status === 'DISPUTED') {
    return updateInvoiceInternal(orgId, id, { is_paused: true });
  }

  return updateInvoiceInternal(orgId, id, { is_paused: true, status: 'STOPPED' });
}

export async function resumeInvoice(orgId: string, id: string): Promise<Invoice> {
  const inv = await getInvoiceById(orgId, id);
  if (!inv) throw new Error('Invoice not found.');

  if (inv.status === 'PAID') {
    throw new Error('Cannot resume reminders for an invoice that is already PAID.');
  }

  if (inv.status === 'DISPUTED') {
    throw new Error('Cannot resume reminders while invoice is DISPUTED. Please resolve the dispute first.');
  }

  const status = inv.daysOverdue > 0 ? 'OVERDUE' : 'DUE';
  return updateInvoiceInternal(orgId, id, { is_paused: false, status });
}

export async function disputeInvoice(
  orgId: string,
  id: string,
  disputed: boolean
): Promise<Invoice> {
  const inv = await getInvoiceById(orgId, id);
  if (!inv) throw new Error('Invoice not found.');

  if (inv.status === 'PAID') {
    throw new Error('Cannot dispute an invoice that is already marked as PAID.');
  }

  if (disputed) {
    const now = new Date().toISOString();
    const supabase = getSupabase();

    // Cancel active/pending reminders
    await supabase
      .from('reminders')
      .update({
        status: 'CANCELLED',
        last_error: 'Auto-cancelled: Invoice marked as DISPUTED',
        updated_at: now,
      })
      .eq('organization_id', orgId)
      .eq('invoice_id', id)
      .in('status', ['SCHEDULED', 'GENERATING', 'PENDING_APPROVAL']);

    return updateInvoiceInternal(orgId, id, {
      status: 'DISPUTED',
      is_paused: true,
    });
  } else {
    // Explicit user resolution of dispute
    const status = inv.daysOverdue > 0 ? 'OVERDUE' : 'DUE';
    return updateInvoiceInternal(orgId, id, {
      status,
      is_paused: false,
    });
  }
}

// ============================================================================
// REMINDERS CRUD (Tenant Scoped)
// ============================================================================
export async function getReminders(orgId: string): Promise<Reminder[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('organization_id', orgId)
      .order('scheduled_at', { ascending: true });

    if (error) {
      if (isSchemaCacheMissing(error)) {
        return localStore.getReminders(orgId);
      }
      return [];
    }
    return (data || []).map(mapReminder);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) return localStore.getReminders(orgId);
    return [];
  }
}

export async function getReminderById(orgId: string, id: string): Promise<Reminder | null> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('organization_id', orgId)
      .eq('id', id)
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        return localStore.getReminder(orgId, id);
      }
      return null;
    }
    return data ? mapReminder(data) : null;
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) return localStore.getReminder(orgId, id);
    return null;
  }
}

export interface CreateReminderInput {
  invoiceId: string;
  clientId?: string;
  sequenceNumber: 1 | 2 | 3;
  scheduledAt?: string;
  tone?: CommunicationStyle;
  subject: string;
  body: string;
  aiGenerated?: boolean;
  requiresReview?: boolean;
}

export async function createReminder(
  orgId: string,
  reminderData: CreateReminderInput
): Promise<Reminder> {
  const supabase = getSupabase();

  // 1 & 2. Load the invoice using organization_id + invoiceId and confirm ownership
  const invoice = await getInvoiceById(orgId, reminderData.invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found in your organization.');
  }

  // 3 & 4. Confirm client belongs to the same organization and matches invoice
  const targetClientId = reminderData.clientId || invoice.clientId;
  if (!targetClientId) {
    throw new Error('Invoice does not have an associated client.');
  }
  const client = await getClientById(orgId, targetClientId);
  if (!client) {
    throw new Error('Client not found in your organization.');
  }
  if (invoice.clientId && invoice.clientId !== targetClientId) {
    throw new Error('Client does not match the invoice client.');
  }

  // 5. Confirm invoice is not PAID
  if (invoice.status === 'PAID') {
    throw new Error('Cannot create reminders for a PAID invoice.');
  }

  // 6. Confirm invoice is not DISPUTED
  if (invoice.status === 'DISPUTED') {
    throw new Error('Cannot create reminders for a DISPUTED invoice. Please resolve dispute first.');
  }

  // 7. Confirm sequenceNumber is exactly 1, 2, or 3
  const seq = Number(reminderData.sequenceNumber) as 1 | 2 | 3;
  if (![1, 2, 3].includes(seq)) {
    throw new Error('Sequence number must be 1, 2, or 3.');
  }

  // 8. Reject creation if that sequence already exists for this invoice (Application level check)
  const existingReminders = await getReminders(orgId);
  const duplicate = existingReminders.find(
    (r) => r.invoiceId === invoice.id && r.sequenceNumber === seq
  );
  if (duplicate) {
    const conflictErr = new Error(`Reminder for sequence #${seq} already exists for this invoice.`);
    (conflictErr as any).status = 409;
    (conflictErr as any).code = '23505';
    throw conflictErr;
  }

  const insertPayload = {
    organization_id: orgId,
    invoice_id: invoice.id,
    client_id: client.id,
    sequence_number: seq,
    scheduled_at: reminderData.scheduledAt || new Date(Date.now() + 86400000).toISOString(),
    sent_at: null,
    status: 'SCHEDULED',
    tone: reminderData.tone || 'PROFESSIONAL',
    subject: reminderData.subject,
    body: reminderData.body,
    gmail_message_id: null,
    ai_generated: Boolean(reminderData.aiGenerated),
    approved_by_user: false,
    requires_review: reminderData.requiresReview !== false,
    last_error: null,
  };

  try {
    const { data, error } = await supabase
      .from('reminders')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        const now = new Date().toISOString();
        const fallbackRem: Reminder = {
          id: 'rem_' + Math.random().toString(36).substring(2, 12),
          organizationId: orgId,
          invoiceId: invoice.id,
          clientId: client.id,
          sequenceNumber: seq,
          scheduledAt: insertPayload.scheduled_at,
          sentAt: null,
          status: 'SCHEDULED',
          tone: (reminderData.tone as CommunicationStyle) || 'PROFESSIONAL',
          subject: reminderData.subject,
          body: reminderData.body,
          gmailMessageId: null,
          aiGenerated: Boolean(reminderData.aiGenerated),
          approvedByUser: false,
          requiresReview: reminderData.requiresReview !== false,
          lastError: null,
          createdAt: now,
          updatedAt: now,
        };
        return localStore.upsertReminder(fallbackRem);
      }
      if (
        error?.code === '23505' ||
        error?.message?.toLowerCase().includes('duplicate') ||
        error?.message?.toLowerCase().includes('unique')
      ) {
        const conflictErr = new Error(`Reminder for sequence #${seq} already exists for this invoice.`);
        (conflictErr as any).status = 409;
        (conflictErr as any).code = '23505';
        throw conflictErr;
      }
      throw new Error('Failed to create reminder.');
    }
    return mapReminder(data);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      const now = new Date().toISOString();
      const fallbackRem: Reminder = {
        id: 'rem_' + Math.random().toString(36).substring(2, 12),
        organizationId: orgId,
        invoiceId: invoice.id,
        clientId: client.id,
        sequenceNumber: seq,
        scheduledAt: insertPayload.scheduled_at,
        sentAt: null,
        status: 'SCHEDULED',
        tone: (reminderData.tone as CommunicationStyle) || 'PROFESSIONAL',
        subject: reminderData.subject,
        body: reminderData.body,
        gmailMessageId: null,
        aiGenerated: Boolean(reminderData.aiGenerated),
        approvedByUser: false,
        requiresReview: reminderData.requiresReview !== false,
        lastError: null,
        createdAt: now,
        updatedAt: now,
      };
      return localStore.upsertReminder(fallbackRem);
    }
    throw err;
  }
}

/**
 * Generic PATCH /reminders/:id MUST ONLY allow safe draft-edit fields.
 * Allowed fields: subject, body, tone, scheduledAt, requiresReview.
 * Strictly prevents mutation of: status, sentAt, gmailMessageId, approvedByUser, sequence, invoiceId, organizationId.
 */
export async function updateReminderDraft(
  orgId: string,
  id: string,
  updates: ReminderDraftUpdate
): Promise<Reminder> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const payload: Record<string, any> = {
    updated_at: now,
  };

  if (updates.scheduledAt !== undefined) payload.scheduled_at = updates.scheduledAt;
  if (updates.tone !== undefined) payload.tone = updates.tone;
  if (updates.subject !== undefined) payload.subject = updates.subject;
  if (updates.body !== undefined) payload.body = updates.body;
  if (updates.requiresReview !== undefined) payload.requires_review = Boolean(updates.requiresReview);

  try {
    const { data, error } = await supabase
      .from('reminders')
      .update(payload)
      .eq('organization_id', orgId)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        const r = localStore.getReminder(orgId, id);
        if (!r) throw new Error('Reminder not found.');
        const updated: Reminder = {
          ...r,
          scheduledAt: updates.scheduledAt !== undefined ? updates.scheduledAt : r.scheduledAt,
          tone: updates.tone !== undefined ? updates.tone : r.tone,
          subject: updates.subject !== undefined ? updates.subject : r.subject,
          body: updates.body !== undefined ? updates.body : r.body,
          requiresReview: updates.requiresReview !== undefined ? Boolean(updates.requiresReview) : r.requiresReview,
          updatedAt: now,
        };
        return localStore.upsertReminder(updated);
      }
      throw new Error('Failed to update reminder draft in database.');
    }
    return mapReminder(data);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      const r = localStore.getReminder(orgId, id);
      if (!r) throw new Error('Reminder not found.');
      const updated: Reminder = {
        ...r,
        scheduledAt: updates.scheduledAt !== undefined ? updates.scheduledAt : r.scheduledAt,
        tone: updates.tone !== undefined ? updates.tone : r.tone,
        subject: updates.subject !== undefined ? updates.subject : r.subject,
        body: updates.body !== undefined ? updates.body : r.body,
        requiresReview: updates.requiresReview !== undefined ? Boolean(updates.requiresReview) : r.requiresReview,
        updatedAt: now,
      };
      return localStore.upsertReminder(updated);
    }
    throw err;
  }
}

export async function updateReminder(
  orgId: string,
  id: string,
  updates: ReminderDraftUpdate
): Promise<Reminder> {
  return updateReminderDraft(orgId, id, updates);
}

/**
 * Reliability Rule (IC-V1.0.3):
 * NEVER mark a reminder SENT unless an actual email provider confirms successful dispatch.
 * Because Gmail sending is scheduled for a future milestone (IC-V1.0.4+),
 * attempting to dispatch live email must NOT fabricate fake Gmail IDs or fake SENT states.
 */
export async function approveAndSendReminder(
  orgId: string,
  id: string,
  senderEmail: string
): Promise<Reminder> {
  const reminder = await getReminderById(orgId, id);
  if (!reminder) throw new Error('Reminder not found.');

  const invoice = await getInvoiceById(orgId, reminder.invoiceId);
  if (!invoice) throw new Error('Associated invoice not found.');
  if (invoice.status === 'PAID') {
    throw new Error('Cannot send reminder for an invoice that is already PAID.');
  }
  if (invoice.status === 'DISPUTED') {
    throw new Error('Cannot send reminder for an invoice in DISPUTED status.');
  }

  // Check if live email dispatch provider is active and connected
  const connections = await getConnections(orgId);
  const gmailConn = connections.find((c) => c.provider === 'GMAIL' && c.status === 'CONNECTED');

  if (!gmailConn) {
    const error = new Error('Gmail integration is not connected. Connect Gmail in Connections to dispatch live payment reminders.');
    (error as any).code = 'INTEGRATION_REQUIRED';
    throw error;
  }

  // If connected, actual Gmail OAuth sending will be performed here in future integration milestone
  const error = new Error('Gmail live sending is not yet enabled in this environment.');
  (error as any).code = 'INTEGRATION_REQUIRED';
  throw error;
}

export async function cancelReminder(
  orgId: string,
  id: string,
  reason: string
): Promise<Reminder> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('reminders')
      .update({
        status: 'CANCELLED',
        last_error: `Cancelled: ${reason}`,
        updated_at: now,
      })
      .eq('organization_id', orgId)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        const r = localStore.getReminder(orgId, id);
        if (!r) throw new Error('Reminder not found.');
        r.status = 'CANCELLED';
        r.lastError = `Cancelled: ${reason}`;
        r.updatedAt = now;
        return localStore.upsertReminder(r);
      }
      throw new Error('Failed to cancel reminder in database.');
    }
    return mapReminder(data);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      const r = localStore.getReminder(orgId, id);
      if (!r) throw new Error('Reminder not found.');
      r.status = 'CANCELLED';
      r.lastError = `Cancelled: ${reason}`;
      r.updatedAt = now;
      return localStore.upsertReminder(r);
    }
    throw err;
  }
}

// ============================================================================
// EMAIL EVENTS & AUDIT LOGS (Tenant Scoped)
// ============================================================================
export async function getEmailEvents(orgId: string): Promise<EmailEvent[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('email_events')
      .select('*')
      .eq('organization_id', orgId)
      .order('event_timestamp', { ascending: false });

    if (error) {
      if (isSchemaCacheMissing(error)) {
        return localStore.getEmailEvents(orgId);
      }
      return [];
    }
    return (data || []).map(mapEmailEvent);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) return localStore.getEmailEvents(orgId);
    return [];
  }
}

export async function createEmailEvent(
  orgId: string,
  data: Omit<EmailEvent, 'id' | 'organizationId' | 'createdAt'>
): Promise<EmailEvent> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const payload = {
    organization_id: orgId,
    invoice_id: data.invoiceId || null,
    client_id: data.clientId || null,
    gmail_message_id: data.gmailMessageId || null,
    thread_id: data.threadId || null,
    direction: data.direction || 'OUTBOUND',
    event_type: data.eventType,
    subject: data.subject,
    sender: data.sender,
    recipient: data.recipient,
    body_preview: data.bodyPreview || null,
    event_timestamp: data.eventTimestamp || now,
    metadata: data.metadata || null,
  };

  try {
    const { data: row, error } = await supabase
      .from('email_events')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        const ee: EmailEvent = {
          id: 'ee_' + Math.random().toString(36).substring(2, 12),
          organizationId: orgId,
          invoiceId: data.invoiceId,
          clientId: data.clientId,
          gmailMessageId: data.gmailMessageId,
          threadId: data.threadId,
          direction: data.direction || 'OUTBOUND',
          eventType: data.eventType,
          subject: data.subject,
          sender: data.sender,
          recipient: data.recipient,
          bodyPreview: data.bodyPreview,
          eventTimestamp: data.eventTimestamp || now,
          metadata: data.metadata,
          createdAt: now,
        };
        return localStore.addEmailEvent(ee);
      }
      throw new Error(`Failed to create email event: ${error?.message}`);
    }
    return mapEmailEvent(row);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      const ee: EmailEvent = {
        id: 'ee_' + Math.random().toString(36).substring(2, 12),
        organizationId: orgId,
        invoiceId: data.invoiceId,
        clientId: data.clientId,
        gmailMessageId: data.gmailMessageId,
        threadId: data.threadId,
        direction: data.direction || 'OUTBOUND',
        eventType: data.eventType,
        subject: data.subject,
        sender: data.sender,
        recipient: data.recipient,
        bodyPreview: data.bodyPreview,
        eventTimestamp: data.eventTimestamp || now,
        metadata: data.metadata,
        createdAt: now,
      };
      return localStore.addEmailEvent(ee);
    }
    throw err;
  }
}

export async function getAuditLogs(orgId: string): Promise<AuditLog[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isSchemaCacheMissing(error)) {
        return localStore.getAuditLogs(orgId);
      }
      return [];
    }
    return (data || []).map(mapAuditLog);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) return localStore.getAuditLogs(orgId);
    return [];
  }
}

export async function createAuditLog(
  orgId: string,
  data: Omit<AuditLog, 'id' | 'organizationId' | 'createdAt'>
): Promise<AuditLog> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const payload = {
    organization_id: orgId,
    user_id: data.userId || null,
    event_type: data.eventType,
    entity_type: data.entityType,
    entity_id: data.entityId,
    message: data.message,
    metadata: data.metadata || null,
  };

  try {
    const { data: row, error } = await supabase
      .from('audit_logs')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        const al: AuditLog = {
          id: 'log_' + Math.random().toString(36).substring(2, 12),
          organizationId: orgId,
          userId: data.userId,
          eventType: data.eventType,
          entityType: data.entityType,
          entityId: data.entityId,
          message: data.message,
          metadata: data.metadata,
          createdAt: now,
        };
        return localStore.addAuditLog(al);
      }
      throw new Error(`Failed to create audit log: ${error?.message}`);
    }
    return mapAuditLog(row);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      const al: AuditLog = {
        id: 'log_' + Math.random().toString(36).substring(2, 12),
        organizationId: orgId,
        userId: data.userId,
        eventType: data.eventType,
        entityType: data.entityType,
        entityId: data.entityId,
        message: data.message,
        metadata: data.metadata,
        createdAt: now,
      };
      return localStore.addAuditLog(al);
    }
    throw err;
  }
}

// ============================================================================
// CONNECTIONS (Tenant Scoped)
// ============================================================================
export async function getConnections(orgId: string): Promise<Connection[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('connections')
      .select('*')
      .eq('organization_id', orgId);

    if (error && isSchemaCacheMissing(error)) {
      return localStore.getConnections(orgId);
    }

    const existing = (data || []).map(mapConnection);
    const providers: ('GMAIL' | 'GOOGLE_SHEETS')[] = ['GMAIL', 'GOOGLE_SHEETS'];
    for (const p of providers) {
      if (!existing.some((c) => c.provider === p)) {
        existing.push({
          id: `conn_${p.toLowerCase()}_${orgId.slice(0, 8)}`,
          organizationId: orgId,
          provider: p,
          status: 'DISCONNECTED',
          accountIdentifier: '',
          scopes: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
    return existing;
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) return localStore.getConnections(orgId);
    return [];
  }
}

export async function upsertConnection(
  orgId: string,
  provider: 'GMAIL' | 'GOOGLE_SHEETS',
  data: Partial<Connection>
): Promise<Connection> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  try {
    const { data: row, error } = await supabase
      .from('connections')
      .upsert(
        {
          organization_id: orgId,
          provider,
          status: data.status || 'DISCONNECTED',
          account_identifier: data.accountIdentifier || '',
          scopes: data.scopes || [],
          last_sync_at: data.lastSyncAt || null,
          sheet_metadata: data.sheetMetadata || null,
          updated_at: now,
        },
        { onConflict: 'organization_id,provider' }
      )
      .select('*')
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        const c: Connection = {
          id: `conn_${provider.toLowerCase()}_${orgId.slice(0, 8)}`,
          organizationId: orgId,
          provider,
          status: data.status || 'DISCONNECTED',
          accountIdentifier: data.accountIdentifier || '',
          scopes: data.scopes || [],
          lastSyncAt: data.lastSyncAt,
          sheetMetadata: data.sheetMetadata,
          createdAt: now,
          updatedAt: now,
        };
        return localStore.upsertConnection(c);
      }
      throw new Error('Failed to update connection in database.');
    }
    return mapConnection(row);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      const c: Connection = {
        id: `conn_${provider.toLowerCase()}_${orgId.slice(0, 8)}`,
        organizationId: orgId,
        provider,
        status: data.status || 'DISCONNECTED',
        accountIdentifier: data.accountIdentifier || '',
        scopes: data.scopes || [],
        lastSyncAt: data.lastSyncAt,
        sheetMetadata: data.sheetMetadata,
        createdAt: now,
        updatedAt: now,
      };
      return localStore.upsertConnection(c);
    }
    throw err;
  }
}

export async function disconnectConnection(
  orgId: string,
  provider: 'GMAIL' | 'GOOGLE_SHEETS'
): Promise<Connection> {
  const supabase = getSupabase();
  try {
    const { data: row, error } = await supabase
      .from('connections')
      .update({
        status: 'DISCONNECTED',
        account_identifier: '',
        scopes: [],
        oauth_access_token_encrypted: null,
        oauth_refresh_token_encrypted: null,
        oauth_token_expires_at: null,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', orgId)
      .eq('provider', provider)
      .select('*')
      .single();

    if (error || !row) {
      const fallbackConn: Connection = {
        id: `conn_${provider.toLowerCase()}_${orgId.slice(0, 8)}`,
        organizationId: orgId,
        provider,
        status: 'DISCONNECTED',
        accountIdentifier: '',
        scopes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStore.upsertConnection(fallbackConn);
      return fallbackConn;
    }
    return mapConnection(row);
  } catch (err: any) {
    const fallbackConn: Connection = {
      id: `conn_${provider.toLowerCase()}_${orgId.slice(0, 8)}`,
      organizationId: orgId,
      provider,
      status: 'DISCONNECTED',
      accountIdentifier: '',
      scopes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStore.upsertConnection(fallbackConn);
    return fallbackConn;
  }
}

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

/**
 * Server-only method to retrieve encrypted OAuth tokens for Gmail API execution.
 * NEVER return this directly to API responses or the frontend.
 */
export async function getGmailConnectionSecrets(orgId: string): Promise<GmailConnectionSecrets | null> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('connections')
      .select('id, organization_id, status, account_identifier, scopes, oauth_access_token_encrypted, oauth_refresh_token_encrypted, oauth_token_expires_at')
      .eq('organization_id', orgId)
      .eq('provider', 'GMAIL')
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        return localStore.getConnectionSecrets(orgId);
      }
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      organizationId: data.organization_id,
      status: data.status,
      accountIdentifier: data.account_identifier,
      encryptedAccessToken: data.oauth_access_token_encrypted || undefined,
      encryptedRefreshToken: data.oauth_refresh_token_encrypted || undefined,
      tokenExpiresAt: data.oauth_token_expires_at || undefined,
      scopes: Array.isArray(data.scopes) ? data.scopes : [],
    };
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) return localStore.getConnectionSecrets(orgId);
    return null;
  }
}

/**
 * Persists an authenticated Gmail OAuth connection with encrypted tokens.
 */
export async function saveGmailOAuthConnection(
  orgId: string,
  data: {
    accountEmail: string;
    encryptedAccessToken: string;
    encryptedRefreshToken?: string;
    tokenExpiresAt?: string;
    scopes: string[];
  }
): Promise<Connection> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const payload: Record<string, any> = {
    organization_id: orgId,
    provider: 'GMAIL',
    status: 'CONNECTED',
    account_identifier: data.accountEmail,
    scopes: data.scopes,
    oauth_access_token_encrypted: data.encryptedAccessToken,
    oauth_token_expires_at: data.tokenExpiresAt || null,
    last_tested_at: now,
    last_sync_at: now,
    error_message: null,
    last_error: null,
    updated_at: now,
  };

  if (data.encryptedRefreshToken) {
    payload.oauth_refresh_token_encrypted = data.encryptedRefreshToken;
  }

  try {
    const { data: row, error } = await supabase
      .from('connections')
      .upsert(payload, { onConflict: 'organization_id,provider' })
      .select('*')
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        const conn: Connection = {
          id: `conn_gmail_${orgId.slice(0, 8)}`,
          organizationId: orgId,
          provider: 'GMAIL',
          status: 'CONNECTED',
          accountIdentifier: data.accountEmail,
          scopes: data.scopes,
          lastTestedAt: now,
          lastSyncAt: now,
          createdAt: now,
          updatedAt: now,
        };
        localStore.upsertConnection(conn);
        localStore.saveConnectionSecrets(orgId, {
          id: conn.id,
          organizationId: orgId,
          status: 'CONNECTED',
          accountIdentifier: data.accountEmail,
          encryptedAccessToken: data.encryptedAccessToken,
          encryptedRefreshToken: data.encryptedRefreshToken,
          tokenExpiresAt: data.tokenExpiresAt,
          scopes: data.scopes,
        });
        return conn;
      }
      throw new Error(`Failed to save Gmail connection: ${error?.message}`);
    }

    return mapConnection(row);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      const conn: Connection = {
        id: `conn_gmail_${orgId.slice(0, 8)}`,
        organizationId: orgId,
        provider: 'GMAIL',
        status: 'CONNECTED',
        accountIdentifier: data.accountEmail,
        scopes: data.scopes,
        lastTestedAt: now,
        lastSyncAt: now,
        createdAt: now,
        updatedAt: now,
      };
      localStore.upsertConnection(conn);
      localStore.saveConnectionSecrets(orgId, {
        id: conn.id,
        organizationId: orgId,
        status: 'CONNECTED',
        accountIdentifier: data.accountEmail,
        encryptedAccessToken: data.encryptedAccessToken,
        encryptedRefreshToken: data.encryptedRefreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        scopes: data.scopes,
      });
      return conn;
    }
    throw err;
  }
}

/**
 * Updates Gmail connection verification state (e.g. following a test or error).
 */
export async function updateGmailConnectionStatus(
  orgId: string,
  status: 'CONNECTED' | 'DISCONNECTED' | 'EXPIRED' | 'ERROR',
  lastTestedAt?: string,
  errorMessage?: string
): Promise<Connection> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const updates: Record<string, any> = {
    status,
    updated_at: now,
  };

  if (lastTestedAt) {
    updates.last_tested_at = lastTestedAt;
    updates.last_sync_at = lastTestedAt;
  }

  if (errorMessage !== undefined) {
    updates.error_message = errorMessage;
    updates.last_error = errorMessage;
  } else if (status === 'CONNECTED') {
    updates.error_message = null;
    updates.last_error = null;
  }

  try {
    const { data: row, error } = await supabase
      .from('connections')
      .update(updates)
      .eq('organization_id', orgId)
      .eq('provider', 'GMAIL')
      .select('*')
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        const existing = localStore.getConnection(orgId, 'GMAIL') || {
          id: `conn_gmail_${orgId.slice(0, 8)}`,
          organizationId: orgId,
          provider: 'GMAIL' as const,
          status: 'DISCONNECTED' as const,
          accountIdentifier: '',
          scopes: [],
          createdAt: now,
          updatedAt: now,
        };
        existing.status = status;
        if (lastTestedAt) existing.lastTestedAt = lastTestedAt;
        if (errorMessage !== undefined) existing.errorMessage = errorMessage;
        existing.updatedAt = now;
        return localStore.upsertConnection(existing);
      }
      throw new Error(`Failed to update Gmail connection status: ${error?.message}`);
    }

    return mapConnection(row);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      const existing = localStore.getConnection(orgId, 'GMAIL') || {
        id: `conn_gmail_${orgId.slice(0, 8)}`,
        organizationId: orgId,
        provider: 'GMAIL' as const,
        status: 'DISCONNECTED' as const,
        accountIdentifier: '',
        scopes: [],
        createdAt: now,
        updatedAt: now,
      };
      existing.status = status;
      if (lastTestedAt) existing.lastTestedAt = lastTestedAt;
      if (errorMessage !== undefined) existing.errorMessage = errorMessage;
      existing.updatedAt = now;
      return localStore.upsertConnection(existing);
    }
    throw err;
  }
}

/**
 * Saves refreshed OAuth access tokens emitted during token rotation.
 */
export async function updateGmailRefreshedTokens(
  orgId: string,
  encryptedAccessToken: string,
  tokenExpiresAt?: string,
  encryptedRefreshToken?: string
): Promise<void> {
  const supabase = getSupabase();
  const updates: Record<string, any> = {
    oauth_access_token_encrypted: encryptedAccessToken,
    updated_at: new Date().toISOString(),
  };

  if (tokenExpiresAt) {
    updates.oauth_token_expires_at = tokenExpiresAt;
  }
  if (encryptedRefreshToken) {
    updates.oauth_refresh_token_encrypted = encryptedRefreshToken;
  }

  try {
    await supabase
      .from('connections')
      .update(updates)
      .eq('organization_id', orgId)
      .eq('provider', 'GMAIL');
  } catch {
    // schema cache missing safe
  }
  const secrets = localStore.getConnectionSecrets(orgId);
  if (secrets) {
    secrets.encryptedAccessToken = encryptedAccessToken;
    if (tokenExpiresAt) secrets.tokenExpiresAt = tokenExpiresAt;
    if (encryptedRefreshToken) secrets.encryptedRefreshToken = encryptedRefreshToken;
    localStore.saveConnectionSecrets(orgId, secrets);
  }
}

/**
 * Disconnects the organization's Gmail connection and wipes tokens from database.
 */
export async function disconnectGmailConnection(orgId: string): Promise<Connection> {
  return disconnectConnection(orgId, 'GMAIL');
}


// ============================================================================
// SETTINGS (Automation & AI) (Tenant Scoped)
// ============================================================================
export async function getAutomationSettings(orgId: string): Promise<AutomationSettings> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('automation_settings')
      .select('*')
      .eq('organization_id', orgId)
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        return (
          localStore.getAutomationSettings(orgId) || {
            id: '',
            organizationId: orgId,
            automaticReminders: true,
            automaticallyStopWhenPaid: true,
            avoidWeekends: true,
            preferredSendingTime: '10:00',
            timezone: 'Asia/Kolkata',
            policyTier: 'STANDARD',
            policyIntervals: {
              firstReminderDays: 3,
              secondReminderDays: 10,
              finalReminderDays: 17,
            },
            maxReminders: 3,
          }
        );
      }
      return {
        id: '',
        organizationId: orgId,
        automaticReminders: true,
        automaticallyStopWhenPaid: true,
        avoidWeekends: true,
        preferredSendingTime: '10:00',
        timezone: 'Asia/Kolkata',
        policyTier: 'STANDARD',
        policyIntervals: {
          firstReminderDays: 3,
          secondReminderDays: 10,
          finalReminderDays: 17,
        },
        maxReminders: 3,
      };
    }
    return mapAutomationSettings(data);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      return (
        localStore.getAutomationSettings(orgId) || {
          id: '',
          organizationId: orgId,
          automaticReminders: true,
          automaticallyStopWhenPaid: true,
          avoidWeekends: true,
          preferredSendingTime: '10:00',
          timezone: 'Asia/Kolkata',
          policyTier: 'STANDARD',
          policyIntervals: {
            firstReminderDays: 3,
            secondReminderDays: 10,
            finalReminderDays: 17,
          },
          maxReminders: 3,
        }
      );
    }
    return {
      id: '',
      organizationId: orgId,
      automaticReminders: true,
      automaticallyStopWhenPaid: true,
      avoidWeekends: true,
      preferredSendingTime: '10:00',
      timezone: 'Asia/Kolkata',
      policyTier: 'STANDARD',
      policyIntervals: {
        firstReminderDays: 3,
        secondReminderDays: 10,
        finalReminderDays: 17,
      },
      maxReminders: 3,
    };
  }
}

export async function updateAutomationSettings(
  orgId: string,
  updates: Partial<AutomationSettings>
): Promise<AutomationSettings> {
  const supabase = getSupabase();
  const payload: Record<string, any> = {
    organization_id: orgId,
  };

  if (updates.automaticReminders !== undefined) payload.automatic_reminders = updates.automaticReminders;
  if (updates.automaticallyStopWhenPaid !== undefined) payload.automatically_stop_when_paid = updates.automaticallyStopWhenPaid;
  if (updates.avoidWeekends !== undefined) payload.avoid_weekends = updates.avoidWeekends;
  if (updates.preferredSendingTime !== undefined) payload.preferred_sending_time = updates.preferredSendingTime;
  if (updates.timezone !== undefined) payload.timezone = updates.timezone;
  if (updates.policyTier !== undefined) payload.policy_tier = updates.policyTier;
  if (updates.policyIntervals !== undefined) payload.policy_intervals = updates.policyIntervals;
  if (updates.maxReminders !== undefined) payload.max_reminders = updates.maxReminders;

  try {
    const { data, error } = await supabase
      .from('automation_settings')
      .upsert(payload, { onConflict: 'organization_id' })
      .select('*')
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        const current = await getAutomationSettings(orgId);
        const updated: AutomationSettings = {
          ...current,
          ...updates,
          organizationId: orgId,
        };
        return localStore.upsertAutomationSettings(updated);
      }
      throw new Error(`Failed to update automation settings: ${error?.message}`);
    }
    return mapAutomationSettings(data);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      const current = await getAutomationSettings(orgId);
      const updated: AutomationSettings = {
        ...current,
        ...updates,
        organizationId: orgId,
      };
      return localStore.upsertAutomationSettings(updated);
    }
    throw err;
  }
}

export async function getAISettings(orgId: string): Promise<AISettings> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('organization_id', orgId)
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        return (
          localStore.getAISettings(orgId) || {
            id: '',
            organizationId: orgId,
            communicationStyle: 'PROFESSIONAL',
            relationshipAwarePersonalization: true,
            reviewBeforeSending: true,
          }
        );
      }
      return {
        id: '',
        organizationId: orgId,
        communicationStyle: 'PROFESSIONAL',
        relationshipAwarePersonalization: true,
        reviewBeforeSending: true,
      };
    }
    return mapAISettings(data);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      return (
        localStore.getAISettings(orgId) || {
          id: '',
          organizationId: orgId,
          communicationStyle: 'PROFESSIONAL',
          relationshipAwarePersonalization: true,
          reviewBeforeSending: true,
        }
      );
    }
    return {
      id: '',
      organizationId: orgId,
      communicationStyle: 'PROFESSIONAL',
      relationshipAwarePersonalization: true,
      reviewBeforeSending: true,
    };
  }
}

export async function updateAISettings(
  orgId: string,
  updates: Partial<AISettings>
): Promise<AISettings> {
  const supabase = getSupabase();
  const payload: Record<string, any> = {
    organization_id: orgId,
  };

  if (updates.communicationStyle !== undefined) payload.communication_style = updates.communicationStyle;
  if (updates.relationshipAwarePersonalization !== undefined) payload.relationship_aware_personalization = updates.relationshipAwarePersonalization;
  if (updates.reviewBeforeSending !== undefined) payload.review_before_sending = updates.reviewBeforeSending;
  if (updates.customToneInstructions !== undefined) payload.custom_tone_instructions = updates.customToneInstructions;

  try {
    const { data, error } = await supabase
      .from('ai_settings')
      .upsert(payload, { onConflict: 'organization_id' })
      .select('*')
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        const current = await getAISettings(orgId);
        const updated: AISettings = {
          ...current,
          ...updates,
          organizationId: orgId,
        };
        return localStore.upsertAISettings(updated);
      }
      throw new Error(`Failed to update AI settings: ${error?.message}`);
    }
    return mapAISettings(data);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      const current = await getAISettings(orgId);
      const updated: AISettings = {
        ...current,
        ...updates,
        organizationId: orgId,
      };
      return localStore.upsertAISettings(updated);
    }
    throw err;
  }
}

// ============================================================================
// SUBSCRIPTIONS & USAGE (Tenant Scoped)
// ============================================================================
export async function getSubscription(orgId: string): Promise<Subscription> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', orgId)
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        return (
          localStore.getSubscription(orgId) || {
            id: '',
            organizationId: orgId,
            plan: 'FREE',
            status: 'ACTIVE',
            currentPeriodStart: new Date().toISOString(),
            currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
            cancelAtPeriodEnd: false,
            limits: getPlanLimits('FREE'),
          }
        );
      }
      return {
        id: '',
        organizationId: orgId,
        plan: 'FREE',
        status: 'ACTIVE',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
        cancelAtPeriodEnd: false,
        limits: getPlanLimits('FREE'),
      };
    }
    return mapSubscription(data);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      return (
        localStore.getSubscription(orgId) || {
          id: '',
          organizationId: orgId,
          plan: 'FREE',
          status: 'ACTIVE',
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
          cancelAtPeriodEnd: false,
          limits: getPlanLimits('FREE'),
        }
      );
    }
    return {
      id: '',
      organizationId: orgId,
      plan: 'FREE',
      status: 'ACTIVE',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
      limits: getPlanLimits('FREE'),
    };
  }
}

export async function updateSubscriptionPlan(
  orgId: string,
  plan: SubscriptionPlan
): Promise<Subscription> {
  const supabase = getSupabase();
  const limits = getPlanLimits(plan);

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert(
        {
          organization_id: orgId,
          plan,
          status: 'ACTIVE',
          limits,
        },
        { onConflict: 'organization_id' }
      )
      .select('*')
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        const sub: Subscription = {
          id: 'sub_' + orgId.slice(0, 8),
          organizationId: orgId,
          plan,
          status: 'ACTIVE',
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
          cancelAtPeriodEnd: false,
          limits,
        };
        return localStore.upsertSubscription(sub);
      }
      throw new Error(`Failed to update subscription: ${error?.message}`);
    }
    return mapSubscription(data);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      const sub: Subscription = {
        id: 'sub_' + orgId.slice(0, 8),
        organizationId: orgId,
        plan,
        status: 'ACTIVE',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
        cancelAtPeriodEnd: false,
        limits,
      };
      return localStore.upsertSubscription(sub);
    }
    throw err;
  }
}

export async function getUsage(orgId: string): Promise<Usage> {
  const supabase = getSupabase();
  const currentMonth = new Date().toISOString().substring(0, 7);

  try {
    const { data, error } = await supabase
      .from('usage')
      .select('*')
      .eq('organization_id', orgId)
      .eq('month', currentMonth)
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        return (
          localStore.getUsage(orgId) || {
            organizationId: orgId,
            month: currentMonth,
            activeInvoicesCount: 0,
            remindersSentCount: 0,
            aiGenerationsCount: 0,
            connectedGmailAccounts: 0,
          }
        );
      }
      return {
        organizationId: orgId,
        month: currentMonth,
        activeInvoicesCount: 0,
        remindersSentCount: 0,
        aiGenerationsCount: 0,
        connectedGmailAccounts: 0,
      };
    }
    return mapUsage(data);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      return (
        localStore.getUsage(orgId) || {
          organizationId: orgId,
          month: currentMonth,
          activeInvoicesCount: 0,
          remindersSentCount: 0,
          aiGenerationsCount: 0,
          connectedGmailAccounts: 0,
        }
      );
    }
    return {
      organizationId: orgId,
      month: currentMonth,
      activeInvoicesCount: 0,
      remindersSentCount: 0,
      aiGenerationsCount: 0,
      connectedGmailAccounts: 0,
    };
  }
}

// ============================================================================
// NOTIFICATIONS (Tenant Scoped)
// ============================================================================
export async function getNotifications(orgId: string): Promise<NotificationItem[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isSchemaCacheMissing(error)) {
        return localStore.getNotifications(orgId);
      }
      return [];
    }
    return (data || []).map(mapNotification);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) return localStore.getNotifications(orgId);
    return [];
  }
}

export async function createNotification(
  orgId: string,
  data: Omit<NotificationItem, 'id' | 'organizationId' | 'createdAt'>
): Promise<NotificationItem> {
  const supabase = getSupabase();
  try {
    const { data: row, error } = await supabase
      .from('notifications')
      .insert({
        organization_id: orgId,
        type: data.type || 'INFO',
        title: data.title,
        message: data.message,
        action_url: data.actionUrl || null,
        read: Boolean(data.read),
      })
      .select('*')
      .single();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        const notif: NotificationItem = {
          id: 'notif_' + Math.random().toString(36).substring(2, 12),
          organizationId: orgId,
          type: data.type || 'INFO',
          title: data.title,
          message: data.message,
          actionUrl: data.actionUrl || null,
          read: Boolean(data.read),
          createdAt: new Date().toISOString(),
        };
        return localStore.addNotification(notif);
      }
      throw new Error(`Failed to create notification: ${error?.message}`);
    }
    return mapNotification(row);
  } catch (err: any) {
    if (isSchemaCacheMissing(err)) {
      const notif: NotificationItem = {
        id: 'notif_' + Math.random().toString(36).substring(2, 12),
        organizationId: orgId,
        type: data.type || 'INFO',
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl || null,
        read: Boolean(data.read),
        createdAt: new Date().toISOString(),
      };
      return localStore.addNotification(notif);
    }
    throw err;
  }
}

export async function markNotificationRead(orgId: string, id: string): Promise<void> {
  const supabase = getSupabase();
  try {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('organization_id', orgId)
      .eq('id', id);
  } catch {
    // schema cache missing safe
  }
  localStore.markNotificationRead(orgId, id);
}

export async function markAllNotificationsRead(orgId: string): Promise<void> {
  const supabase = getSupabase();
  try {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('organization_id', orgId);
  } catch {
    // schema cache missing safe
  }
  localStore.markAllNotificationsRead(orgId);
}
