-- ============================================================================
-- InvoiceChaser AI Normalized PostgreSQL Schema (Supabase Production Foundation)
-- Integrates directly with Supabase Auth (auth.users) and enforces Row Level Security (RLS)
-- ============================================================================

-- Enable pgcrypto / uuid-ossp if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. APPLICATION USER PROFILES (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ORGANIZATIONS (Multi-Tenant Accounts)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. MEMBERSHIPS (RBAC & Tenant Authorization)
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner', -- 'owner' | 'admin' | 'member' | 'viewer'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- 4. CLIENTS
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, invoice_number)
);

-- 6. REMINDERS
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
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
CREATE TABLE IF NOT EXISTS public.automation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. CONNECTIONS
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'GMAIL' | 'GOOGLE_SHEETS'
  status TEXT NOT NULL DEFAULT 'DISCONNECTED', -- 'CONNECTED'|'DISCONNECTED'|'EXPIRED'|'ERROR'
  account_identifier TEXT NOT NULL,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  sheet_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, provider)
);

-- 11. AUTOMATION SETTINGS
CREATE TABLE IF NOT EXISTS public.automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
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
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  communication_style TEXT NOT NULL DEFAULT 'PROFESSIONAL',
  relationship_aware_personalization BOOLEAN NOT NULL DEFAULT TRUE,
  review_before_sending BOOLEAN NOT NULL DEFAULT TRUE,
  custom_tone_instructions TEXT
);

-- 13. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  plan TEXT NOT NULL DEFAULT 'FREE', -- 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'BUSINESS'
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED'
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  limits JSONB NOT NULL DEFAULT '{"activeInvoices": 5, "remindersPerMonth": 10, "gmailAccounts": 1, "aiReminders": false, "relationshipIntelligence": false, "customRules": false, "teamMembers": 1}'::jsonb
);

-- 14. USAGE
CREATE TABLE IF NOT EXISTS public.usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  active_invoices_count INTEGER NOT NULL DEFAULT 0,
  reminders_sent_count INTEGER NOT NULL DEFAULT 0,
  ai_generations_count INTEGER NOT NULL DEFAULT 0,
  connected_gmail_accounts INTEGER NOT NULL DEFAULT 0,
  UNIQUE(organization_id, month)
);

-- 15. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'INFO', -- 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR MULTI-TENANT QUERY ACCELERATION
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org ON public.memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_org ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_reminders_org ON public.reminders(organization_id);
CREATE INDEX IF NOT EXISTS idx_reminders_invoice ON public.reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_email_events_org ON public.email_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON public.notifications(organization_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Helper function: Returns true if current authenticated user belongs to the specified organization
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships
    WHERE organization_id = org_id
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 1. USERS POLICIES
CREATE POLICY "Users can view own profile or org teammates" ON public.users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.memberships m1
      JOIN public.memberships m2 ON m1.organization_id = m2.organization_id
      WHERE m1.user_id = auth.uid() AND m2.user_id = public.users.id
    )
  );

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- 2. ORGANIZATIONS POLICIES
CREATE POLICY "Users can view organizations they belong to" ON public.organizations
  FOR SELECT TO authenticated
  USING (public.is_org_member(id) OR owner_user_id = auth.uid());

CREATE POLICY "Authenticated users can create organizations" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Org members can update their organization" ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.is_org_member(id))
  WITH CHECK (public.is_org_member(id));

-- 3. MEMBERSHIPS POLICIES
CREATE POLICY "Users can view memberships in their organizations" ON public.memberships
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR user_id = auth.uid());

CREATE POLICY "Users can join or create memberships" ON public.memberships
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_org_member(organization_id));

CREATE POLICY "Org members can update memberships" ON public.memberships
  FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Org members can delete memberships" ON public.memberships
  FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));

-- 4. CLIENTS POLICIES
CREATE POLICY "Clients tenant isolation" ON public.clients
  FOR ALL TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

-- 5. INVOICES POLICIES
CREATE POLICY "Invoices tenant isolation" ON public.invoices
  FOR ALL TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

-- 6. REMINDERS POLICIES
CREATE POLICY "Reminders tenant isolation" ON public.reminders
  FOR ALL TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

-- 7. EMAIL EVENTS POLICIES
CREATE POLICY "Email events tenant isolation" ON public.email_events
  FOR ALL TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

-- 8. AUTOMATION JOBS POLICIES
CREATE POLICY "Automation jobs tenant isolation" ON public.automation_jobs
  FOR ALL TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

-- 9. AUDIT LOGS POLICIES
CREATE POLICY "Audit logs tenant isolation" ON public.audit_logs
  FOR ALL TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

-- 10. CONNECTIONS POLICIES
CREATE POLICY "Connections tenant isolation" ON public.connections
  FOR ALL TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

-- 11. AUTOMATION SETTINGS POLICIES
CREATE POLICY "Automation settings tenant isolation" ON public.automation_settings
  FOR ALL TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

-- 12. AI SETTINGS POLICIES
CREATE POLICY "AI settings tenant isolation" ON public.ai_settings
  FOR ALL TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

-- 13. SUBSCRIPTIONS POLICIES
CREATE POLICY "Subscriptions tenant isolation" ON public.subscriptions
  FOR ALL TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

-- 14. USAGE POLICIES
CREATE POLICY "Usage tenant isolation" ON public.usage
  FOR ALL TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

-- 15. NOTIFICATIONS POLICIES
CREATE POLICY "Notifications tenant isolation" ON public.notifications
  FOR ALL TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

-- ============================================================================
-- AUTH SYNC TRIGGER
-- Automatically creates public.users profile record when a new user signs up in auth.users
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      'https://api.dicebear.com/7.x/initials/svg?seed=' || encode(COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), 'hex')
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
