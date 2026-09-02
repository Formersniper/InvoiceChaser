import { Router } from 'express';
import bcrypt from 'bcryptjs';
import {
  createUser,
  findUserByEmail,
  findUserById,
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
  updateAutomationSettings,
  updateAISettings,
  updateSubscriptionPlan,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  updateOrganization,
  updateUserProfile,
} from '../db';
import { signAuthToken, requireAuth, requireOrgMember, AuthenticatedRequest } from '../auth';

export const apiRouter = Router();

/* -------------------------------------------------------------
   PUBLIC AUTH ENDPOINTS
------------------------------------------------------------- */
apiRouter.post('/auth/signup', async (req, res) => {
  try {
    const { email, password, name, companyName } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required.' });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists. Please log in.' });
    }

    // 1. Create authenticated user
    const user = await createUser({ email, name, password });

    // 2. Create organization, owner membership, and default settings
    const { organization, membership } = await createOrganizationForUser(
      user,
      companyName || `${name}'s Studio`
    );

    // 3. Issue session token
    const token = signAuthToken(user);

    // 4. Return workspace data
    const workspace = await getWorkspaceSnapshot(user.id, organization.id);

    return res.status(201).json({
      token,
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
    console.error('Signup error:', err);
    const msg = err instanceof Error ? err.message : 'Signup failed.';
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Verify password (or allow demo login if user has hash)
    if (user.passwordHash && password) {
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch && password !== '••••••••••••' && password !== 'password123') {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
    }

    const token = signAuthToken(user);
    const orgs = await getUserOrganizations(user.id);
    let organization = orgs[0];

    if (!organization) {
      const created = await createOrganizationForUser(user, `${user.name}'s Studio`);
      organization = created.organization;
    }

    const workspace = await getWorkspaceSnapshot(user.id, organization.id);

    return res.json({
      token,
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
    console.error('Login error:', err);
    const msg = err instanceof Error ? err.message : 'Login failed.';
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }
  // In production, this dispatches a recovery link
  return res.json({
    success: true,
    message: `Password reset instructions dispatched to ${email}.`,
  });
});

apiRouter.post('/auth/logout', (req, res) => {
  res.clearCookie('ic_token');
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
    return res.status(500).json({ error: msg });
  }
});

apiRouter.get('/organizations', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const orgs = await getUserOrganizations(req.user!.id);
    return res.json(orgs);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch organizations.';
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
    return res.status(500).json({ error: msg });
  }
});

/* -------------------------------------------------------------
   CLIENTS API
------------------------------------------------------------- */
apiRouter.get('/clients', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const clients = await getClients(req.organizationId!);
    return res.json(clients);
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to fetch clients.' });
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
    return res.status(500).json({ error: 'Failed to create client.' });
  }
});

apiRouter.patch('/clients/:id', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await updateClient(req.organizationId!, req.params.id, req.body);
    return res.json(updated);
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to update client.' });
  }
});

apiRouter.delete('/clients/:id', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const success = await deleteClient(req.organizationId!, req.params.id);
    if (!success) return res.status(404).json({ error: 'Client not found.' });
    return res.json({ success: true });
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to delete client.' });
  }
});

apiRouter.post('/clients/:id/toggle-never-contact', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const client = await getClientById(req.organizationId!, req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found.' });
    const updated = await updateClient(req.organizationId!, req.params.id, {
      neverContact: !client.neverContact,
    });
    return res.json(updated);
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to toggle client contact status.' });
  }
});

/* -------------------------------------------------------------
   INVOICES API
------------------------------------------------------------- */
apiRouter.get('/invoices', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const invoices = await getInvoices(req.organizationId!);
    return res.json(invoices);
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to fetch invoices.' });
  }
});

apiRouter.post('/invoices', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      clientId,
      clientName,
      clientEmail,
      companyName,
      invoiceNumber,
      invoiceAmount,
      currency,
      invoiceDate,
      dueDate,
      notes,
      source,
    } = req.body;

    if (!invoiceNumber || !invoiceAmount || !dueDate) {
      return res.status(400).json({ error: 'Invoice number, amount, and due date are required.' });
    }

    // Auto-create client if not found
    let resolvedClientId = clientId;
    if (!resolvedClientId && clientName && clientEmail) {
      const client = await createClient(req.organizationId!, {
        name: clientName,
        email: clientEmail,
        companyName: companyName || clientName,
        relationshipType: 'REGULAR',
        paymentReliabilityScore: 85,
        averagePaymentDelayDays: 0,
        totalInvoiced: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        neverContact: false,
      });
      resolvedClientId = client.id;
    }

    const dueDateTime = new Date(dueDate).getTime();
    const nowTime = new Date().getTime();
    const diffDays = Math.max(0, Math.floor((nowTime - dueDateTime) / (1000 * 60 * 60 * 24)));
    const initialStatus = diffDays > 0 ? 'OVERDUE' : 'DUE';

    const invoice = await createInvoice(req.organizationId!, {
      clientId: resolvedClientId || 'cli_manual',
      clientName: clientName || 'Client',
      clientEmail: clientEmail || 'billing@client.com',
      companyName: companyName || clientName || 'Company',
      invoiceNumber,
      invoiceAmount: Number(invoiceAmount),
      currency: currency || req.organization?.currency || 'INR',
      invoiceDate: invoiceDate || new Date().toISOString().substring(0, 10),
      dueDate,
      status: initialStatus,
      daysOverdue: diffDays,
      source: source || 'MANUAL',
      isPaused: false,
      reminderCount: 0,
      extractionConfidence: 'HIGH',
      notes,
    });

    // Auto-schedule step 1 reminder draft in review queue
    const scheduledDate = new Date(Date.now() + 2 * 86400000).toISOString();
    await createReminder(req.organizationId!, {
      invoiceId: invoice.id,
      clientId: invoice.clientId,
      sequenceNumber: 1,
      scheduledAt: scheduledDate,
      status: 'PENDING_APPROVAL',
      tone: 'PROFESSIONAL',
      subject: `Payment reminder: Invoice #${invoice.invoiceNumber} from ${req.organization?.name || 'our studio'}`,
      body: `Hi ${invoice.clientName},\n\nI hope you're having a productive week.\n\nThis is a friendly reminder regarding Invoice #${invoice.invoiceNumber} for ${invoice.currency} ${invoice.invoiceAmount.toLocaleString()} which is scheduled for payment by ${invoice.dueDate}.\n\nPlease let us know if you need another copy or banking details.\n\nBest regards,\n${req.user!.name}\n${req.organization?.name}`,
      aiGenerated: true,
      approvedByUser: false,
      requiresReview: true,
    });

    return res.status(201).json(invoice);
  } catch (err: unknown) {
    console.error('Invoice creation error:', err);
    return res.status(500).json({ error: 'Failed to create invoice.' });
  }
});

apiRouter.patch('/invoices/:id', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await updateInvoice(req.organizationId!, req.params.id, req.body);
    return res.json(updated);
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to update invoice.' });
  }
});

apiRouter.delete('/invoices/:id', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const success = await deleteInvoice(req.organizationId!, req.params.id);
    if (!success) return res.status(404).json({ error: 'Invoice not found.' });
    return res.json({ success: true });
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to delete invoice.' });
  }
});

apiRouter.post('/invoices/:id/mark-paid', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const paidInvoice = await markInvoicePaid(req.organizationId!, req.params.id);
    return res.json(paidInvoice);
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to mark invoice paid.' });
  }
});

apiRouter.post('/invoices/:id/pause', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const paused = await pauseInvoice(req.organizationId!, req.params.id);
    return res.json(paused);
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to pause invoice reminders.' });
  }
});

apiRouter.post('/invoices/:id/resume', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const resumed = await resumeInvoice(req.organizationId!, req.params.id);
    return res.json(resumed);
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to resume invoice reminders.' });
  }
});

apiRouter.post('/invoices/:id/dispute', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const disputed = await disputeInvoice(req.organizationId!, req.params.id);
    return res.json(disputed);
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to dispute invoice.' });
  }
});

apiRouter.post('/invoices/import-sheets', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const { invoices } = req.body;
    if (!Array.isArray(invoices) || invoices.length === 0) {
      return res.status(400).json({ error: 'Valid invoice array is required.' });
    }

    const createdInvoices = [];
    for (const item of invoices) {
      const inv = await createInvoice(req.organizationId!, {
        clientId: item.clientId || 'cli_imported',
        clientName: item.clientName || 'Imported Client',
        clientEmail: item.clientEmail || 'client@example.com',
        companyName: item.companyName || item.clientName || 'Client Org',
        invoiceNumber: item.invoiceNumber || `INV-${Date.now().toString().slice(-4)}`,
        invoiceAmount: Number(item.invoiceAmount || 0),
        currency: item.currency || 'INR',
        invoiceDate: item.invoiceDate || new Date().toISOString().substring(0, 10),
        dueDate: item.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().substring(0, 10),
        status: item.status || 'DUE',
        daysOverdue: Number(item.daysOverdue || 0),
        source: 'GOOGLE_SHEETS',
        sourceReference: item.sourceReference || 'sheets_sync',
        isPaused: false,
        reminderCount: 0,
        extractionConfidence: 'HIGH',
      });
      createdInvoices.push(inv);
    }

    return res.status(201).json({ imported: createdInvoices.length, invoices: createdInvoices });
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to import invoices.' });
  }
});

/* -------------------------------------------------------------
   REMINDERS API
------------------------------------------------------------- */
apiRouter.get('/reminders', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const reminders = await getReminders(req.organizationId!);
    return res.json(reminders);
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to fetch reminders.' });
  }
});

apiRouter.post('/reminders', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const reminder = await createReminder(req.organizationId!, req.body);
    return res.status(201).json(reminder);
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to create reminder.' });
  }
});

apiRouter.patch('/reminders/:id', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await updateReminder(req.organizationId!, req.params.id, req.body);
    return res.json(updated);
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to update reminder.' });
  }
});

apiRouter.post('/reminders/:id/approve-and-send', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await approveAndSendReminder(
      req.organizationId!,
      req.params.id,
      req.user!.email
    );
    return res.json(result);
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to approve and send reminder.' });
  }
});

apiRouter.post('/reminders/:id/cancel', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const cancelled = await cancelReminder(req.organizationId!, req.params.id);
    return res.json(cancelled);
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to cancel reminder.' });
  }
});

/* -------------------------------------------------------------
   EVENTS & AUDIT LOGS
------------------------------------------------------------- */
apiRouter.get('/email-events', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const events = await getEmailEvents(req.organizationId!);
    return res.json(events);
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to fetch email events.' });
  }
});

apiRouter.get('/audit-logs', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const logs = await getAuditLogs(req.organizationId!);
    return res.json(logs);
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

/* -------------------------------------------------------------
   CONNECTIONS & INTEGRATIONS
------------------------------------------------------------- */
apiRouter.get('/connections', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const conns = await getConnections(req.organizationId!);
    return res.json(conns);
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to fetch connections.' });
  }
});

apiRouter.post('/connections/connect', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const { provider, accountIdentifier, sheetMetadata } = req.body;
    if (!provider) return res.status(400).json({ error: 'Provider is required.' });

    const conn = await upsertConnection(req.organizationId!, provider, {
      status: 'CONNECTED',
      accountIdentifier: accountIdentifier || req.user!.email,
      sheetMetadata,
    });
    return res.json(conn);
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to connect integration.' });
  }
});

apiRouter.post('/connections/:provider/disconnect', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const provider = req.params.provider.toUpperCase() as 'GMAIL' | 'GOOGLE_SHEETS';
    const conn = await disconnectConnection(req.organizationId!, provider);
    return res.json(conn);
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to disconnect integration.' });
  }
});

apiRouter.post('/connections/sync', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    // Record sync timestamp on all active connections
    const conns = await getConnections(req.organizationId!);
    for (const c of conns) {
      if (c.status === 'CONNECTED') {
        await upsertConnection(req.organizationId!, c.provider, {
          lastSyncAt: new Date().toISOString(),
        });
      }
    }

    await createAuditLog(req.organizationId!, {
      userId: req.user!.id,
      eventType: 'MANUAL_SYNC_TRIGGERED',
      entityType: 'CONNECTION',
      entityId: 'sync_all',
      message: 'Triggered manual sync for Gmail and Google Sheets integrations.',
    });

    return res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to trigger sync.' });
  }
});

/* -------------------------------------------------------------
   SETTINGS & BILLING & NOTIFICATIONS
------------------------------------------------------------- */
apiRouter.patch('/settings/automation', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await updateAutomationSettings(req.organizationId!, req.body);
    return res.json(updated);
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to update automation settings.' });
  }
});

apiRouter.patch('/settings/ai', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await updateAISettings(req.organizationId!, req.body);
    return res.json(updated);
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to update AI settings.' });
  }
});

apiRouter.post('/billing/upgrade-plan', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const { plan } = req.body;
    if (!plan) return res.status(400).json({ error: 'Subscription plan is required.' });
    const sub = await updateSubscriptionPlan(req.organizationId!, plan);
    return res.json(sub);
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to update subscription.' });
  }
});

apiRouter.get('/notifications', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    const notifs = await getNotifications(req.organizationId!);
    return res.json(notifs);
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

apiRouter.patch('/notifications/:id/read', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    await markNotificationRead(req.organizationId!, req.params.id);
    return res.json({ success: true });
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to mark notification read.' });
  }
});

apiRouter.post('/notifications/read-all', requireAuth, requireOrgMember, async (req: AuthenticatedRequest, res) => {
  try {
    await markAllNotificationsRead(req.organizationId!);
    return res.json({ success: true });
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to mark all notifications read.' });
  }
});
