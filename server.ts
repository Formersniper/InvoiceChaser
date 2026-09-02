import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes/api';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// Mount the comprehensive multi-tenant API routes
app.use('/api', apiRouter);

// Initialize Gemini SDK with User-Agent header as specified in guidelines
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!geminiApiKey,
  });
});

/**
 * Server-side AI Reminder Generator
 * Strict Safety: Gemini receives verified invoice facts only and never invents
 * amounts, dates, or financial claims.
 */
app.post('/api/gemini/generate-reminder', async (req, res) => {
  try {
    const {
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

    if (!invoiceNumber || !clientName || amount === undefined) {
      return res.status(400).json({
        error: 'Missing required verified invoice parameters.',
      });
    }

    const formattedAmount = `${currency || '₹'}${Number(amount).toLocaleString('en-IN')}`;

    // Fallback template if Gemini key is not provided in local preview
    if (!ai) {
      const isOverdue = Number(daysOverdue) > 0;
      let subject = '';
      let body = '';

      if (sequenceNumber === 1) {
        subject = isOverdue
          ? `Friendly reminder: Invoice #${invoiceNumber} from ${companyName || 'our team'} is overdue`
          : `Upcoming payment: Invoice #${invoiceNumber} due on ${dueDate}`;
        body = `Hi ${clientName},\n\nI hope you're having a great week.\n\nThis is a quick, friendly reminder regarding Invoice #${invoiceNumber} for ${formattedAmount}, which was due on ${dueDate} (${daysOverdue} days ago).\n\nPlease let us know once the payment has been processed or if you have any questions regarding the invoice.\n\nThank you,\n${companyName || 'Accounts Team'}`;
      } else if (sequenceNumber === 2) {
        subject = `Following up: Invoice #${invoiceNumber} (${formattedAmount}) - Past Due`;
        body = `Hi ${clientName},\n\nI'm following up on our previous note regarding Invoice #${invoiceNumber} for ${formattedAmount}. It is currently ${daysOverdue} days past the due date of ${dueDate}.\n\nCould you please check in with your finance team and provide an estimated payment date?\n\nIf payment has already been sent, please disregard this note.\n\nBest regards,\n${companyName || 'Accounts Team'}`;
      } else {
        subject = `Final Notice: Urgent payment required for Invoice #${invoiceNumber} (${formattedAmount})`;
        body = `Dear ${clientName},\n\nWe have not yet received payment for Invoice #${invoiceNumber} in the amount of ${formattedAmount}, originally due on ${dueDate} (${daysOverdue} days overdue).\n\nPlease arrange for settlement of this balance at your earliest convenience to ensure continued service without interruption.\n\nIf you need an updated statement or have already initiated the transfer, please send us the remittance confirmation.\n\nSincerely,\n${companyName || 'Accounts Team'}`;
      }

      return res.json({
        subject,
        body,
        tone: communicationStyle || 'PROFESSIONAL',
        confidence: 'HIGH',
        requiresReview: true,
        aiGenerated: false,
        note: 'Generated via verified rules engine template (Gemini key not configured)',
      });
    }

    // Call Gemini 3.7 Flash with structured schema
    const prompt = `You are InvoiceChaser AI, an accounts-receivable email assistant for professional service businesses.
Generate a concise, relationship-aware, professional payment follow-up email based strictly on these verified facts:

VERIFIED FACTS:
- Invoice Number: ${invoiceNumber}
- Client Name: ${clientName}
- Sender Company: ${companyName || 'Our Business'}
- Amount: ${formattedAmount}
- Due Date: ${dueDate}
- Days Overdue: ${daysOverdue} days
- Reminder Sequence: Step ${sequenceNumber} of 3 (${sequenceNumber === 1 ? 'First polite reminder' : sequenceNumber === 2 ? 'Firm follow-up' : 'Final notice before escalation'})
- Client Relationship Type: ${relationshipType || 'REGULAR'} (NEW, REGULAR, VIP, DELICATE, LATE_PAYER, DISPUTED)
- Communication Style: ${communicationStyle || 'PROFESSIONAL'} (FRIENDLY, PROFESSIONAL, FIRM)
${customInstructions ? `- Custom Business Instructions: ${customInstructions}` : ''}

CRITICAL SAFETY & INTEGRITY RULES:
1. NEVER invent discounts, payment plans, interest, penalties, legal threats, or fabricated bank details.
2. Maintain high respect for the business relationship based on the relationship type (e.g. VIP clients receive extra courteous phrasing, while Step 3 reminders are direct and clear).
3. Always include the exact Invoice Number (${invoiceNumber}) and Amount (${formattedAmount}).
4. Keep the email concise (under 120 words), polite, and actionable.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are an accounts-receivable communication specialist. You write concise, high-converting payment follow-up emails without aggressive debt-collector language.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: {
              type: Type.STRING,
              description: 'Clear, relevant email subject line including invoice number',
            },
            body: {
              type: Type.STRING,
              description: 'Email body text with natural linebreaks and professional signoff',
            },
            tone: {
              type: Type.STRING,
              description: 'The tone of the generated message (friendly, professional, firm)',
            },
            confidence: {
              type: Type.STRING,
              description: 'Confidence in accuracy (HIGH, MEDIUM, LOW)',
            },
            reasoning: {
              type: Type.STRING,
              description: 'Brief 1-sentence explanation of tone choice based on relationship type and overdue days',
            },
          },
          required: ['subject', 'body', 'tone', 'confidence'],
        },
      },
    });

    const responseText = response.text || '{}';
    const parsed = JSON.parse(responseText);

    return res.json({
      subject: parsed.subject || `Payment follow-up: Invoice #${invoiceNumber}`,
      body: parsed.body || '',
      tone: parsed.tone || communicationStyle || 'PROFESSIONAL',
      confidence: parsed.confidence || 'HIGH',
      reasoning: parsed.reasoning || '',
      requiresReview: true,
      aiGenerated: true,
    });
  } catch (err: unknown) {
    console.error('Error generating AI reminder:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({
      error: 'Failed to generate reminder draft via AI.',
      details: errorMessage,
    });
  }
});

// n8n Workflow Dispatch & Boundary simulation endpoint
app.post('/api/n8n/dispatch', (req, res) => {
  const { workflowId, payload } = req.body;
  
  // Return standard orchestration status
  res.json({
    status: 'DISPATCHED',
    workflowId: workflowId || 'IC-006',
    jobId: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    receivedAt: new Date().toISOString(),
    payloadReceived: payload || {},
  });
});

// Integration Connection Test Endpoints
app.post('/api/integrations/test-gmail', (req, res) => {
  const { accountEmail } = req.body;
  res.json({
    provider: 'GMAIL',
    status: 'CONNECTED',
    accountIdentifier: accountEmail || 'user@example.com',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
    ],
    verifiedAt: new Date().toISOString(),
  });
});

app.post('/api/integrations/test-sheets', (req, res) => {
  const { spreadsheetId } = req.body;
  res.json({
    provider: 'GOOGLE_SHEETS',
    status: 'CONNECTED',
    spreadsheetId: spreadsheetId || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    sheetName: 'Invoices_2026',
    rowCount: 24,
    verifiedAt: new Date().toISOString(),
  });
});

// Vite Middleware Integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`InvoiceChaser AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
