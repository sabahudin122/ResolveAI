import type {
  AiProvider,
  TicketAiInput,
  TicketAiResult,
  TicketDraftInput,
  TicketDraftResult,
} from './ai-provider.js';

function includesAny(text: string, terms: string[]): boolean {
  const normalized = text.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function cleanSentence(text: string): string {
  const corrections: Array<[RegExp, string]> = [
    [/\bu\b/gi, 'I'],
    [/\bur\b/gi, 'your'],
    [/\bcant\b/gi, 'cannot'],
    [/\bdont\b/gi, 'do not'],
    [/\bwont\b/gi, 'will not'],
    [/\bplz\b/gi, 'please'],
    [/\bpls\b/gi, 'please'],
    [/\bsistem\b/gi, 'system'],
    [/\bsystm\b/gi, 'system'],
    [/\bbreeched\b/gi, 'breached'],
    [/\bbreched\b/gi, 'breached'],
    [/\bhackd\b/gi, 'hacked'],
    [/\bpasword\b/gi, 'password'],
    [/\bpasswrod\b/gi, 'password'],
    [/\bauthnticator\b/gi, 'authenticator'],
    [/\bpayrol\b/gi, 'payroll'],
    [/\binvoce\b/gi, 'invoice'],
    [/\bapi\b/gi, 'API'],
    [/\bconect\b/gi, 'connect'],
    [/\bconection\b/gi, 'connection'],
    [/\brecieve\b/gi, 'receive'],
    [/\badress\b/gi, 'address'],
    [/\bpriter\b/gi, 'printer'],
    [/\bteh\b/gi, 'the'],
    [/\bthier\b/gi, 'their'],
  ];

  let cleaned = text.trim().replace(/\s+/g, ' ');
  for (const [pattern, replacement] of corrections) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  cleaned = cleaned.replace(/\bi am\b/gi, 'I am');
  cleaned = cleaned.replace(/\bi\b/g, 'I');

  if (!cleaned.endsWith('.') && !cleaned.endsWith('?') && !cleaned.endsWith('!')) {
    cleaned = `${cleaned}.`;
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function classifyDraft(text: string) {
  const isSecurity = includesAny(text, ['breach', 'breached', 'hacked', 'phishing', 'malware', 'suspicious', 'unknown login']);
  const isVpn = includesAny(text, ['vpn', 'network', 'connect', 'connection', 'wifi']);
  const isPayroll = includesAny(text, ['payroll', 'salary', 'payslip', 'invoice', 'reimbursement', 'expense']);
  const isFacilities = includesAny(text, ['desk', 'chair', 'badge', 'door', 'printer', 'room', 'display']);
  const isHr = includesAny(text, ['benefits', 'policy', 'vacation', 'onboarding', 'leave']);
  const isHardware = includesAny(text, ['laptop', 'monitor', 'keyboard', 'dock', 'battery', 'headset']);
  const isAccess = includesAny(text, ['access', 'locked', 'password', 'account', 'folder', 'mailbox', 'license']);
  const isSystemOutage = includesAny(text, [
    'api',
    'endpoint',
    'server',
    'service',
    'application',
    'app',
    'portal',
    'system',
    'dashboard',
    'website',
    'site',
    'database',
    'timeout',
    '500',
    'down',
    'outage',
    'not working',
    'broken',
    'unavailable',
    'automation',
    'integration',
  ]);

  if (isSecurity) {
    return {
      title: 'Possible security breach reported',
      category: 'Security incident',
      priority: 'CRITICAL' as const,
      guidance: 'Include affected systems, suspicious accounts, timestamps, and whether data may have been accessed.',
    };
  }
  if (isHardware) {
    return {
      title: 'Hardware support request',
      category: 'Hardware request',
      priority: 'MEDIUM' as const,
      guidance: 'Include the device type, urgency, location, and whether the employee can keep working.',
    };
  }
  if (isVpn) {
    return {
      title: 'VPN or network access issue',
      category: 'Network access',
      priority: 'HIGH' as const,
      guidance: 'Include the error message, device type, location, and whether other internal tools are affected.',
    };
  }
  if (isPayroll) {
    return {
      title: 'Payroll or finance question',
      category: 'Payroll question',
      priority: 'MEDIUM' as const,
      guidance: 'Include payroll period, affected amount or document, and any approval reference.',
    };
  }
  if (isFacilities) {
    return {
      title: 'Facilities support request',
      category: 'Facilities issue',
      priority: 'LOW' as const,
      guidance: 'Include office location, room or door number, and urgency.',
    };
  }
  if (isHr) {
    return {
      title: 'HR policy or onboarding question',
      category: 'HR policy',
      priority: 'LOW' as const,
      guidance: 'Include relevant dates, policy area, and whether manager approval is available.',
    };
  }
  if (isAccess) {
    return {
      title: 'Account or application access request',
      category: 'Account access',
      priority: 'MEDIUM' as const,
      guidance: 'Include application name, approval status, access duration, and business reason.',
    };
  }
  if (isSystemOutage) {
    return {
      title: 'Internal API or application outage',
      category: 'Operational request',
      priority: 'HIGH' as const,
      guidance:
        'Include the affected API or application, endpoint, error message or status code, when it started, scope, and business impact.',
    };
  }
  return {
    title: 'Internal operations support request',
    category: 'Operational request',
    priority: 'MEDIUM' as const,
    guidance: 'Include the affected workflow, urgency, owner team, and desired outcome.',
  };
}

function findCategoryId(input: TicketDraftInput, categoryName: string): string | undefined {
  const category = input.categories.find((item) => item.name.toLowerCase() === categoryName.toLowerCase());
  return category?.id;
}

export class MockAiProvider implements AiProvider {
  async analyzeTicket(input: TicketAiInput): Promise<TicketAiResult> {
    const text = `${input.title} ${input.description}`.toLowerCase();
    const classification = classifyDraft(text);
    const departmentByCategory: Record<string, string> = {
      'Security incident': 'Information Security',
      'Payroll question': 'Finance',
      'Facilities issue': 'Facilities',
      'Network access': 'IT Support',
      'Hardware request': 'IT Support',
      'Account access': 'IT Support',
      'HR policy': 'Human Resources',
      'Operational request': 'Operations',
    };
    const suggestedResponseByCategory: Record<string, string> = {
      'Security incident':
        'Treat this as urgent. Preserve evidence, include affected systems, suspicious account names, timestamps, and any visible alerts before Security reviews it.',
      'Payroll question':
        'Finance should review the payroll period, deduction or reimbursement details, and keep sensitive payroll information in private notes.',
      'Facilities issue':
        'Facilities should confirm the location, room or door identifier, time observed, and whether the issue blocks workplace access.',
      'Network access':
        'Support should confirm the network or VPN error, device type, location, and whether other internal tools are affected.',
      'Hardware request':
        'Support should confirm device type, urgency, manager approval, and whether the employee has a working backup.',
      'Account access':
        'Support should confirm the application, approval status, access duration, and business reason before changing permissions.',
      'HR policy':
        'HR should confirm the policy area, relevant dates, and whether manager approval or employee documentation is required.',
      'Operational request':
        'Operations should confirm the affected API or application, endpoint, error code, start time, scope, and business impact.',
    };
    const knowledge = input.knowledgeMatches[0];
    const suggestedResponse = knowledge
      ? `I found a likely fix in "${knowledge.title}". Please try the documented steps first. If the issue continues, reply with the exact error message and the device/network you are using.`
      : suggestedResponseByCategory[classification.category] ??
        'Thanks for reporting this. A support agent should verify the details, confirm the affected system, and provide the next steps before sending a final response.';

    return {
      summary: `${input.title.trim()} - ${input.description.trim().slice(0, 140)}`,
      category: classification.category,
      priority: classification.priority,
      department: departmentByCategory[classification.category] ?? 'Operations',
      suggestedResponse,
      confidence: 0.88,
      reasoning: `Mock AI detected ${classification.category.toLowerCase()} language using deterministic keyword matching.`,
      sourceReferences: input.knowledgeMatches.map((match) => ({
        title: match.title,
        locator: `knowledge:${match.id}`,
        excerpt: match.excerpt,
      })),
      mock: true,
      model: 'mock-deterministic-v1',
    };
  }

  async improveTicketDraft(input: TicketDraftInput): Promise<TicketDraftResult> {
    const originalText = `${input.title} ${input.description}`;
    const classification = classifyDraft(originalText);
    const cleanedTitle = cleanSentence(input.title).replace(/\.$/, '');
    const cleanedDescription = cleanSentence(input.description);
    const title =
      cleanedTitle.length < 12 || cleanedTitle.toLowerCase().includes('help')
        ? classification.title
        : cleanedTitle;
    const improvedDescription = [
      cleanedDescription,
      `Impact: Please review this request because it may affect business work or employee access.`,
      `Helpful details to confirm: ${classification.guidance}`,
    ].join('\n\n');

    return {
      improvedTitle: title,
      improvedDescription,
      suggestedCategory: classification.category,
      suggestedCategoryId: findCategoryId(input, classification.category),
      suggestedPriority: classification.priority,
      confidence: 0.86,
      changes: [
        'Corrected common spelling and grammar issues.',
        'Made the title more specific.',
        'Structured the description with impact and missing details.',
        'Suggested a category and priority for support review.',
      ],
      reasoning: 'Mock AI used deterministic text cleanup and keyword classification so drafting works without an API key.',
      mock: true,
      model: 'mock-deterministic-v1',
    };
  }
}
