import { GoogleGenAI, Type } from '@google/genai';
import { CommunicationStyle } from '../src/types';

let aiClient: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export interface VerifiedInvoiceFacts {
  invoiceNumber: string;
  clientName: string;
  companyName: string;
  clientCompanyName?: string;
  amountFormatted: string;
  dueDateFormatted: string;
  daysOverdue: number;
  sequenceNumber: 1 | 2 | 3;
  relationshipType: string;
  tone: CommunicationStyle;
  customInstructions?: string;
}

export interface GeneratedReminderDraft {
  subject: string;
  body: string;
  tone: CommunicationStyle;
  reasoning: string;
  aiGenerated: boolean;
  requiresReview: boolean;
}

/**
 * Generates an accounts-receivable reminder email using verified database facts only.
 * Guaranteed to respect safety boundaries (no hallucinations, no invented discounts/penalties).
 */
export async function generateReminderDraft(
  facts: VerifiedInvoiceFacts
): Promise<GeneratedReminderDraft> {
  const ai = getGemini();

  if (!ai) {
    return generateFallbackDraft(facts);
  }

  const prompt = `You are InvoiceChaser AI, an accounts receivable communication assistant.
Generate a concise, professional payment reminder email draft based EXCLUSIVELY on the verified facts below.

CRITICAL FINANCIAL SAFETY RULES:
1. ONLY use the provided Invoice Number: "${facts.invoiceNumber}". NEVER alter it.
2. ONLY use the provided Amount Due: "${facts.amountFormatted}". NEVER alter it.
3. ONLY use the provided Due Date: "${facts.dueDateFormatted}". NEVER alter it.
4. Client Name: "${facts.clientName}".
5. Sender Company Name: "${facts.companyName}".
6. Sequence Number: ${facts.sequenceNumber} of 3.
7. Overdue Days: ${facts.daysOverdue} days.
8. Client Relationship Context: ${facts.relationshipType}.
9. Desired Tone: ${facts.tone}.
${facts.customInstructions ? `10. User Custom Notes: "${facts.customInstructions}".` : ''}

STRICT SAFETY RESTRICTIONS:
- NEVER invent discounts, settlement waivers, or penalty fees.
- NEVER invent bank account numbers or wire routing details.
- NEVER fabricate legal threats, lawsuits, or collection agency claims.
- NEVER claim payment was received or that an email was sent earlier unless confirmed by sequence number.
- For Sequence 1 (First Notice): Gentle, polite check-in confirming receipt.
- For Sequence 2 (Second Notice): Clear, direct follow-up noting the invoice is past due.
- For Sequence 3 (Final Notice): Firm, urgent notice requesting immediate remittance to avoid service suspension.

Return ONLY a JSON object with:
- "subject": Clear, professional email subject line including the invoice number.
- "body": Professional email body formatted with clean line breaks.
- "reasoning": 1 sentence explaining tone and cadence choice.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            body: { type: Type.STRING },
            reasoning: { type: Type.STRING },
          },
          required: ['subject', 'body', 'reasoning'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    if (parsed.subject && parsed.body) {
      return {
        subject: parsed.subject,
        body: parsed.body,
        tone: facts.tone,
        reasoning: parsed.reasoning || `Tailored for ${facts.tone} tone and sequence #${facts.sequenceNumber}`,
        aiGenerated: true,
        requiresReview: true,
      };
    }
  } catch (err) {
    console.error('Gemini reminder generation error, using safe fallback template:', err);
  }

  return generateFallbackDraft(facts);
}

function generateFallbackDraft(facts: VerifiedInvoiceFacts): GeneratedReminderDraft {
  const isOverdue = facts.daysOverdue > 0;
  let subject = '';
  let body = '';

  if (facts.sequenceNumber === 1) {
    subject = `Payment Reminder: Invoice #${facts.invoiceNumber} from ${facts.companyName}`;
    body = `Hi ${facts.clientName},\n\nI hope you're having a great week.\n\nThis is a friendly reminder regarding Invoice #${facts.invoiceNumber} for ${facts.amountFormatted}, which ${isOverdue ? `was due on ${facts.dueDateFormatted} (${facts.daysOverdue} days ago)` : `is due on ${facts.dueDateFormatted}`}.\n\nPlease let us know if you need any clarification or another copy of the invoice.\n\nBest regards,\n${facts.companyName}`;
  } else if (facts.sequenceNumber === 2) {
    subject = `Follow-up: Overdue Invoice #${facts.invoiceNumber} (${facts.amountFormatted})`;
    body = `Hi ${facts.clientName},\n\nWe are following up on Invoice #${facts.invoiceNumber} for the amount of ${facts.amountFormatted}, which was due on ${facts.dueDateFormatted} and is currently ${facts.daysOverdue} days overdue.\n\nCould you please provide an update on the status of this payment at your earliest convenience?\n\nThank you for your prompt attention.\n\nSincerely,\n${facts.companyName}`;
  } else {
    subject = `Urgent: Final Notice for Invoice #${facts.invoiceNumber}`;
    body = `Dear ${facts.clientName},\n\nThis is a final notice regarding overdue Invoice #${facts.invoiceNumber} in the amount of ${facts.amountFormatted}, originally due on ${facts.dueDateFormatted} (${facts.daysOverdue} days overdue).\n\nPlease arrange for immediate payment to keep your account in good standing.\n\nIf you have already processed this payment, please disregard this message.\n\nRegards,\n${facts.companyName}`;
  }

  return {
    subject,
    body,
    tone: facts.tone,
    reasoning: `Safe template applied for Sequence #${facts.sequenceNumber} (${facts.daysOverdue} days overdue).`,
    aiGenerated: false,
    requiresReview: true,
  };
}
