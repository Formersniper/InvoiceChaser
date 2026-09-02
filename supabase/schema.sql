-- InvoiceChaser AI Normalized PostgreSQL Schema
-- Supports Supabase / PostgreSQL multi-tenant architecture

-- Enable UUID extension if supported
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ORGANIZATIONS
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. MEMBERSHIPS
CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner', -- 'owner' | 'admin' | 'member' | 'viewer'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- 4. CLIENTS
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  relationship_type TEXT NOT NULL DEFAULT 'REGULAR', -- 'NEW' | 'REGULAR' | 'VIP' | 'DELICATE' | 'LATE_PAYER' | 'DISPUTED'
  payment_reliability_score NUMERIC NOT NULL DEFAULT 85,
  average_payment_delay_days NUMERIC NOT NULL DEFAULT 0,
  total_invoiced NUMERIC NOT NULL DEFAULT 0,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  total_outstanding NUMERIC NOT NULL DEFAULT 0,
  never_contact BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  company_name TEXT,
  invoice_number TEXT NOT NULL,
  invoice_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  invoice_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DUE', -- 'DRAFT'|'SENT'|'DUE'|'OVERDUE'|'REMINDER_1'|'REMINDER_2'|'FINAL_NOTICE'|'PAID'|'STOPPED'|'FAILED'|'DISPUTED'
  days_overdue INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'MANUAL', -- 'GMAIL' | 'GOOGLE_SHEETS' | 'MANUAL'
  source_reference TEXT,
  last_reminder_at TIMESTAMPTZ,
  reminder_count INTEGER NOT NULL DEFAULT 0,
  next_reminder_at TIMESTAMPTZ,
  payment_received_at TIMESTAMPTZ,
  is_paused BOOLEAN NOT NULL DEFAULT FALSE,
  extraction_confidence TEXT DEFAULT 'HIGH',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. REMINDERS
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'SCHEDULED', -- 'SCHEDULED'|'GENERATING'|'PENDING_APPROVAL'|'SENT'|'CANCELLED'|'FAILED'|'SKIPPED'
  tone TEXT NOT NULL DEFAULT 'PROFESSIONAL', -- 'FRIENDLY'|'PROFESSIONAL'|'FIRM'
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  gmail_message_id TEXT,
  ai_generated BOOLEAN NOT NULL DEFAULT TRUE,
  approved_by_user BOOLEAN NOT NULL DEFAULT FALSE,
  requires_review BOOLEAN NOT NULL DEFAULT TRUE,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. EMAIL EVENTS
CREATE TABLE IF NOT EXISTS email_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id TEXT,
  client_id TEXT,
  gmail_message_id TEXT,
  thread_id TEXT,
  direction TEXT NOT NULL DEFAULT 'OUTBOUND', -- 'INBOUND' | 'OUTBOUND'
  event_type TEXT NOT NULL, -- 'INVOICE_SENT'|'REMINDER_SENT'|'CLIENT_REPLY'|'PAYMENT_CONFIRMATION'|'OTHER'
  subject TEXT NOT NULL,
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  body_preview TEXT,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. AUTOMATION JOBS
CREATE TABLE IF NOT EXISTS automation_jobs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id TEXT,
  job_type TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. CONNECTIONS
CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'GMAIL' | 'GOOGLE_SHEETS'
  status TEXT NOT NULL DEFAULT 'DISCONNECTED', -- 'CONNECTED'|'DISCONNECTED'|'EXPIRED'|'ERROR'
  account_identifier TEXT NOT NULL,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  sheet_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. AUTOMATION SETTINGS
CREATE TABLE IF NOT EXISTS automation_settings (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  automatic_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  automatically_stop_when_paid BOOLEAN NOT NULL DEFAULT TRUE,
  avoid_weekends BOOLEAN NOT NULL DEFAULT TRUE,
  preferred_sending_time TEXT NOT NULL DEFAULT '10:00',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  policy_tier TEXT NOT NULL DEFAULT 'STANDARD',
  policy_intervals JSONB NOT NULL DEFAULT '{"firstReminderDays": 3, "secondReminderDays": 10, "finalReminderDays": 17}'::jsonb,
  max_reminders INTEGER NOT NULL DEFAULT 3
);

-- 12. AI SETTINGS
CREATE TABLE IF NOT EXISTS ai_settings (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  communication_style TEXT NOT NULL DEFAULT 'PROFESSIONAL',
  relationship_aware_personalization BOOLEAN NOT NULL DEFAULT TRUE,
  review_before_sending BOOLEAN NOT NULL DEFAULT TRUE,
  custom_tone_instructions TEXT
);

-- 13. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  plan TEXT NOT NULL DEFAULT 'FREE', -- 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'BUSINESS'
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED'
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  limits JSONB NOT NULL DEFAULT '{"activeInvoices": 5, "remindersPerMonth": 10, "gmailAccounts": 1, "aiReminders": false, "relationshipIntelligence": false, "customRules": false, "teamMembers": 1}'::jsonb
);

-- 14. USAGE
CREATE TABLE IF NOT EXISTS usage (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  active_invoices_count INTEGER NOT NULL DEFAULT 0,
  reminders_sent_count INTEGER NOT NULL DEFAULT 0,
  ai_generations_count INTEGER NOT NULL DEFAULT 0,
  connected_gmail_accounts INTEGER NOT NULL DEFAULT 0,
  UNIQUE(organization_id, month)
);

-- 15. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'INFO', -- 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for high-performance multi-tenant lookups
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org ON memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_reminders_org ON reminders(organization_id);
CREATE INDEX IF NOT EXISTS idx_reminders_invoice ON reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id);
