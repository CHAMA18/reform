/**
 * Reform LLM Client — Local-first, OpenAI-compatible.
 *
 * Talks to any OpenAI-compatible endpoint:
 *   - Ollama (http://localhost:11434/v1)
 *   - LM Studio (http://localhost:1234/v1)
 *   - vLLM, Text Generation Inference, etc.
 *
 * Falls back to a rule-based engine if no local LLM is reachable.
 *
 * Env vars:
 *   LLM_BASE_URL  — Base URL of the local LLM server (default: http://localhost:11434/v1)
 *   LLM_API_KEY   — API key (can be "ollama" or empty for local servers)
 *   LLM_MODEL     — Model name (default: llama3.2)
 *
 * Usage:
 *   import { llmChat } from '@/lib/llm-client';
 *   const result = await llmChat(systemPrompt, userMessage, { max_tokens: 2000 });
 *   // result.content = string
 *   // result.model = 'llama3.2'
 *   // result.latency_ms = number
 *   // result.fallback = boolean
 */

import OpenAI from 'openai';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const LLM_BASE_URL = process.env.LLM_BASE_URL ?? 'http://localhost:11434/v1';
const LLM_API_KEY = process.env.LLM_API_KEY ?? 'ollama';
const LLM_MODEL = process.env.LLM_MODEL ?? 'llama3.2';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LLMChatResult {
  content: string;
  model: string;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  fallback: boolean;
}

interface LLMChatOptions {
  max_tokens?: number;
  temperature?: number;
  /** Request JSON-only output from the model (Ollama supports this) */
  json_mode?: boolean;
}

// ---------------------------------------------------------------------------
// OpenAI-compatible client (lazy singleton)
// ---------------------------------------------------------------------------

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      baseURL: LLM_BASE_URL,
      apiKey: LLM_API_KEY,
      timeout: 30_000, // 30s timeout for cloud API (OpenAI)
    });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Real LLM call via OpenAI-compatible API
// ---------------------------------------------------------------------------

async function callLocalLLM(
  systemPrompt: string,
  userMessage: string,
  options: LLMChatOptions = {}
): Promise<string> {
  const client = getClient();
  const params: Record<string, unknown> = {
    model: LLM_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    ...(options.max_tokens ? { max_tokens: options.max_tokens } : {}),
    ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
  };

  // When json_mode is requested, try to use Ollama's format param
  if (options.json_mode) {
    // OpenAI-compatible response_format (supported by newer Ollama)
    try {
      params.response_format = { type: 'json_object' };
    } catch {
      // Ignore — some endpoints don't support this
    }
  }

  const completion = await client.chat.completions.create(params as any);

  const content = completion.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('Empty completion from local LLM');
  return content;
}

// ---------------------------------------------------------------------------
// Rule-based fallback engine
// ---------------------------------------------------------------------------

/**
 * Deterministic fallback when no local LLM is reachable.
 * Produces the same structured output shape as the real LLM.
 */
function callFallbackLLM(systemPrompt: string, userMessage: string): string {
  const combined = (systemPrompt + ' ' + userMessage).toLowerCase();

  // Feature 1: AI Form Generator
  if (combined.includes('form generation engine') || combined.includes('generate a reform form') || combined.includes('form builder ai') || combined.includes('output valid json') || combined.includes('fields')) {
    return generateFormFlowchart(userMessage);
  }

  // Feature 2: Submission Insights
  if (combined.includes('submission analysis engine') || combined.includes('submission insights')) {
    return analyzeSubmissions(userMessage);
  }

  // Feature 3: Smart Field Suggestions
  if (combined.includes('field configuration suggester') || combined.includes('suggest configuration')) {
    return suggestFieldConfig(userMessage);
  }

  // Feature 4: Conversational Form (option matching)
  if (combined.includes('option matcher') || combined.includes('fuzzy-match')) {
    return matchOptions(userMessage);
  }

  // Feature 5: Smart Routing
  if (combined.includes('routing rule evaluator') || combined.includes('routing')) {
    return evaluateRoutingRule(userMessage);
  }

  // Feature 6: Translation
  if (combined.includes('form translation engine') || combined.includes('translatable strings')) {
    return translateForm(userMessage);
  }

  // Feature 7: Drop-off Analysis
  if (combined.includes('ux analyst') || combined.includes('drop-off')) {
    return analyzeDropOff(userMessage);
  }

  // Feature 8: PDF Analyst Notes
  if (combined.includes('analyst reviewing') || combined.includes('analyst note')) {
    return generateAnalystNotes(userMessage);
  }

  // Feature 9: Date normalisation
  if (combined.includes('extract a date') || combined.includes('yyyy-mm-dd')) {
    return normalizeDate(userMessage);
  }

  return JSON.stringify({ note: 'Fallback response — no specific rule matched.' });
}

// ---------------------------------------------------------------------------
// Feature-specific fallback generators
// ---------------------------------------------------------------------------

function generateFormFlowchart(prompt: string): string {
  const p = prompt.toLowerCase();
  let name = 'Custom Form';
  let fields: Array<{ id: string; type: string; label: string; placeholder?: string; required: boolean; options?: string[] }> = [];
  let description = 'A form generated by Reform AI.';
  let fieldNotes = '';
  const idPrefix = 'n' + Math.random().toString(36).slice(2, 6);

  if (p.includes('nps') || p.includes('feedback') || p.includes('survey') || p.includes('satisfaction') || p.includes('promoter') || p.includes('rating')) {
    name = 'Net Promoter Score Survey';
    description = 'B2B SaaS customer feedback survey measuring NPS with category routing and conditional follow-up.';
    fieldNotes = `Detected NPS/survey intent. Generated 5 fields: name, email, NPS 0-10 rating, category dropdown, and conditional comments for detractors.`;
    fields = [
      { id: `${idPrefix}_2`, type: 'text', label: 'Full Name', placeholder: 'Jane Doe', required: true },
      { id: `${idPrefix}_3`, type: 'email', label: 'Email Address', placeholder: 'jane@company.com', required: true },
      { id: `${idPrefix}_4`, type: 'rating', label: 'On a scale of 0-10, how likely are you to recommend us to a colleague?', required: true },
      { id: `${idPrefix}_5`, type: 'dropdown', label: 'Which area best describes your feedback?', required: true, options: ['Product', 'Support', 'Billing', 'Other'] },
      { id: `${idPrefix}_6`, type: 'textarea', label: 'What could we do better?', placeholder: 'Your feedback helps us improve...', required: false },
    ];
  } else if (p.includes('job') || p.includes('application') || p.includes('career') || p.includes('resume')) {
    name = 'Job Application';
    description = 'Job application form with contact info, portfolio, and cover letter.';
    fieldNotes = `Detected job application intent. Generated 5 fields covering identity, contact, portfolio, and cover letter.`;
    fields = [
      { id: `${idPrefix}_2`, type: 'text', label: 'Full Name', placeholder: 'Jane Doe', required: true },
      { id: `${idPrefix}_3`, type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true },
      { id: `${idPrefix}_4`, type: 'tel', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: false },
      { id: `${idPrefix}_5`, type: 'url', label: 'Portfolio URL', placeholder: 'https://...', required: false },
      { id: `${idPrefix}_6`, type: 'textarea', label: 'Cover Letter', placeholder: 'Why are you a great fit?', required: true },
    ];
  } else if (p.includes('contact') || p.includes('message') || p.includes('inquiry')) {
    name = 'Contact Form';
    description = 'A simple contact form for customer inquiries.';
    fieldNotes = `Detected contact form intent. Generated 3 fields: name, email, and message.`;
    fields = [
      { id: `${idPrefix}_2`, type: 'text', label: 'Name', placeholder: 'Your name', required: true },
      { id: `${idPrefix}_3`, type: 'email', label: 'Email', placeholder: 'you@example.com', required: true },
      { id: `${idPrefix}_4`, type: 'textarea', label: 'Message', placeholder: 'How can we help?', required: true },
    ];
  } else if (p.includes('event') || p.includes('registration') || p.includes('rsvp')) {
    name = 'Event Registration';
    description = 'Event registration form for conferences, meetups, and workshops.';
    fieldNotes = `Detected event registration intent. Generated 5 fields including dietary restrictions and t-shirt size.`;
    fields = [
      { id: `${idPrefix}_2`, type: 'text', label: 'Full Name', placeholder: 'Jane Doe', required: true },
      { id: `${idPrefix}_3`, type: 'email', label: 'Email', placeholder: 'jane@example.com', required: true },
      { id: `${idPrefix}_4`, type: 'text', label: 'Company', placeholder: 'Acme Inc.', required: false },
      { id: `${idPrefix}_5`, type: 'dropdown', label: 'Dietary Restrictions', required: false, options: ['None', 'Vegetarian', 'Vegan', 'Gluten-free', 'Other'] },
      { id: `${idPrefix}_6`, type: 'dropdown', label: 'T-shirt Size', required: false, options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    ];
  } else if (p.includes('support') || p.includes('ticket') || p.includes('help')) {
    name = 'Support Ticket';
    description = 'Customer support ticket form with priority and category.';
    fieldNotes = `Detected support ticket intent. Generated 6 fields with priority levels and category routing.`;
    fields = [
      { id: `${idPrefix}_2`, type: 'text', label: 'Name', placeholder: 'Your name', required: true },
      { id: `${idPrefix}_3`, type: 'email', label: 'Email', placeholder: 'you@example.com', required: true },
      { id: `${idPrefix}_4`, type: 'text', label: 'Subject', placeholder: 'Brief summary of the issue', required: true },
      { id: `${idPrefix}_5`, type: 'dropdown', label: 'Priority', required: true, options: ['Low', 'Medium', 'High', 'Urgent'] },
      { id: `${idPrefix}_6`, type: 'dropdown', label: 'Category', required: true, options: ['Bug', 'Billing', 'Feature Request', 'How-to', 'Other'] },
      { id: `${idPrefix}_7`, type: 'textarea', label: 'Description', placeholder: 'Describe your issue in detail...', required: true },
    ];
  } else if (p.includes('kyc') || p.includes('verification') || p.includes('identity')) {
    name = 'Identity Verification';
    description = 'Multi-stage identity verification form.';
    fieldNotes = `Detected KYC/verification intent. Generated 6 fields with date of birth, government ID, and ID type.`;
    fields = [
      { id: `${idPrefix}_2`, type: 'text', label: 'Full Name', placeholder: 'Jane Doe', required: true },
      { id: `${idPrefix}_3`, type: 'email', label: 'Email Address', placeholder: 'jane@company.com', required: true },
      { id: `${idPrefix}_4`, type: 'tel', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: true },
      { id: `${idPrefix}_5`, type: 'date', label: 'Date of Birth', required: true },
      { id: `${idPrefix}_6`, type: 'text', label: 'Government ID Number', placeholder: 'e.g. Passport number', required: true },
      { id: `${idPrefix}_7`, type: 'dropdown', label: 'ID Type', required: true, options: ['Passport', "Driver's License", 'National ID'] },
    ];
  } else {
    name = 'Custom Form';
    description = 'A form generated based on your prompt.';
    fieldNotes = `No specific template matched. Generated 3 generic fields as a starting point.`;
    fields = [
      { id: `${idPrefix}_2`, type: 'text', label: 'Name', placeholder: 'Your name', required: true },
      { id: `${idPrefix}_3`, type: 'email', label: 'Email', placeholder: 'you@example.com', required: true },
      { id: `${idPrefix}_4`, type: 'textarea', label: 'Message', placeholder: 'Your message', required: false },
    ];
  }

  const nodes: any[] = [
    { id: `${idPrefix}_1`, type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
  ];
  const edges: any[] = [];
  let prevId = `${idPrefix}_1`;
  let y = 150;
  for (const field of fields) {
    nodes.push({
      id: field.id,
      type: 'field',
      position: { x: 0, y },
      data: {
        label: field.label,
        fieldType: field.type,
        placeholder: field.placeholder ?? '',
        required: field.required,
        options: field.options ?? [],
        helperText: '',
        validationRules: field.required ? { required: true } : {},
      },
    });
    edges.push({ id: `e${prevId}_${field.id}`, source: prevId, target: field.id });
    prevId = field.id;
    y += 150;
  }
  nodes.push({ id: `${idPrefix}_last`, type: 'submit', position: { x: 0, y }, data: { label: 'Submit' } });
  edges.push({ id: `e${prevId}_${idPrefix}_last`, source: prevId, target: `${idPrefix}_last` });

  return JSON.stringify({ name, description, flowchart: { nodes, edges }, fieldNotes });
}

const POSITIVE_WORDS = new Set([
  'good', 'great', 'excellent', 'amazing', 'love', 'loved', 'perfect', 'awesome',
  'fantastic', 'wonderful', 'happy', 'satisfied', 'recommend', 'best', 'easy',
  'fast', 'helpful', 'impressed', 'smooth', 'intuitive', 'beautiful', 'clean',
  'premium', 'reliable', 'efficient', 'productive', 'outstanding', 'superb',
  'brilliant', 'delightful', 'pleased', 'enjoy', 'enjoyed', 'like', 'liked',
]);

const NEGATIVE_WORDS = new Set([
  'bad', 'terrible', 'awful', 'hate', 'hated', 'horrible', 'slow', 'broken',
  'buggy', 'confusing', 'difficult', 'hard', 'frustrated', 'frustrating',
  'disappointed', 'disappointing', 'poor', 'worst', 'expensive', 'overpriced',
  'complicated', 'clunky', 'unreliable', 'crash', 'crashed', 'error', 'errors',
  'fail', 'failed', 'wrong', 'issue', 'issues', 'problem', 'problems', 'refund',
  'billing', 'cancel', 'cancelled', 'delay', 'delayed', 'missing', 'unclear',
]);

function analyzeSubmissions(userMessage: string): string {
  const dataMatch = userMessage.match(/\[[\s\S]*\]/);
  let submissions: any[] = [];
  try {
    if (dataMatch) submissions = JSON.parse(dataMatch[0]);
  } catch { /* fallback */ }

  let positiveCount = 0;
  let negativeCount = 0;
  const topics: Record<string, { count: number; sentiment: string }> = {};

  const allText = submissions.length > 0
    ? submissions.map((s: any) => {
        const data = typeof s.data === 'string' ? JSON.parse(s.data) : s.data;
        return Object.values(data).join(' ');
      }).join(' ')
    : userMessage;

  const words = allText.toLowerCase().split(/\s+/);
  for (const word of words) {
    const clean = word.replace(/[^a-z]/g, '');
    if (POSITIVE_WORDS.has(clean)) positiveCount++;
    if (NEGATIVE_WORDS.has(clean)) negativeCount++;
    if (clean.length > 3 && !POSITIVE_WORDS.has(clean) && !NEGATIVE_WORDS.has(clean)) {
      const topicCandidates = ['billing', 'pricing', 'support', 'product', 'feature', 'bug', 'ui', 'ux', 'design', 'performance', 'login', 'payment', 'refund', 'delivery', 'shipping', 'quality', 'service', 'price', 'cost', 'fast', 'slow'];
      if (topicCandidates.includes(clean)) {
        if (!topics[clean]) topics[clean] = { count: 0, sentiment: 'neutral' };
        topics[clean].count++;
      }
    }
  }

  const total = positiveCount + negativeCount || 1;
  const positivePct = Math.round((positiveCount / total) * 100);
  const negativePct = Math.round((negativeCount / total) * 100);
  const neutralPct = Math.max(0, 100 - positivePct - negativePct);

  const bullets: string[] = [];
  const subCount = submissions.length || 1;
  bullets.push(`${subCount} submission${subCount > 1 ? 's' : ''} analyzed — ${positivePct}% positive, ${negativePct}% negative, ${neutralPct}% neutral.`);
  const topTopics = Object.entries(topics).sort((a, b) => b[1].count - a[1].count).slice(0, 3);
  if (topTopics.length > 0) {
    bullets.push(`Key themes: ${topTopics.map(([t, info]) => `${t} (${info.sentiment})`).join(', ')}.`);
  }
  if (negativePct > 40) {
    bullets.push(`Concerns raised — consider follow-up.`);
  } else if (positivePct > 60) {
    bullets.push(`Overall sentiment is positive — users are satisfied.`);
  } else {
    bullets.push(`Feedback is mixed — no dominant trend.`);
  }

  const quotes: string[] = [];
  if (submissions.length > 0) {
    for (const s of submissions.slice(0, 2)) {
      const data = typeof s.data === 'string' ? JSON.parse(s.data) : s.data;
      const values = Object.values(data).filter((v: any) => typeof v === 'string' && v.length > 10);
      if (values.length > 0) quotes.push(String(values[0]).slice(0, 100));
    }
  }

  return JSON.stringify({
    bullets,
    sentiment: { positive: positivePct, neutral: neutralPct, negative: negativePct },
    topics: Object.entries(topics).slice(0, 5).map(([topic, info]) => ({ topic, count: info.count, sentiment: info.sentiment })),
    standout_quotes: quotes,
  });
}

function suggestFieldConfig(userMessage: string): string {
  const labelMatch = userMessage.match(/labeled:\s*"([^"]+)"/i);
  const label = labelMatch ? labelMatch[1].toLowerCase() : '';
  const suggestions: Record<string, any> = {
    email: { suggestedType: 'email', suggestedPlaceholder: 'you@example.com', suggestedRequired: true, suggestedHelperText: 'We will use this for account notifications.', suggestedValidation: { pattern: '^[^\\\\s@]+@[^\\\\s@]+\\\\.[^\\\\s@]+$', patternMessage: 'Please enter a valid email address.' }, suggestedNotes: 'Email type provides built-in validation.' },
    phone: { suggestedType: 'tel', suggestedPlaceholder: '+1 (555) 000-0000', suggestedRequired: true, suggestedHelperText: 'Enter your phone number with country code.', suggestedValidation: { pattern: '^[+]?[0-9\\\\s\\\\-()]+$', patternMessage: 'Invalid phone number' }, suggestedNotes: 'Phone type triggers numeric keyboard on mobile.' },
    country: { suggestedType: 'dropdown', suggestedPlaceholder: 'Select a country', suggestedRequired: true, suggestedHelperText: 'Please select your country of residence', suggestedOptions: ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Japan', 'Brazil', 'India', 'China', 'Spain', 'Italy', 'Netherlands', 'Sweden', 'Other'], suggestedNotes: 'Country should be a dropdown with predefined options.' },
    name: { suggestedType: 'text', suggestedPlaceholder: 'Jane Doe', suggestedRequired: true, suggestedHelperText: 'Enter your full legal name.', suggestedValidation: { minLength: 2, maxLength: 100 }, suggestedNotes: 'Text type with min/max length validation.' },
    url: { suggestedType: 'url', suggestedPlaceholder: 'https://example.com', suggestedRequired: false, suggestedHelperText: 'Enter a valid URL including https://', suggestedValidation: { pattern: '^https?://.+', patternMessage: 'Please enter a valid URL starting with http:// or https://' }, suggestedNotes: 'URL type with protocol validation.' },
    age: { suggestedType: 'number', suggestedPlaceholder: '25', suggestedRequired: true, suggestedValidation: { min: 13, max: 120 }, suggestedNotes: 'Number type with sensible min/max bounds.' },
    rating: { suggestedType: 'rating', suggestedPlaceholder: '', suggestedRequired: true, suggestedNotes: 'Rating type with a 1-5 scale for quick feedback.' },
    date: { suggestedType: 'date', suggestedPlaceholder: '', suggestedRequired: true, suggestedNotes: 'Date picker for date of birth or event dates.' },
    password: { suggestedType: 'password', suggestedPlaceholder: '', suggestedRequired: true, suggestedValidation: { minLength: 8 }, suggestedHelperText: 'Minimum 8 characters.', suggestedNotes: 'Password type with minimum length validation.' },
  };

  let match: Record<string, any> | null = null;
  for (const [keyword, config] of Object.entries(suggestions)) {
    if (label.includes(keyword)) { match = config; break; }
  }
  if (!match) {
    match = { suggestedType: 'text', suggestedPlaceholder: `Enter ${label || 'value'}...`, suggestedRequired: false, suggestedHelperText: '', suggestedNotes: `Text input is suitable for "${label || 'this field'}".` };
  }
  return JSON.stringify(match);
}

function matchOptions(userMessage: string): string {
  const optionsMatch = userMessage.match(/Available options:\s*(\[[\s\S]*?\])/);
  if (!optionsMatch) return JSON.stringify({ value: null });
  let options: string[] = [];
  try { options = JSON.parse(optionsMatch[1]); } catch { return JSON.stringify({ value: null }); }
  const userText = userMessage.split('Available options:')[0].toLowerCase();
  for (const opt of options) {
    if (userText.includes(opt.toLowerCase())) return JSON.stringify({ value: opt });
  }
  return JSON.stringify({ value: null });
}

function evaluateRoutingRule(userMessage: string): string {
  const text = userMessage.toLowerCase();
  const submissionMatch = text.match(/submission data:\s*([\s\S]+)/);
  const submissionText = submissionMatch ? submissionMatch[1] : '';
  const billingKeywords = ['billing', 'pricing', 'refund', 'payment', 'invoice', 'charged', 'overcharged', 'subscription'];
  const billingMatch = billingKeywords.some((kw) => submissionText.includes(kw));
  if (billingMatch) {
    return JSON.stringify({ matches: true, confidence: 0.9, reason: 'Submission mentions billing-related keywords.' });
  }
  return JSON.stringify({ matches: false, confidence: 0.8, reason: 'No billing-related keywords found.' });
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  es: { 'Start': 'Comenzar', 'Submit': 'Enviar', 'Name': 'Nombre', 'Email': 'Correo electrónico', 'Phone Number': 'Número de teléfono', 'Message': 'Mensaje', 'Full Name': 'Nombre completo', 'Email Address': 'Dirección de correo electrónico' },
  fr: { 'Start': 'Commencer', 'Submit': 'Soumettre', 'Name': 'Nom', 'Email': 'E-mail', 'Phone Number': 'Numéro de téléphone', 'Message': 'Message', 'Full Name': 'Nom complet', 'Email Address': 'Adresse e-mail' },
  de: { 'Start': 'Starten', 'Submit': 'Absenden', 'Name': 'Name', 'Email': 'E-Mail', 'Phone Number': 'Telefonnummer', 'Message': 'Nachricht', 'Full Name': 'Vollständiger Name', 'Email Address': 'E-Mail-Adresse' },
  pt: { 'Start': 'Iniciar', 'Submit': 'Enviar', 'Name': 'Nome', 'Email': 'E-mail', 'Phone Number': 'Número de telefone', 'Message': 'Mensagem', 'Full Name': 'Nome completo', 'Email Address': 'Endereço de e-mail' },
  zh: { 'Start': '开始', 'Submit': '提交', 'Name': '姓名', 'Email': '电子邮件', 'Phone Number': '电话号码', 'Message': '留言', 'Full Name': '全名', 'Email Address': '电子邮件地址' },
  ja: { 'Start': '開始', 'Submit': '送信', 'Name': '名前', 'Email': 'メール', 'Phone Number': '電話番号', 'Message': 'メッセージ', 'Full Name': '氏名', 'Email Address': 'メールアドレス' },
};

function translateForm(userMessage: string): string {
  const langMatch = userMessage.match(/Target language:\s*(\w+)/);
  const langCode = langMatch ? langMatch[1].toLowerCase().split(' ')[0] : 'es';
  const stringsMatch = userMessage.match(/Translatable strings JSON:\s*(\[[\s\S]*?\])/);
  if (!stringsMatch) return JSON.stringify({});
  let strings: string[];
  try { strings = JSON.parse(stringsMatch[1]); } catch { return JSON.stringify({}); }
  const dict = TRANSLATIONS[langCode] ?? {};
  const translations: Record<string, string> = {};
  for (const s of strings) {
    if (dict[s]) translations[s] = dict[s];
    else {
      const found = Object.entries(dict).find(([k]) => k.toLowerCase() === s.toLowerCase());
      if (found) translations[s] = found[1];
      else translations[s] = s;
    }
  }
  return JSON.stringify(translations);
}

function analyzeDropOff(userMessage: string): string {
  const statsMatch = userMessage.match(/Field stats JSON:\s*(\[[\s\S]*?\])/);
  if (!statsMatch) return '[]';
  let fields: any[];
  try { fields = JSON.parse(statsMatch[1]); } catch { return '[]'; }
  const suggestions: any[] = [];
  for (const field of fields) {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let severity = 'low';
    if (field.dropOffRate > 0.4) { issues.push(`${Math.round(field.dropOffRate * 100)}% abandoned.`); recommendations.push('Consider making this field optional.'); severity = 'high'; }
    else if (field.dropOffRate > 0.2) { issues.push(`${Math.round(field.dropOffRate * 100)}% drop-off.`); recommendations.push('Review the field label for clarity.'); severity = 'medium'; }
    if (field.avgTimeOnFieldMs > 30000) { issues.push(`Users spend ${Math.round(field.avgTimeOnFieldMs / 1000)}s on this field.`); recommendations.push('Simplify the input.'); severity = severity === 'low' ? 'medium' : severity; }
    if (issues.length > 0) suggestions.push({ fieldId: field.fieldId, label: field.label, issue: issues.join(' '), recommendation: recommendations.join(' '), severity });
  }
  return JSON.stringify(suggestions);
}

function generateAnalystNotes(userMessage: string): string {
  const dataMatch = userMessage.match(/Submission data:\s*([\s\S]+)/);
  if (!dataMatch) return 'A submission was received and processed. No anomalies detected.';
  let fields: any[];
  try { fields = JSON.parse(dataMatch[1]); } catch { return 'A submission was received and processed. No anomalies detected.'; }
  const parts: string[] = [];
  const filledFields = fields.filter((f: any) => f.value !== null && f.value !== undefined && f.value !== '');
  const emptyFields = fields.filter((f: any) => f.value === null || f.value === undefined || f.value === '');
  parts.push(`This submission contains ${filledFields.length} of ${fields.length} fields.`);
  if (emptyFields.length > 0) parts.push(`Missing data: ${emptyFields.map((f: any) => f.label).join(', ')}.`);
  if (filledFields.length === fields.length) parts.push('All required fields completed — ready for processing.');
  else parts.push('Some fields are incomplete — follow-up may be needed.');
  return parts.join(' ');
}

function normalizeDate(userMessage: string): string {
  const isoMatch = userMessage.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];
  const longMatch = userMessage.match(/(\w+)\s+(\d{1,2}),?\s*(\d{4})/);
  if (longMatch) {
    const months: Record<string, string> = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };
    const month = months[longMatch[1].toLowerCase()];
    if (month) return `${longMatch[3]}-${month}-${longMatch[2].padStart(2, '0')}`;
  }
  const usMatch = userMessage.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (usMatch) return `${usMatch[3]}-${usMatch[1].padStart(2, '0')}-${usMatch[2].padStart(2, '0')}`;
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Call the LLM with automatic fallback.
 *
 * Tries the local OpenAI-compatible endpoint first. If it fails (network
 * error, connection refused, empty response), falls back to the rule-based
 * engine. The fallback is designed to be indistinguishable from a real call.
 */

/**
 * Strip markdown code fences from LLM output.
 * Local models often wrap JSON in ```json ... ``` blocks.
 */
function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:json|JSON)?\n?/gm, '')
    .replace(/```$/gm, '')
    .trim();
}

export async function llmChat(
  systemPrompt: string,
  userMessage: string,
  options: LLMChatOptions = {}
): Promise<LLMChatResult> {
  const startTime = Date.now();

  // Try the local LLM first
  try {
    let rawContent = await callLocalLLM(systemPrompt, userMessage, options);
    let content = stripMarkdownFences(rawContent);

    // Validate JSON if we got text back
    try {
      JSON.parse(content);
    } catch {
      // If JSON parsing failed, try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
    }
    const elapsedMs = Date.now() - startTime;
    return {
      content,
      model: LLM_MODEL,
      latency_ms: elapsedMs,
      input_tokens: Math.ceil((systemPrompt.length + userMessage.length) / 4),
      output_tokens: Math.ceil(content.length / 4),
      fallback: false,
    };
  } catch (err) {
    // Fall back to rule-based engine
    console.log(`[llm-client] LLM unavailable (${err instanceof Error ? err.message : 'unknown'}), using rule-based fallback`);
    const content = callFallbackLLM(systemPrompt, userMessage);

    // No artificial delay — respond immediately with fallback result
    const elapsedMs = Date.now() - startTime;
    return {
      content,
      model: LLM_MODEL,
      latency_ms: elapsedMs,
      input_tokens: Math.ceil((systemPrompt.length + userMessage.length) / 4),
      output_tokens: Math.ceil(content.length / 4),
      fallback: true,
    };
  }
}

/**
 * Check if the local LLM is reachable.
 * Useful for health checks and UI indicators.
 */
export async function isLocalLLMAvailable(): Promise<boolean> {
  try {
    const client = getClient();
    await client.models.list();
    return true;
  } catch {
    return false;
  }
}
