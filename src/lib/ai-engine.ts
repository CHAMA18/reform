/**
 * Reform AI Engine — Dual-mode LLM client
 *
 * Tries the real z-ai-web-dev-sdk first (works in the Z.ai sandbox where
 * internal-api.z.ai is reachable). If that fails (e.g. on Render, where
 * the private hostname isn't reachable), falls back to a rule-based
 * mock that produces the same structured output shape.
 *
 * The mock is NOT a random generator — it's a deterministic, rule-driven
 * engine that produces genuinely useful output:
 *   - Form generation: keyword matching → pre-built flowchart templates
 *   - Field suggestions: lookup table (email→type=email+regex, country→dropdown+options)
 *   - Submission insights: local sentiment analysis + topic extraction
 *   - Translation: dictionary of common form terms per language
 *   - Analyst notes: template-based summarisation of submission data
 *
 * Every call — real or fallback — still flows through the Xano function
 * stacks and is logged to ai_generation_log. The audit trail is real;
 * only the "brain" differs.
 *
 * Usage:
 *   import { aiChat } from '@/lib/ai-engine';
 *   const result = await aiChat(systemPrompt, userMessage, options);
 *   // result.content = string (the "LLM response")
 *   // result.model = 'glm-4.5' or 'rule-based-fallback'
 *   // result.latency_ms = number
 *   // result.fallback = boolean (true if mock was used)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AIChatResult {
  content: string;
  model: string;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  fallback: boolean;
}

interface AIChatOptions {
  max_tokens?: number;
  temperature?: number;
}

// ---------------------------------------------------------------------------
// Real LLM client (z-ai-web-dev-sdk)
// ---------------------------------------------------------------------------

async function callRealLLM(
  systemPrompt: string,
  userMessage: string,
  options: AIChatOptions = {}
): Promise<string> {
  const ZAI = (await import('z-ai-web-dev-sdk')).default;
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    thinking: { type: 'disabled' },
    ...(options.max_tokens ? { max_tokens: options.max_tokens } : {}),
    ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
  });
  const content = completion.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('Empty completion from z-ai-web-dev-sdk');
  return content;
}

// ---------------------------------------------------------------------------
// Rule-based fallback engine
// ---------------------------------------------------------------------------

/**
 * The fallback engine analyses the system prompt + user message to
 * determine which feature is being called, then generates a response
 * using deterministic rules.
 */
function callFallbackLLM(
  systemPrompt: string,
  userMessage: string
): string {
  const combined = (systemPrompt + ' ' + userMessage).toLowerCase();

  // --- Feature 1: AI Form Generator ---
  if (combined.includes("form generation engine") || combined.includes("generate a reform form")) {
    return generateFormFlowchart(userMessage);
  }

  // --- Feature 2: Submission Insights ---
  if (combined.includes("submission analysis engine") || combined.includes("submission insights")) {
    return analyzeSubmissions(userMessage);
  }

  // --- Feature 3: Smart Field Suggestions ---
  if (combined.includes("field configuration suggester") || combined.includes("suggest configuration")) {
    return suggestFieldConfig(userMessage);
  }

  // --- Feature 4: Conversational Form (option matching) ---
  if (combined.includes("option matcher") || combined.includes("fuzzy-match")) {
    return matchOptions(userMessage);
  }

  // --- Feature 5: Smart Routing ---
  if (combined.includes("routing rule evaluator") || combined.includes("routing")) {
    return evaluateRoutingRule(userMessage);
  }

  // --- Feature 6: Translation ---
  if (combined.includes("form translation engine") || combined.includes("translatable strings")) {
    return translateForm(userMessage);
  }

  // --- Feature 7: Drop-off Analysis ---
  if (combined.includes("ux analyst") || combined.includes("drop-off")) {
    return analyzeDropOff(userMessage);
  }

  // --- Feature 8: PDF Analyst Notes ---
  if (combined.includes("analyst reviewing") || combined.includes("analyst note")) {
    return generateAnalystNotes(userMessage);
  }

  // --- Feature 9: Date normalisation ---
  if (combined.includes("extract a date") || combined.includes("yyyy-mm-dd")) {
    return normalizeDate(userMessage);
  }

  // --- Default: return a generic JSON response ---
  return JSON.stringify({ note: "Fallback response — no specific rule matched." });
}

// ---------------------------------------------------------------------------
// Feature-specific fallback generators
// ---------------------------------------------------------------------------

function generateFormFlowchart(prompt: string): string {
  const p = prompt.toLowerCase();
  let name = 'Custom Form';
  let fields: Array<{ id: string; type: string; label: string; placeholder?: string; required: boolean; options?: string[] }> = [];
  let description = 'A form generated by Reform AI.';

  // NPS / feedback / survey
  if (p.includes('nps') || p.includes('feedback') || p.includes('survey') || p.includes('satisfaction')) {
    name = 'Customer Feedback Form';
    description = 'Collect customer feedback with rating and category selection.';
    fields = [
      { id: 'n2', type: 'text', label: 'Full Name', placeholder: 'Jane Doe', required: true },
      { id: 'n3', type: 'email', label: 'Email Address', placeholder: 'jane@company.com', required: true },
      { id: 'n4', type: 'rating', label: 'How would you rate your experience?', required: true },
      { id: 'n5', type: 'dropdown', label: 'Feedback Category', required: true, options: ['Product', 'Support', 'Billing', 'Other'] },
      { id: 'n6', type: 'textarea', label: 'Additional Comments', placeholder: 'Tell us more...', required: false },
    ];
  }
  // Job application
  else if (p.includes('job') || p.includes('application') || p.includes('career') || p.includes('resume')) {
    name = 'Job Application';
    description = 'Job application form with contact info, portfolio, and cover letter.';
    fields = [
      { id: 'n2', type: 'text', label: 'Full Name', placeholder: 'Jane Doe', required: true },
      { id: 'n3', type: 'email', label: 'Email Address', placeholder: 'jane@example.com', required: true },
      { id: 'n4', type: 'tel', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: false },
      { id: 'n5', type: 'url', label: 'Portfolio URL', placeholder: 'https://...', required: false },
      { id: 'n6', type: 'textarea', label: 'Cover Letter', placeholder: 'Why are you a great fit?', required: true },
    ];
  }
  // Contact form
  else if (p.includes('contact') || p.includes('message') || p.includes('inquiry')) {
    name = 'Contact Form';
    description = 'A simple contact form for customer inquiries.';
    fields = [
      { id: 'n2', type: 'text', label: 'Name', placeholder: 'Your name', required: true },
      { id: 'n3', type: 'email', label: 'Email', placeholder: 'you@example.com', required: true },
      { id: 'n4', type: 'textarea', label: 'Message', placeholder: 'How can we help?', required: true },
    ];
  }
  // Event registration
  else if (p.includes('event') || p.includes('registration') || p.includes('rsvp')) {
    name = 'Event Registration';
    description = 'Event registration form for conferences, meetups, and workshops.';
    fields = [
      { id: 'n2', type: 'text', label: 'Full Name', placeholder: 'Jane Doe', required: true },
      { id: 'n3', type: 'email', label: 'Email', placeholder: 'jane@example.com', required: true },
      { id: 'n4', type: 'text', label: 'Company', placeholder: 'Acme Inc.', required: false },
      { id: 'n5', type: 'dropdown', label: 'Dietary Restrictions', required: false, options: ['None', 'Vegetarian', 'Vegan', 'Gluten-free', 'Other'] },
      { id: 'n6', type: 'dropdown', label: 'T-shirt Size', required: false, options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    ];
  }
  // Support ticket
  else if (p.includes('support') || p.includes('ticket') || p.includes('help')) {
    name = 'Support Ticket';
    description = 'Customer support ticket form with priority and category.';
    fields = [
      { id: 'n2', type: 'text', label: 'Name', placeholder: 'Your name', required: true },
      { id: 'n3', type: 'email', label: 'Email', placeholder: 'you@example.com', required: true },
      { id: 'n4', type: 'text', label: 'Subject', placeholder: 'Brief summary of the issue', required: true },
      { id: 'n5', type: 'dropdown', label: 'Priority', required: true, options: ['Low', 'Medium', 'High', 'Urgent'] },
      { id: 'n6', type: 'dropdown', label: 'Category', required: true, options: ['Bug', 'Billing', 'Feature Request', 'How-to', 'Other'] },
      { id: 'n7', type: 'textarea', label: 'Description', placeholder: 'Describe your issue in detail...', required: true },
    ];
  }
  // KYC / verification
  else if (p.includes('kyc') || p.includes('verification') || p.includes('identity')) {
    name = 'Identity Verification';
    description = 'Multi-stage identity verification form.';
    fields = [
      { id: 'n2', type: 'text', label: 'Full Name', placeholder: 'Jane Doe', required: true },
      { id: 'n3', type: 'email', label: 'Email Address', placeholder: 'jane@company.com', required: true },
      { id: 'n4', type: 'tel', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: true },
      { id: 'n5', type: 'date', label: 'Date of Birth', required: true },
      { id: 'n6', type: 'text', label: 'Government ID Number', placeholder: 'e.g. Passport number', required: true },
      { id: 'n7', type: 'dropdown', label: 'ID Type', required: true, options: ["Passport", "Driver's License", 'National ID'] },
    ];
  }
  // Default: generic form
  else {
    name = 'Custom Form';
    description = 'A form generated based on your prompt.';
    fields = [
      { id: 'n2', type: 'text', label: 'Name', placeholder: 'Your name', required: true },
      { id: 'n3', type: 'email', label: 'Email', placeholder: 'you@example.com', required: true },
      { id: 'n4', type: 'textarea', label: 'Message', placeholder: 'Your message', required: false },
    ];
  }

  // Build the flowchart JSON
  const nodes: any[] = [
    { id: 'n1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
  ];
  const edges: any[] = [];

  let prevId = 'n1';
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

  nodes.push({ id: 'n_last', type: 'submit', position: { x: 0, y }, data: { label: 'Submit' } });
  edges.push({ id: `e${prevId}_n_last`, source: prevId, target: 'n_last' });

  return JSON.stringify({
    name,
    description,
    flowchart: { nodes, edges },
    fieldNotes: `Generated ${fields.length} fields based on prompt analysis. Form type: ${name}.`,
  });
}

// ---------------------------------------------------------------------------
// Positive/negative word lists for sentiment analysis
// ---------------------------------------------------------------------------

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
  // Try to extract the submission data from the user message
  const dataMatch = userMessage.match(/\[[\s\S]*\]/);
  let submissions: any[] = [];
  try {
    if (dataMatch) {
      submissions = JSON.parse(dataMatch[0]);
    }
  } catch {
    // If we can't parse, fall back to text analysis
  }

  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;
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

    // Topic extraction — look for recurring keywords
    if (clean.length > 3 && !POSITIVE_WORDS.has(clean) && !NEGATIVE_WORDS.has(clean)) {
      const topicCandidates = ['billing', 'pricing', 'support', 'product', 'feature', 'bug', 'ui', 'ux', 'design', 'performance', 'login', 'payment', 'refund', 'delivery', 'shipping', 'quality', 'service', 'price', 'cost', 'fast', 'slow'];
      if (topicCandidates.includes(clean)) {
        if (!topics[clean]) topics[clean] = { count: 0, sentiment: 'neutral' };
        topics[clean].count++;
      }
    }
  }

  // Determine sentiment per topic
  for (const [topic, info] of Object.entries(topics)) {
    const topicContext = allText.toLowerCase();
    if (NEGATIVE_WORDS.has(topic) || topicContext.includes(`${topic} bad`) || topicContext.includes(`${topic} issue`) || topicContext.includes(`${topic} problem`)) {
      info.sentiment = 'negative';
    } else if (POSITIVE_WORDS.has(topic) || topicContext.includes(`${topic} good`) || topicContext.includes(`${topic} great`)) {
      info.sentiment = 'positive';
    }
  }

  const total = positiveCount + negativeCount + neutralCount || 1;
  const positivePct = Math.round((positiveCount / total) * 100);
  const negativePct = Math.round((negativeCount / total) * 100);
  const neutralPct = Math.max(0, 100 - positivePct - negativePct);

  // Generate bullets
  const bullets: string[] = [];
  const subCount = submissions.length || 1;
  bullets.push(`${subCount} submission${subCount > 1 ? 's' : ''} analyzed — ${positivePct}% positive, ${negativePct}% negative, ${neutralPct}% neutral.`);

  const topTopics = Object.entries(topics).sort((a, b) => b[1].count - a[1].count).slice(0, 3);
  if (topTopics.length > 0) {
    const topicStr = topTopics.map(([t, info]) => `${t} (${info.sentiment})`).join(', ');
    bullets.push(`Key themes: ${topicStr}.`);
  }

  if (negativePct > 40) {
    bullets.push(`Concerns raised around ${topTopics.filter(([, info]) => info.sentiment === 'negative').map(([t]) => t).join(', ') || 'general experience'} — consider follow-up.`);
  } else if (positivePct > 60) {
    bullets.push(`Overall sentiment is positive — users are satisfied with the experience.`);
  } else {
    bullets.push(`Feedback is mixed — no dominant positive or negative trend.`);
  }

  // Extract standout quotes
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

// ---------------------------------------------------------------------------
// Field suggestion lookup table
// ---------------------------------------------------------------------------

function suggestFieldConfig(userMessage: string): string {
  // Extract the label from the prompt
  const labelMatch = userMessage.match(/labeled:\s*"([^"]+)"/i);
  const label = labelMatch ? labelMatch[1].toLowerCase() : '';
  const typeMatch = userMessage.match(/type:\s*"([^"]+)"/i);
  const currentType = typeMatch ? typeMatch[1] : 'text';

  const suggestions: Record<string, any> = {
    email: {
      suggestedType: 'email',
      suggestedPlaceholder: 'you@example.com',
      suggestedRequired: true,
      suggestedHelperText: 'We will use this for account notifications and password resets.',
      suggestedValidation: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', patternMessage: 'Please enter a valid email address.' },
      suggestedNotes: 'Email type provides built-in validation and appropriate keyboard for email input.',
    },
    phone: {
      suggestedType: 'tel',
      suggestedPlaceholder: '+1 (555) 000-0000',
      suggestedRequired: true,
      suggestedHelperText: 'Enter your phone number with country code.',
      suggestedValidation: { pattern: '^[+]?[0-9\\s\\-()]+$', patternMessage: 'Invalid phone number' },
      suggestedNotes: 'Phone type triggers the numeric keyboard on mobile devices.',
    },
    country: {
      suggestedType: 'dropdown',
      suggestedPlaceholder: 'Select a country',
      suggestedRequired: true,
      suggestedHelperText: 'Please select your country of residence',
      suggestedOptions: ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Japan', 'Brazil', 'India', 'China', 'Spain', 'Italy', 'Netherlands', 'Sweden', 'Other'],
      suggestedNotes: 'Country should be a dropdown with predefined options for consistency and data integrity.',
    },
    name: {
      suggestedType: 'text',
      suggestedPlaceholder: 'Jane Doe',
      suggestedRequired: true,
      suggestedHelperText: 'Enter your full legal name.',
      suggestedValidation: { minLength: 2, maxLength: 100 },
      suggestedNotes: 'Text type with min/max length validation to prevent empty or excessively long names.',
    },
    address: {
      suggestedType: 'textarea',
      suggestedPlaceholder: '123 Main St, City, State 12345, Country',
      suggestedRequired: true,
      suggestedHelperText: 'Full mailing address including street, city, and postal code.',
      suggestedNotes: 'Textarea allows multi-line address entry.',
    },
    message: {
      suggestedType: 'textarea',
      suggestedPlaceholder: 'Tell us more...',
      suggestedRequired: false,
      suggestedHelperText: 'Provide as much detail as you can.',
      suggestedValidation: { maxLength: 500 },
      suggestedNotes: 'Textarea with max length to prevent overly long messages.',
    },
    description: {
      suggestedType: 'textarea',
      suggestedPlaceholder: 'Describe...',
      suggestedRequired: false,
      suggestedValidation: { maxLength: 500 },
      suggestedNotes: 'Textarea for free-form description.',
    },
    url: {
      suggestedType: 'url',
      suggestedPlaceholder: 'https://example.com',
      suggestedRequired: false,
      suggestedHelperText: 'Enter a valid URL including https://',
      suggestedValidation: { pattern: '^https?://.+', patternMessage: 'Please enter a valid URL starting with http:// or https://' },
      suggestedNotes: 'URL type with protocol validation.',
    },
    website: {
      suggestedType: 'url',
      suggestedPlaceholder: 'https://your-website.com',
      suggestedRequired: false,
      suggestedValidation: { pattern: '^https?://.+', patternMessage: 'Please enter a valid URL' },
      suggestedNotes: 'URL type for website input.',
    },
    age: {
      suggestedType: 'number',
      suggestedPlaceholder: '25',
      suggestedRequired: true,
      suggestedValidation: { min: 13, max: 120 },
      suggestedNotes: 'Number type with sensible min/max bounds.',
    },
    rating: {
      suggestedType: 'rating',
      suggestedPlaceholder: '',
      suggestedRequired: true,
      suggestedNotes: 'Rating type with a 1-5 scale for quick feedback.',
    },
    date: {
      suggestedType: 'date',
      suggestedPlaceholder: '',
      suggestedRequired: true,
      suggestedNotes: 'Date picker for date of birth or event dates.',
    },
    password: {
      suggestedType: 'password',
      suggestedPlaceholder: '',
      suggestedRequired: true,
      suggestedValidation: { minLength: 8 },
      suggestedHelperText: 'Minimum 8 characters.',
      suggestedNotes: 'Password type with minimum length validation.',
    },
    gender: {
      suggestedType: 'dropdown',
      suggestedOptions: ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other'],
      suggestedRequired: false,
      suggestedNotes: 'Dropdown with inclusive options.',
    },
    state: {
      suggestedType: 'dropdown',
      suggestedOptions: ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'],
      suggestedRequired: true,
      suggestedNotes: 'Dropdown with all US states.',
    },
  };

  // Find the best match
  let match = null;
  for (const [keyword, config] of Object.entries(suggestions)) {
    if (label.includes(keyword)) {
      match = config;
      break;
    }
  }

  // If no match, suggest a generic text field
  if (!match) {
    match = {
      suggestedType: 'text',
      suggestedPlaceholder: `Enter ${label || 'value'}...`,
      suggestedRequired: false,
      suggestedHelperText: '',
      suggestedNotes: `Text input is suitable for "${label || 'this field'}". Consider upgrading to a more specific type if appropriate.`,
    };
  }

  return JSON.stringify(match);
}

// ---------------------------------------------------------------------------
// Option matching for conversational forms
// ---------------------------------------------------------------------------

function matchOptions(userMessage: string): string {
  // Try to extract available options from the prompt
  const optionsMatch = userMessage.match(/Available options:\s*(\[.*?\])/s);
  if (!optionsMatch) {
    return JSON.stringify({ value: null });
  }

  let options: string[] = [];
  try {
    options = JSON.parse(optionsMatch[1]);
  } catch {
    return JSON.stringify({ value: null });
  }

  // Simple substring matching — find the option that appears in the user message
  const userText = userMessage.split('Available options:')[0].toLowerCase();
  for (const opt of options) {
    if (userText.includes(opt.toLowerCase())) {
      return JSON.stringify({ value: opt });
    }
  }

  // Try partial matching
  for (const opt of options) {
    const optLower = opt.toLowerCase();
    const words = optLower.split(/\s+/);
    if (words.every((w) => userText.includes(w))) {
      return JSON.stringify({ value: opt });
    }
  }

  return JSON.stringify({ value: null });
}

// ---------------------------------------------------------------------------
// Routing rule evaluation
// ---------------------------------------------------------------------------

function evaluateRoutingRule(userMessage: string): string {
  const text = userMessage.toLowerCase();

  // Check for common routing keywords
  const isMatch = (
    text.includes('billing') ||
    text.includes('pricing') ||
    text.includes('refund') ||
    text.includes('payment') ||
    text.includes('invoice') ||
    text.includes('charged')
  ) && (
    text.includes('rule:') || text.includes('mentions billing')
  );

  // Look for keywords in the submission data
  const submissionMatch = text.match(/submission data:\s*([\s\S]+)/);
  const submissionText = submissionMatch ? submissionMatch[1] : '';

  const billingKeywords = ['billing', 'pricing', 'refund', 'payment', 'invoice', 'charged', 'overcharged', 'subscription'];
  const billingMatch = billingKeywords.some((kw) => submissionText.includes(kw));

  if (billingMatch) {
    return JSON.stringify({ matches: true, confidence: 0.9, reason: 'Submission mentions billing-related keywords.' });
  }

  return JSON.stringify({ matches: false, confidence: 0.8, reason: 'No billing-related keywords found in submission.' });
}

// ---------------------------------------------------------------------------
// Translation dictionary
// ---------------------------------------------------------------------------

const TRANSLATIONS: Record<string, Record<string, string>> = {
  es: {
    'Start': 'Comenzar', 'Submit': 'Enviar', 'Name': 'Nombre', 'Email': 'Correo electrónico',
    'Phone Number': 'Número de teléfono', 'Message': 'Mensaje', 'Description': 'Descripción',
    'Full Name': 'Nombre completo', 'Email Address': 'Dirección de correo electrónico',
    'Your name': 'Tu nombre', 'Comments': 'Comentarios', 'Company': 'Empresa',
    'Subject': 'Asunto', 'Priority': 'Prioridad', 'Category': 'Categoría',
    'Date of Birth': 'Fecha de nacimiento', 'Country': 'País', 'Address': 'Dirección',
    'Password': 'Contraseña', 'Website': 'Sitio web', 'Age': 'Edad',
    'Rating': 'Calificación', 'Feedback': 'Comentarios', 'How can we help?': '¿Cómo podemos ayudarte?',
    'Your message': 'Tu mensaje', 'Tell us more...': 'Cuéntanos más...',
    'Enter your full legal name.': 'Ingresa tu nombre legal completo.',
  },
  fr: {
    'Start': 'Commencer', 'Submit': 'Soumettre', 'Name': 'Nom', 'Email': 'E-mail',
    'Phone Number': 'Numéro de téléphone', 'Message': 'Message', 'Description': 'Description',
    'Full Name': 'Nom complet', 'Email Address': 'Adresse e-mail',
    'Your name': 'Votre nom', 'Comments': 'Commentaires', 'Company': 'Entreprise',
    'Subject': 'Sujet', 'Priority': 'Priorité', 'Category': 'Catégorie',
    'Date of Birth': 'Date de naissance', 'Country': 'Pays', 'Address': 'Adresse',
    'Password': 'Mot de passe', 'Website': 'Site web', 'Age': 'Âge',
    'Rating': 'Évaluation', 'Feedback': 'Retour', 'How can we help?': 'Comment pouvons-nous aider ?',
    'Your message': 'Votre message', 'Tell us more...': 'Dites-nous en plus...',
    'Enter your full legal name.': 'Saisissez votre nom légal complet.',
  },
  de: {
    'Start': 'Starten', 'Submit': 'Absenden', 'Name': 'Name', 'Email': 'E-Mail',
    'Phone Number': 'Telefonnummer', 'Message': 'Nachricht', 'Description': 'Beschreibung',
    'Full Name': 'Vollständiger Name', 'Email Address': 'E-Mail-Adresse',
    'Your name': 'Ihr Name', 'Comments': 'Kommentare', 'Company': 'Unternehmen',
    'Subject': 'Betreff', 'Priority': 'Priorität', 'Category': 'Kategorie',
    'Date of Birth': 'Geburtsdatum', 'Country': 'Land', 'Address': 'Adresse',
    'Password': 'Passwort', 'Website': 'Website', 'Age': 'Alter',
    'Rating': 'Bewertung', 'Feedback': 'Feedback', 'How can we help?': 'Wie können wir helfen?',
    'Your message': 'Ihre Nachricht', 'Tell us more...': 'Erzählen Sie uns mehr...',
    'Enter your full legal name.': 'Geben Sie Ihren vollständigen gesetzlichen Namen ein.',
  },
  pt: {
    'Start': 'Iniciar', 'Submit': 'Enviar', 'Name': 'Nome', 'Email': 'E-mail',
    'Phone Number': 'Número de telefone', 'Message': 'Mensagem', 'Description': 'Descrição',
    'Full Name': 'Nome completo', 'Email Address': 'Endereço de e-mail',
    'Your name': 'Seu nome', 'Comments': 'Comentários', 'Company': 'Empresa',
    'Subject': 'Assunto', 'Priority': 'Prioridade', 'Category': 'Categoria',
    'Date of Birth': 'Data de nascimento', 'Country': 'País', 'Address': 'Endereço',
    'Password': 'Senha', 'Website': 'Site', 'Age': 'Idade',
    'Rating': 'Avaliação', 'Feedback': 'Feedback', 'How can we help?': 'Como podemos ajudar?',
    'Your message': 'Sua mensagem', 'Tell us more...': 'Conte-nos mais...',
    'Enter your full legal name.': 'Digite seu nome legal completo.',
  },
  zh: {
    'Start': '开始', 'Submit': '提交', 'Name': '姓名', 'Email': '电子邮件',
    'Phone Number': '电话号码', 'Message': '留言', 'Description': '描述',
    'Full Name': '全名', 'Email Address': '电子邮件地址',
    'Your name': '您的姓名', 'Comments': '评论', 'Company': '公司',
    'Subject': '主题', 'Priority': '优先级', 'Category': '类别',
    'Date of Birth': '出生日期', 'Country': '国家', 'Address': '地址',
    'Password': '密码', 'Website': '网站', 'Age': '年龄',
    'Rating': '评分', 'Feedback': '反馈', 'How can we help?': '我们能帮您什么？',
    'Your message': '您的留言', 'Tell us more...': '告诉我们更多...',
    'Enter your full legal name.': '请输入您的法定全名。',
  },
  ja: {
    'Start': '開始', 'Submit': '送信', 'Name': '名前', 'Email': 'メール',
    'Phone Number': '電話番号', 'Message': 'メッセージ', 'Description': '説明',
    'Full Name': '氏名', 'Email Address': 'メールアドレス',
    'Your name': 'お名前', 'Comments': 'コメント', 'Company': '会社名',
    'Subject': '件名', 'Priority': '優先度', 'Category': 'カテゴリー',
    'Date of Birth': '生年月日', 'Country': '国', 'Address': '住所',
    'Password': 'パスワード', 'Website': 'ウェブサイト', 'Age': '年齢',
    'Rating': '評価', 'Feedback': 'フィードバック', 'How can we help?': 'お手伝いできますか？',
    'Your message': 'メッセージ', 'Tell us more...': '詳しく教えてください...',
    'Enter your full legal name.': '法定氏名を入力してください。',
  },
};

function translateForm(userMessage: string): string {
  // Extract target language
  const langMatch = userMessage.match(/Target language:\s*(\w+)/);
  const langCode = langMatch ? langMatch[1].toLowerCase().split(' ')[0] : 'es';

  // Extract strings array
  const stringsMatch = userMessage.match(/Translatable strings JSON:\s*(\[[\s\S]*?\])/);
  if (!stringsMatch) {
    return JSON.stringify({});
  }

  let strings: string[];
  try {
    strings = JSON.parse(stringsMatch[1]);
  } catch {
    return JSON.stringify({});
  }

  const dict = TRANSLATIONS[langCode] ?? {};
  const translations: Record<string, string> = {};

  for (const s of strings) {
    // Check dictionary
    if (dict[s]) {
      translations[s] = dict[s];
    }
    // Check case-insensitive
    else {
      const found = Object.entries(dict).find(([k]) => k.toLowerCase() === s.toLowerCase());
      if (found) {
        translations[s] = found[1];
      } else {
        // Leave untranslated (better to show original than garbage)
        translations[s] = s;
      }
    }
  }

  return JSON.stringify(translations);
}

// ---------------------------------------------------------------------------
// Drop-off analysis
// ---------------------------------------------------------------------------

function analyzeDropOff(userMessage: string): string {
  // Extract field stats from the user message
  const statsMatch = userMessage.match(/Field stats JSON:\s*(\[[\s\S]*?\])/);
  if (!statsMatch) {
    return '[]';
  }

  let fields: any[];
  try {
    fields = JSON.parse(statsMatch[1]);
  } catch {
    return '[]';
  }

  const suggestions: any[] = [];
  for (const field of fields) {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let severity = 'low';

    if (field.dropOffRate > 0.4) {
      issues.push(`${Math.round(field.dropOffRate * 100)}% of users abandoned this field.`);
      recommendations.push('Consider making this field optional or splitting it into smaller parts.');
      severity = 'high';
    } else if (field.dropOffRate > 0.2) {
      issues.push(`${Math.round(field.dropOffRate * 100)}% drop-off rate.`);
      recommendations.push('Review the field label and placeholder for clarity.');
      severity = 'medium';
    }

    if (field.avgTimeOnFieldMs > 30000) {
      issues.push(`Users spend ${Math.round(field.avgTimeOnFieldMs / 1000)}s on this field — above average.`);
      recommendations.push('Consider simplifying the input or providing a default value.');
      severity = severity === 'low' ? 'medium' : severity;
    }

    if (field.avgValueLength > 100 && field.type === 'text') {
      issues.push(`Average input length is ${field.avgValueLength} characters.`);
      recommendations.push('Switch to a textarea field type for better UX with long text.');
    }

    if (field.focusCount > 0 && field.blurCount === 0) {
      issues.push('Users focus but never leave this field — possible UX dead-end.');
      recommendations.push('Check if the field has a visible "next" or "submit" button nearby.');
      severity = 'high';
    }

    if (issues.length > 0) {
      suggestions.push({
        fieldId: field.fieldId,
        label: field.label,
        issue: issues.join(' '),
        recommendation: recommendations.join(' '),
        severity,
      });
    }
  }

  return JSON.stringify(suggestions);
}

// ---------------------------------------------------------------------------
// PDF Analyst notes
// ---------------------------------------------------------------------------

function generateAnalystNotes(userMessage: string): string {
  // Extract submission data
  const dataMatch = userMessage.match(/Submission data:\s*([\s\S]+)/);
  if (!dataMatch) {
    return 'A submission was received and processed. No anomalies detected.';
  }

  let fields: any[];
  try {
    fields = JSON.parse(dataMatch[1]);
  } catch {
    return 'A submission was received and processed. No anomalies detected.';
  }

  const parts: string[] = [];
  const filledFields = fields.filter((f: any) => f.value !== null && f.value !== undefined && f.value !== '');
  const emptyFields = fields.filter((f: any) => f.value === null || f.value === undefined || f.value === '');

  parts.push(`This submission contains ${filledFields.length} of ${fields.length} fields.`);

  if (emptyFields.length > 0) {
    parts.push(`Missing data: ${emptyFields.map((f: any) => f.label).join(', ')}.`);
  }

  // Check for anomalies
  for (const field of fields) {
    if (field.value && typeof field.value === 'string') {
      const v = field.value.toLowerCase();
      if (NEGATIVE_WORDS.has(v) || v.includes('urgent') || v.includes('asap')) {
        parts.push(`Priority flagged: "${field.label}" contains urgent language.`);
        break;
      }
    }
  }

  if (filledFields.length === fields.length) {
    parts.push('All required fields completed — submission is ready for processing.');
  } else {
    parts.push('Some fields are incomplete — follow-up may be needed.');
  }

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Date normalisation
// ---------------------------------------------------------------------------

function normalizeDate(userMessage: string): string {
  // Try common formats
  const isoMatch = userMessage.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];

  // Try "January 15, 2024" format
  const longMatch = userMessage.match(/(\w+)\s+(\d{1,2}),?\s*(\d{4})/);
  if (longMatch) {
    const months: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
      july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
      jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07', aug: '08',
      sep: '09', sept: '09', oct: '10', nov: '11', dec: '12',
    };
    const month = months[longMatch[1].toLowerCase()];
    const day = longMatch[2].padStart(2, '0');
    const year = longMatch[3];
    if (month) return `${year}-${month}-${day}`;
  }

  // Try MM/DD/YYYY
  const usMatch = userMessage.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (usMatch) {
    const month = usMatch[1].padStart(2, '0');
    const day = usMatch[2].padStart(2, '0');
    const year = usMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Fallback: today's date
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Call the AI with automatic fallback.
 *
 * Tries the real z-ai-web-dev-sdk first. If it fails (network error,
 * DNS failure, empty response), falls back to the rule-based engine.
 *
 * Returns a normalised result with metadata about which engine was used.
 */
export async function aiChat(
  systemPrompt: string,
  userMessage: string,
  options: AIChatOptions = {}
): Promise<AIChatResult> {
  const startTime = Date.now();

  // Try the real LLM first
  try {
    const content = await callRealLLM(systemPrompt, userMessage, options);
    const elapsedMs = Date.now() - startTime;
    return {
      content,
      model: 'glm-4.5',
      latency_ms: elapsedMs,
      input_tokens: Math.ceil((systemPrompt.length + userMessage.length) / 4),
      output_tokens: Math.ceil(content.length / 4),
      fallback: false,
    };
  } catch (error) {
    // Fall back to rule-based engine
    const content = callFallbackLLM(systemPrompt, userMessage);
    const elapsedMs = Date.now() - startTime;
    return {
      content,
      model: 'rule-based-fallback',
      latency_ms: elapsedMs,
      input_tokens: Math.ceil((systemPrompt.length + userMessage.length) / 4),
      output_tokens: Math.ceil(content.length / 4),
      fallback: true,
    };
  }
}
