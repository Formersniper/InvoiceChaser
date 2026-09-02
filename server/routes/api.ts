import { Router } from 'express';
import { getSupabase } from '../supabase';
import {
  findUserById,
  upsertUserRecord,
  createOrganizationForUser,
  getUserOrganizations,
  getWorkspaceSnapshot,
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  markInvoicePaid,
  pauseInvoice,
  resumeInvoice,
  disputeInvoice,
  getReminders,
  getReminderById,
  createReminder,
  updateReminder,
  approveAndSendReminder,
  cancelReminder,
  getEmailEvents,
  getAuditLogs,
  createAuditLog,
  getConnections,
  upsertConnection,
  disconnectConnection,
  getAutomationSettings,
  updateAutomationSettings,
  getAISettings,
  updateAISettings,
  updateSubscriptionPlan,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  updateOrganization,
  updateUserProfile,
} from '../db';
import { requireAuth, requireOrgMember, AuthenticatedRequest } from '../auth';
import { generateReminderDraft } from '../gemini';

export const apiRouter = Router();

/* -------------------------------------------------------------
   PUBLIC AUTH ENDPOINTS (Supabase Auth Authority)
------------------------------------------------------------- */
apiRouter.post('/auth/signup', async (req, res) => {
  try {
    const { email, password, name, companyName } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const supabase = getSupabase();

    // 1. Sign up user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name: cleanName,
          companyName: companyName ? companyName.trim() : `${cleanName}'s Studio`,
        },
      },
    });

    if (authError || !authData.user) {
      return res.status(400).json({
        error: authError?.message || 'Failed to create user in Supabase Auth.',
      });
    }

    const authUser = authData.user;

    // 2. Ensure application profile exists in public.users
    const user = await upsertUserRecord({
      id: authUser.id,
      email: normalizedEmail,
      name: cleanName,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
    });

    // 3. Create initial organization & owner membership
    const { organization, membership } = await createOrganizationForUser(
      user,
      companyName ? companyName.trim() : `${cleanName}'s Studio`
    );

    // 4. Retrieve authoritative Supabase access token & set secure cookie
    let token = authData.session?.access_token;
    if (!token) {
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (signInData?.session?.access_token) {
        token = signInData.session.access_token;
      }
    }

    if (token) {
      res.cookie('ic_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    const workspace = await getWorkspaceSnapshot(user.id, organization.id);

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      organization,
      membership,
      workspace,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Signup failed.';
    console.error('Signup error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const supabase = getSupabase();

    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (authError || !authData.user || !authData.session) {
      return res.status(401).json({ error: authError?.message || 'Invalid email or password.' });
    }

    const authUser = authData.user;
    const token = authData.session.access_token;

    // 2. Resolve or upsert profile in public.users
    let user = await findUserById(authUser.id);
    if (!user) {
      const name =
        authUser.user_metadata?.name ||
        (authUser.email ? authUser.email.split('@')[0] : 'User');
      user = await upsertUserRecord({
        id: authUser.id,
        email: authUser.email || normalizedEmail,
        name,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      });
    }

    // 3. Resolve user organizations
    const orgs = await getUserOrganizations(user.id);
    let organization = orgs[0];

    if (!organization) {
      const orgName = authUser.user_metadata?.companyName || `${user.name}'s Studio`;
      const created = await createOrganizationForUser(user, orgName);
      organization = created.organization;
    }

    // 4. Set httpOnly session cookie
    res.cookie('ic_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const workspace = await getWorkspaceSnapshot(user.id, organization.id);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      organization,
      workspace,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Login failed.';
    console.error('Login error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const supabase = getSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({
      success: true,
      message: `Password reset instructions have been sent to ${email}.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Password reset failed.';
    console.error('Forgot password error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/auth/logout', (req, res) => {
  res.clearCookie('ic_token');
  res.clearCookie('sb_token');
  return res.json({ success: true, message: 'Logged out successfully.' });
});

/* -------------------------------------------------------------
   AUTHENTICATED USER & WORKSPACE
------------------------------------------------------------- */
apiRouter.get('/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const orgs = await getUserOrganizations(user.id);
    const orgId = (req.headers['x-organization-id'] as string) || orgs[0]?.id;
    const workspace = await getWorkspaceSnapshot(user.id, orgId);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      workspace,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch session.';
    console.error('Me endpoint error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.patch('/auth/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, avatarUrl } = req.body;
    const updated = await updateUserProfile(req.user!.id, { name, avatarUrl });
    return res.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      avatarUrl: updated.avatarUrl,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update profile.';
    console.error('Profile update error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.get('/workspace', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = req.headers['x-organization-id'] as string;
    const workspace = await getWorkspaceSnapshot(req.user!.id, orgId);
    return res.json(workspace);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch workspace.';
    console.error('Workspace fetch error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.get('/organizations', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const orgs = await getUserOrganizations(req.user!.id);
    return res.json(orgs);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch organizations.';
    console.error('Organizations fetch error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/organizations', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Organization name is required.' });
    const { organization, membership } = await createOrganizationForUser(req.user!, name);
    return res.status(201).json({ organization, membership });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create organization.';
    console.error('Organization creation error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.patch('/organizations/:id', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, timezone, currency } = req.body;
    const updated = await updateOrganization(req.organizationId!, { name, timezone, currency });
    return res.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update organization.';
    console.error('Organization update error:', msg);
    return res.status(500).json({ error: msg });
  }
});

/* -------------------------------------------------------------
   CLIENTS API (Tenant Scoped)
------------------------------------------------------------- */
apiRouter.get('/clients', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const clients = await getClients(req.organizationId!);
    return res.json(clients);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch clients.';
    console.error('Clients fetch error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/clients', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, email, companyName, relationshipType, notes } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Client name and email are required.' });
    }

    const client = await createClient(req.organizationId!, {
      name,
      email,
      companyName: companyName || name,
      relationshipType: relationshipType || 'REGULAR',
      paymentReliabilityScore: 85,
      averagePaymentDelayDays: 0,
      totalInvoiced: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      neverContact: false,
      notes,
    });

    await createAuditLog(req.organizationId!, {
      userId: req.user!.id,
      eventType: 'CLIENT_CREATED',
      entityType: 'CLIENT',
      entityId: client.id,
      message: `Added client ${client.name} (${client.companyName}).`,
    });

    return res.status(201).json(client);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create client.';
    console.error('Client creation error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.patch('/clients/:id', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await updateClient(req.organizationId!, req.params.id, req.body);
    return res.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update client.';
    console.error('Client update error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.delete('/clients/:id', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const client = await getClientById(req.organizationId!, req.params.id);
    await deleteClient(req.organizationId!, req.params.id);

    if (client) {
      await createAuditLog(req.organizationId!, {
        userId: req.user!.id,
        eventType: 'CLIENT_DELETED',
        entityType: 'CLIENT',
        entityId: req.params.id,
        message: `Deleted client ${client.name}.`,
      });
    }

    return res.json({ success: true, message: 'Client deleted successfully.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete client.';
    console.error('Client deletion error:', msg);
    return res.status(500).json({ error: msg });
  }
});

/* -------------------------------------------------------------
   INVOICES API (Tenant Scoped & Protected)
------------------------------------------------------------- */
apiRouter.get('/invoices', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const invoices = await getInvoices(req.organizationId!);
    return res.json(invoices);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch invoices.';
    console.error('Invoices fetch error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/invoices', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      invoiceNumber,
      clientName,
      clientEmail,
      companyName,
      invoiceAmount,
      currency,
      invoiceDate,
      dueDate,
      status,
      notes,
    } = req.body;

    if (!invoiceNumber || !clientName || !clientEmail || invoiceAmount === undefined) {
      return res.status(400).json({
        error: 'Invoice number, client name, client email, and amount are required.',
      });
    }

    const invoice = await createInvoice(req.organizationId!, {
      clientId: '',
      clientName,
      clientEmail,
      companyName,
      invoiceNumber,
      invoiceAmount: Number(invoiceAmount),
      currency: currency || 'INR',
      invoiceDate: invoiceDate || new Date().toISOString().substring(0, 10),
      dueDate: dueDate || new Date(Date.now() + 14 * 86400000).toISOString().substring(0, 10),
      status: status || 'DUE',
      daysOverdue: 0,
      source: 'MANUAL',
      reminderCount: 0,
      isPaused: false,
      extractionConfidence: 'HIGH',
      notes,
    });

    await createAuditLog(req.organizationId!, {
      userId: req.user!.id,
      eventType: 'INVOICE_CREATED',
      entityType: 'INVOICE',
      entityId: invoice.id,
      message: `Created invoice #${invoice.invoiceNumber} for ${invoice.clientName} (${invoice.currency} ${invoice.invoiceAmount.toLocaleString()}).`,
    });

    return res.status(201).json(invoice);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create invoice.';
    console.error('Invoice creation error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.patch('/invoices/:id', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await updateInvoice(req.organizationId!, req.params.id, req.body);
    return res.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update invoice.';
    console.error('Invoice update error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.delete('/invoices/:id', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const inv = await getInvoiceById(req.organizationId!, req.params.id);
    await deleteInvoice(req.organizationId!, req.params.id);

    if (inv) {
      await createAuditLog(req.organizationId!, {
        userId: req.user!.id,
        eventType: 'INVOICE_DELETED',
        entityType: 'INVOICE',
        entityId: req.params.id,
        message: `Deleted invoice #${inv.invoiceNumber}.`,
      });
    }

    return res.json({ success: true, message: 'Invoice deleted successfully.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete invoice.';
    console.error('Invoice deletion error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/invoices/:id/mark-paid', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const paidInvoice = await markInvoicePaid(req.organizationId!, req.params.id);

    await createAuditLog(req.organizationId!, {
      userId: req.user!.id,
      eventType: 'PAYMENT_RECORDED',
      entityType: 'INVOICE',
      entityId: paidInvoice.id,
      message: `Invoice #${paidInvoice.invoiceNumber} marked as PAID. All outstanding reminders permanently stopped.`,
    });

    return res.json({
      success: true,
      invoice: paidInvoice,
      message: `Invoice #${paidInvoice.invoiceNumber} recorded as PAID. Reminders halted.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to mark invoice as paid.';
    console.error('Mark paid error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/invoices/:id/pause', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const paused = await pauseInvoice(req.organizationId!, req.params.id);
    return res.json(paused);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to pause reminders.';
    console.error('Pause invoice error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/invoices/:id/resume', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const resumed = await resumeInvoice(req.organizationId!, req.params.id);
    return res.json(resumed);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to resume reminders.';
    console.error('Resume invoice error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/invoices/:id/dispute', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const { disputed } = req.body;
    const result = await disputeInvoice(req.organizationId!, req.params.id, disputed !== false);
    return res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to dispute invoice.';
    console.error('Dispute invoice error:', msg);
    return res.status(500).json({ error: msg });
  }
});

/* -------------------------------------------------------------
   REMINDERS API (Tenant Scoped & Safeguarded)
------------------------------------------------------------- */
apiRouter.get('/reminders', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const reminders = await getReminders(req.organizationId!);
    return res.json(reminders);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch reminders.';
    console.error('Reminders fetch error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/reminders', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const { invoiceId, clientId, sequenceNumber, scheduledAt, tone, subject, body } = req.body;
    if (!invoiceId || !clientId || !subject || !body) {
      return res.status(400).json({ error: 'Invoice, client, subject, and body are required.' });
    }

    const reminder = await createReminder(req.organizationId!, {
      invoiceId,
      clientId,
      sequenceNumber: (Number(sequenceNumber || 1) as 1 | 2 | 3) || 1,
      scheduledAt: scheduledAt || new Date(Date.now() + 86400000).toISOString(),
      status: 'SCHEDULED',
      tone: tone || 'PROFESSIONAL',
      subject,
      body,
      aiGenerated: true,
      approvedByUser: false,
      requiresReview: true,
    });

    return res.status(201).json(reminder);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create reminder.';
    console.error('Reminder creation error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.patch('/reminders/:id', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await updateReminder(req.organizationId!, req.params.id, req.body);
    return res.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update reminder draft.';
    console.error('Reminder update error:', msg);
    return res.status(500).json({ error: msg });
  }
});

const handleApproveReminder = async (req: AuthenticatedRequest, res: any) => {
  try {
    const senderEmail = req.user?.email || 'accounts@yourbusiness.com';
    const sent = await approveAndSendReminder(req.organizationId!, req.params.id, senderEmail);

    await createAuditLog(req.organizationId!, {
      userId: req.user!.id,
      eventType: 'REMINDER_SENT',
      entityType: 'REMINDER',
      entityId: sent.id,
      message: `Approved and sent payment reminder (Sequence #${sent.sequenceNumber}) for invoice ${sent.invoiceId}.`,
    });

    return res.json(sent);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send reminder.';
    const code = (err as any)?.code;
    console.error('Approve reminder error:', msg);
    if (code === 'INTEGRATION_REQUIRED') {
      return res.status(422).json({ error: msg, code });
    }
    return res.status(500).json({ error: msg });
  }
};

apiRouter.post('/reminders/:id/approve', requireAuth, requireOrgMember, handleApproveReminder);
apiRouter.post('/reminders/:id/approve-and-send', requireAuth, requireOrgMember, handleApproveReminder);

apiRouter.post('/reminders/:id/cancel', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const { reason } = req.body;
    const cancelled = await cancelReminder(req.organizationId!, req.params.id, reason || 'Cancelled by user');
    return res.json(cancelled);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to cancel reminder.';
    console.error('Cancel reminder error:', msg);
    return res.status(500).json({ error: msg });
  }
});

/* -------------------------------------------------------------
   AI REMINDER GENERATION (Server-Side, Tenant-Scoped & Fact-Verified)
------------------------------------------------------------- */
apiRouter.post('/gemini/generate-reminder', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      invoiceId,
      invoiceNumber,
      clientName,
      companyName,
      amount,
      currency,
      dueDate,
      daysOverdue,
      sequenceNumber,
      relationshipType,
      communicationStyle,
      customInstructions,
    } = req.body;

    let targetInvoiceNumber = invoiceNumber;
    let targetClientName = clientName;
    let targetCompanyName = companyName || 'Our Business';
    let targetAmountFormatted = amount ? `${currency || '₹'}${Number(amount).toLocaleString('en-IN')}` : '';
    let targetDueDate = dueDate;
    let targetDaysOverdue = Number(daysOverdue) || 0;
    let targetRelationship = relationshipType || 'REGULAR';
    const targetSeq = (Number(sequenceNumber) as 1 | 2 | 3) || 1;

    // If invoiceId is provided, authoritatively resolve from database
    if (invoiceId) {
      const invoice = await getInvoiceById(req.organizationId!, invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found in your organization.' });
      }
      targetInvoiceNumber = invoice.invoiceNumber;
      targetClientName = invoice.clientName;
      targetAmountFormatted = `${invoice.currency} ${invoice.invoiceAmount.toLocaleString('en-IN')}`;
      targetDueDate = invoice.dueDate;
      targetDaysOverdue = invoice.daysOverdue;

      if (invoice.clientId) {
        const client = await getClientById(req.organizationId!, invoice.clientId);
        if (client) {
          targetRelationship = client.relationshipType || 'REGULAR';
        }
      }
    }

    if (!targetInvoiceNumber || !targetClientName) {
      return res.status(400).json({
        error: 'Invoice details or valid invoiceId required to generate reminder draft.',
      });
    }

    const draft = await generateReminderDraft({
      invoiceNumber: targetInvoiceNumber,
      clientName: targetClientName,
      companyName: targetCompanyName,
      amountFormatted: targetAmountFormatted || '₹0',
      dueDateFormatted: targetDueDate || new Date().toISOString().substring(0, 10),
      daysOverdue: targetDaysOverdue,
      sequenceNumber: targetSeq,
      relationshipType: targetRelationship,
      tone: communicationStyle || 'PROFESSIONAL',
      customInstructions: customInstructions ? String(customInstructions).slice(0, 500) : undefined,
    });

    return res.json(draft);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI Generation failed.';
    console.error('Gemini generation endpoint error:', msg);
    return res.status(500).json({ error: msg });
  }
});

/* -------------------------------------------------------------
   EVENTS, LOGS & CONNECTIONS (Tenant Scoped)
------------------------------------------------------------- */
apiRouter.get('/email-events', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const events = await getEmailEvents(req.organizationId!);
    return res.json(events);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch email events.';
    console.error('Email events fetch error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.get('/audit-logs', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const logs = await getAuditLogs(req.organizationId!);
    return res.json(logs);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch audit logs.';
    console.error('Audit logs fetch error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.get('/connections', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const connections = await getConnections(req.organizationId!);
    return res.json(connections);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch connections.';
    console.error('Connections fetch error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/connections/:provider/connect', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const provider = req.params.provider.toUpperCase() as 'GMAIL' | 'GOOGLE_SHEETS';
    const { accountIdentifier, scopes } = req.body;

    const connection = await upsertConnection(req.organizationId!, provider, {
      status: 'CONNECTED',
      accountIdentifier: accountIdentifier || `${provider.toLowerCase()}-user@gmail.com`,
      scopes: scopes || ['https://www.googleapis.com/auth/userinfo.email'],
    });

    await createAuditLog(req.organizationId!, {
      userId: req.user!.id,
      eventType: 'INTEGRATION_CONNECTED',
      entityType: 'INTEGRATION',
      entityId: connection.id,
      message: `Connected ${provider} integration account (${connection.accountIdentifier}).`,
    });

    return res.json(connection);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to connect integration.';
    console.error('Connection error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/connections/:provider/disconnect', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const provider = req.params.provider.toUpperCase() as 'GMAIL' | 'GOOGLE_SHEETS';
    const disconnected = await disconnectConnection(req.organizationId!, provider);

    await createAuditLog(req.organizationId!, {
      userId: req.user!.id,
      eventType: 'INTEGRATION_DISCONNECTED',
      entityType: 'INTEGRATION',
      entityId: disconnected.id,
      message: `Disconnected ${provider} integration account.`,
    });

    return res.json(disconnected);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to disconnect integration.';
    console.error('Disconnect error:', msg);
    return res.status(500).json({ error: msg });
  }
});

/* -------------------------------------------------------------
   SETTINGS & BILLING (Tenant Scoped)
------------------------------------------------------------- */
apiRouter.get('/settings/automation', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const settings = await getAutomationSettings(req.organizationId!);
    return res.json(settings);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch automation settings.';
    console.error('Automation settings fetch error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.patch('/settings/automation', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await updateAutomationSettings(req.organizationId!, req.body);
    return res.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update automation settings.';
    console.error('Automation settings update error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.get('/settings/ai', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const settings = await getAISettings(req.organizationId!);
    return res.json(settings);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch AI settings.';
    console.error('AI settings fetch error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.patch('/settings/ai', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await updateAISettings(req.organizationId!, req.body);
    return res.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update AI settings.';
    console.error('AI settings update error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/billing/upgrade', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const { plan } = req.body;
    if (!plan) return res.status(400).json({ error: 'Plan is required.' });

    const updated = await updateSubscriptionPlan(req.organizationId!, plan);

    await createAuditLog(req.organizationId!, {
      userId: req.user!.id,
      eventType: 'SUBSCRIPTION_UPGRADED',
      entityType: 'SUBSCRIPTION',
      entityId: updated.id,
      message: `Upgraded subscription tier to ${plan}.`,
    });

    return res.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update subscription.';
    console.error('Upgrade plan error:', msg);
    return res.status(500).json({ error: msg });
  }
});

/* -------------------------------------------------------------
   NOTIFICATIONS API (Tenant Scoped)
------------------------------------------------------------- */
apiRouter.get('/notifications', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const notifications = await getNotifications(req.organizationId!);
    return res.json(notifications);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch notifications.';
    console.error('Notifications fetch error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/notifications/:id/read', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    await markNotificationRead(req.organizationId!, req.params.id);
    return res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to mark notification as read.';
    console.error('Mark read error:', msg);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/notifications/mark-all-read', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    await markAllNotificationsRead(req.organizationId!);
    return res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to mark all notifications as read.';
    console.error('Mark all read error:', msg);
    return res.status(500).json({ error: msg });
  }
});
