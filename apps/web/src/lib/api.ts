import type {
  Category,
  DashboardAnalytics,
  Ticket,
  TicketDraftSuggestion,
  UserSession,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';
const DEMO_TOKEN_PREFIX = 'demo-access-token:';

type ApiEnvelope<T> =
  { ok: true; data: T } | { ok: false; error: { message: string; code: string } };

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
  const envelope = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !envelope.ok) {
    throw new Error(envelope.ok ? 'Request failed' : envelope.error.message);
  }

  return envelope.data;
}

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const categories: Category[] = [
  {
    id: 'cat-network',
    name: 'Network access',
    slug: 'network-access',
    department: { id: 'dept-it', name: 'IT Support' },
  },
  {
    id: 'cat-security',
    name: 'Security incident',
    slug: 'security-incident',
    department: { id: 'dept-sec', name: 'Information Security' },
  },
  {
    id: 'cat-hr',
    name: 'HR policy',
    slug: 'hr-policy',
    department: { id: 'dept-hr', name: 'Human Resources' },
  },
  {
    id: 'cat-finance',
    name: 'Payroll question',
    slug: 'payroll-question',
    department: { id: 'dept-fin', name: 'Finance' },
  },
  {
    id: 'cat-facilities',
    name: 'Facilities issue',
    slug: 'facilities-issue',
    department: { id: 'dept-fac', name: 'Facilities' },
  },
  {
    id: 'cat-account',
    name: 'Account access',
    slug: 'account-access',
    department: { id: 'dept-it', name: 'IT Support' },
  },
  {
    id: 'cat-hardware',
    name: 'Hardware request',
    slug: 'hardware-request',
    department: { id: 'dept-it', name: 'IT Support' },
  },
  {
    id: 'cat-operations',
    name: 'Operational request',
    slug: 'operational-request',
    department: { id: 'dept-ops', name: 'Operations' },
  },
];

const demoUsers = [
  {
    email: 'employee1@acme.test',
    password: 'EmployeePass123!',
    user: {
      id: 'user-employee-1',
      organizationId: 'org-acme',
      organizationName: 'Acme Operations',
      fullName: 'Eli Stone',
      email: 'employee1@acme.test',
      role: 'employee' as const,
      title: 'Operations Specialist',
      departmentId: 'dept-ops',
    },
  },
  {
    email: 'employee2@acme.test',
    password: 'EmployeePass123!',
    user: {
      id: 'user-employee-2',
      organizationId: 'org-acme',
      organizationName: 'Acme Operations',
      fullName: 'Lejla Basic',
      email: 'employee2@acme.test',
      role: 'employee' as const,
      title: 'Finance Analyst',
      departmentId: 'dept-fin',
    },
  },
  {
    email: 'employee3@acme.test',
    password: 'EmployeePass123!',
    user: {
      id: 'user-employee-3',
      organizationId: 'org-acme',
      organizationName: 'Acme Operations',
      fullName: 'Omar Hayes',
      email: 'employee3@acme.test',
      role: 'employee' as const,
      title: 'People Operations Coordinator',
      departmentId: 'dept-hr',
    },
  },
  {
    email: 'employee4@acme.test',
    password: 'EmployeePass123!',
    user: {
      id: 'user-employee-4',
      organizationId: 'org-acme',
      organizationName: 'Acme Operations',
      fullName: 'Mia Chen',
      email: 'employee4@acme.test',
      role: 'employee' as const,
      title: 'Facilities Coordinator',
      departmentId: 'dept-fac',
    },
  },
  {
    email: 'employee5@acme.test',
    password: 'EmployeePass123!',
    user: {
      id: 'user-employee-5',
      organizationId: 'org-acme',
      organizationName: 'Acme Operations',
      fullName: 'Ivan Petrov',
      email: 'employee5@acme.test',
      role: 'employee' as const,
      title: 'Operations Coordinator',
      departmentId: 'dept-ops',
    },
  },
  {
    email: 'employee6@acme.test',
    password: 'EmployeePass123!',
    user: {
      id: 'user-employee-6',
      organizationId: 'org-acme',
      organizationName: 'Acme Operations',
      fullName: 'Nadia Brooks',
      email: 'employee6@acme.test',
      role: 'employee' as const,
      title: 'Security Compliance Analyst',
      departmentId: 'dept-sec',
    },
  },
  {
    email: 'agent1@acme.test',
    password: 'AgentPass123!',
    user: {
      id: 'user-agent-1',
      organizationId: 'org-acme',
      organizationName: 'Acme Operations',
      fullName: 'Ava Novak',
      email: 'agent1@acme.test',
      role: 'support_agent' as const,
      title: 'Support Agent',
      departmentId: 'dept-it',
    },
  },
  {
    email: 'agent2@acme.test',
    password: 'AgentPass123!',
    user: {
      id: 'user-agent-2',
      organizationId: 'org-acme',
      organizationName: 'Acme Operations',
      fullName: 'Noah Reed',
      email: 'agent2@acme.test',
      role: 'support_agent' as const,
      title: 'Endpoint Support Agent',
      departmentId: 'dept-it',
    },
  },
  {
    email: 'agent3@acme.test',
    password: 'AgentPass123!',
    user: {
      id: 'user-agent-3',
      organizationId: 'org-acme',
      organizationName: 'Acme Operations',
      fullName: 'Sara Music',
      email: 'agent3@acme.test',
      role: 'support_agent' as const,
      title: 'Security Support Agent',
      departmentId: 'dept-sec',
    },
  },
  {
    email: 'manager@acme.test',
    password: 'ManagerPass123!',
    user: {
      id: 'user-manager-1',
      organizationId: 'org-acme',
      organizationName: 'Acme Operations',
      fullName: 'Mirza Delic',
      email: 'manager@acme.test',
      role: 'manager' as const,
      title: 'IT Support Manager',
      departmentId: 'dept-it',
    },
  },
  {
    email: 'admin@acme.test',
    password: 'AdminPass123!',
    user: {
      id: 'user-admin-1',
      organizationId: 'org-acme',
      organizationName: 'Acme Operations',
      fullName: 'Amina Kovac',
      email: 'admin@acme.test',
      role: 'administrator' as const,
      title: 'Operations Administrator',
      departmentId: 'dept-ops',
    },
  },
];

let currentDemoUser = demoUsers[0]!.user;

const departmentNames: Record<string, string> = {
  'dept-it': 'IT Support',
  'dept-sec': 'Information Security',
  'dept-hr': 'Human Resources',
  'dept-fin': 'Finance',
  'dept-fac': 'Facilities',
  'dept-ops': 'Operations',
};

const createdAt = new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString();

const demoTickets: Ticket[] = [
  {
    id: 'ticket-vpn-current',
    number: 'ACME-2026-00031',
    title: 'Cannot connect to VPN after password change',
    description:
      'I changed my password this morning. Email works, but the company VPN keeps saying authentication failed and I cannot access internal applications.',
    status: 'NEW',
    priority: 'MEDIUM',
    aiSummary:
      'Employee cannot connect to VPN after a password reset. The issue is likely stale VPN credentials or MFA verification.',
    aiConfidence: 0.88,
    slaDeadlineAt: new Date(Date.now() + 1000 * 60 * 90).toISOString(),
    createdAt,
    reporter: { id: 'user-employee-1', fullName: 'Eli Stone', email: 'employee1@acme.test' },
    assignedAgent: null,
    category: categories[0]!,
    department: { id: 'dept-it', name: 'IT Support' },
    comments: [
      {
        id: 'comment-vpn-1',
        body: 'I need this fixed before my afternoon support handoff.',
        visibility: 'PUBLIC',
        createdAt,
        author: { id: 'user-employee-1', fullName: 'Eli Stone', role: { slug: 'employee' } },
      },
    ],
    aiSuggestions: [
      {
        id: 'ai-vpn-1',
        status: 'PENDING_REVIEW',
        mock: true,
        recommendation:
          'Ask the employee to sign out of the VPN client, remove saved credentials, restart the device, then reconnect with the new password. If MFA fails, verify the authenticator prompt and confirm the account is not locked.',
        confidence: 0.88,
        reasoning:
          'Mock AI matched VPN, password change, authentication failure, and internal tool access keywords.',
        payload: {
          category: 'Network access',
          priority: 'HIGH',
          department: 'IT Support',
          suggestedResponse:
            'Please sign out of the VPN client, remove saved VPN credentials, restart your device, and reconnect with your new password. If the MFA prompt does not arrive, reply with the exact error message and your device type.',
        },
        references: [
          {
            knowledgeDocument: {
              id: 'kb-vpn-reset',
              title: 'Reset company VPN after password change',
            },
            excerpt:
              'When a user changes their password, the VPN client may keep an old credential cache. Remove saved credentials and reconnect.',
            relevanceScore: 0.92,
          },
        ],
      },
    ],
    relatedFrom: [
      {
        id: 'related-vpn-1',
        similarity: 0.81,
        targetTicket: {
          id: 'ticket-vpn-old',
          number: 'ACME-2026-00018',
          title: 'VPN authentication failed after password reset',
          status: 'RESOLVED',
          priority: 'HIGH',
        },
      },
    ],
    statusHistory: [
      {
        id: 'history-vpn-1',
        previousStatus: null,
        newStatus: 'NEW',
        reason: 'Ticket created',
        changedAt: createdAt,
        changedBy: { id: 'user-employee-1', fullName: 'Eli Stone' },
      },
    ],
  },
  {
    id: 'ticket-security-1',
    number: 'ACME-2026-00029',
    title: 'Suspicious invoice email',
    description:
      'A vendor email included an unexpected invoice attachment from a misspelled domain.',
    status: 'IN_PROGRESS',
    priority: 'CRITICAL',
    aiSummary: 'Possible phishing email with suspicious attachment and vendor impersonation.',
    aiConfidence: 0.9,
    slaDeadlineAt: new Date(Date.now() + 1000 * 60 * 20).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
    reporter: { id: 'user-employee-2', fullName: 'Lejla Basic', email: 'employee2@acme.test' },
    assignedAgent: { id: 'user-agent-1', fullName: 'Ava Novak', email: 'agent1@acme.test' },
    category: categories[1]!,
    department: { id: 'dept-sec', name: 'Information Security' },
    comments: [],
    aiSuggestions: [],
    relatedFrom: [],
    statusHistory: [],
  },
  {
    id: 'ticket-facilities-1',
    number: 'ACME-2026-00027',
    title: 'Conference room display is offline',
    description: 'The display in room 4B shows no signal even after restarting the adapter.',
    status: 'ASSIGNED',
    priority: 'LOW',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 15).toISOString(),
    reporter: { id: 'user-employee-3', fullName: 'Omar Hayes', email: 'employee3@acme.test' },
    assignedAgent: { id: 'user-agent-1', fullName: 'Ava Novak', email: 'agent1@acme.test' },
    category: categories[4]!,
    department: { id: 'dept-fac', name: 'Facilities' },
    comments: [],
    aiSuggestions: [],
    relatedFrom: [],
    statusHistory: [],
  },
  {
    id: 'ticket-account-1',
    number: 'ACME-2026-00026',
    title: 'Need access to finance reporting folder',
    description:
      'My manager asked me to review quarter-end reporting, but the finance folder says access denied.',
    status: 'WAITING_FOR_EMPLOYEE',
    priority: 'MEDIUM',
    aiSummary: 'Finance folder access request pending approval and duration confirmation.',
    aiConfidence: 0.84,
    slaDeadlineAt: new Date(Date.now() + 1000 * 60 * 55).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    reporter: { id: 'user-employee-2', fullName: 'Lejla Basic', email: 'employee2@acme.test' },
    assignedAgent: { id: 'user-agent-2', fullName: 'Noah Reed', email: 'agent2@acme.test' },
    category: categories[5]!,
    department: { id: 'dept-it', name: 'IT Support' },
    comments: [],
    aiSuggestions: [],
    relatedFrom: [],
    statusHistory: [],
  },
  {
    id: 'ticket-hardware-1',
    number: 'ACME-2026-00025',
    title: 'New hire laptop request for onboarding',
    description:
      'A new employee starts Monday and needs a laptop, dock, headset, and standard productivity access.',
    status: 'TRIAGED',
    priority: 'HIGH',
    aiSummary: 'New hire hardware request with onboarding deadline.',
    aiConfidence: 0.82,
    slaDeadlineAt: new Date(Date.now() + 1000 * 60 * 180).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    reporter: { id: 'user-employee-3', fullName: 'Omar Hayes', email: 'employee3@acme.test' },
    assignedAgent: { id: 'user-agent-2', fullName: 'Noah Reed', email: 'agent2@acme.test' },
    category: categories[6]!,
    department: { id: 'dept-it', name: 'IT Support' },
    comments: [],
    aiSuggestions: [],
    relatedFrom: [],
    statusHistory: [],
  },
  {
    id: 'ticket-hr-1',
    number: 'ACME-2026-00024',
    title: 'Benefits enrollment date question',
    description:
      'I missed the benefits enrollment reminder and need to know whether I can still update my coverage.',
    status: 'RESOLVED',
    priority: 'LOW',
    aiSummary: 'Benefits enrollment eligibility and policy question.',
    aiConfidence: 0.8,
    slaDeadlineAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 44).toISOString(),
    reporter: { id: 'user-employee-3', fullName: 'Omar Hayes', email: 'employee3@acme.test' },
    assignedAgent: { id: 'user-agent-1', fullName: 'Ava Novak', email: 'agent1@acme.test' },
    category: categories[2]!,
    department: { id: 'dept-hr', name: 'Human Resources' },
    comments: [],
    aiSuggestions: [],
    relatedFrom: [],
    statusHistory: [],
  },
  {
    id: 'ticket-payroll-1',
    number: 'ACME-2026-00023',
    title: 'Payroll deduction looks incorrect',
    description:
      'My latest payslip includes a deduction I do not recognize, and I need Finance to review it.',
    status: 'ASSIGNED',
    priority: 'MEDIUM',
    aiSummary: 'Unrecognized payroll deduction requires Finance review.',
    aiConfidence: 0.86,
    slaDeadlineAt: new Date(Date.now() + 1000 * 60 * 75).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    reporter: { id: 'user-employee-5', fullName: 'Ivan Petrov', email: 'employee5@acme.test' },
    assignedAgent: { id: 'user-agent-1', fullName: 'Ava Novak', email: 'agent1@acme.test' },
    category: categories[3]!,
    department: { id: 'dept-fin', name: 'Finance' },
    comments: [],
    aiSuggestions: [],
    relatedFrom: [],
    statusHistory: [],
  },
  {
    id: 'ticket-ops-1',
    number: 'ACME-2026-00022',
    title: 'Workflow automation failed overnight',
    description:
      'The overnight operations workflow failed and several internal reports did not refresh this morning.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    aiSummary: 'Operations workflow failure affecting morning reporting.',
    aiConfidence: 0.87,
    slaDeadlineAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 11).toISOString(),
    reporter: { id: 'user-employee-5', fullName: 'Ivan Petrov', email: 'employee5@acme.test' },
    assignedAgent: { id: 'user-agent-1', fullName: 'Ava Novak', email: 'agent1@acme.test' },
    category: categories[7]!,
    department: { id: 'dept-ops', name: 'Operations' },
    comments: [],
    aiSuggestions: [],
    relatedFrom: [],
    statusHistory: [],
  },
  {
    id: 'ticket-security-2',
    number: 'ACME-2026-00021',
    title: 'Security training completion not recorded',
    description:
      'I completed security training yesterday, but the compliance dashboard still says it is overdue.',
    status: 'CLOSED',
    priority: 'MEDIUM',
    aiSummary: 'Security compliance training sync mismatch.',
    aiConfidence: 0.81,
    slaDeadlineAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 58).toISOString(),
    reporter: { id: 'user-employee-6', fullName: 'Nadia Brooks', email: 'employee6@acme.test' },
    assignedAgent: { id: 'user-agent-3', fullName: 'Sara Music', email: 'agent3@acme.test' },
    category: categories[1]!,
    department: { id: 'dept-sec', name: 'Information Security' },
    comments: [],
    aiSuggestions: [],
    relatedFrom: [],
    statusHistory: [],
  },
  {
    id: 'ticket-employee-current-2',
    number: 'ACME-2026-00020',
    title: 'Video meeting license not available',
    description:
      'I need to host a client call this afternoon but my video meeting account is still on the basic license.',
    status: 'ASSIGNED',
    priority: 'MEDIUM',
    aiSummary: 'Video meeting license upgrade needed before a client call.',
    aiConfidence: 0.83,
    slaDeadlineAt: new Date(Date.now() + 1000 * 60 * 45).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    reporter: { id: 'user-employee-1', fullName: 'Eli Stone', email: 'employee1@acme.test' },
    assignedAgent: { id: 'user-agent-2', fullName: 'Noah Reed', email: 'agent2@acme.test' },
    category: categories[5]!,
    department: { id: 'dept-it', name: 'IT Support' },
    comments: [],
    aiSuggestions: [],
    relatedFrom: [],
    statusHistory: [],
  },
];

const knowledge = [
  {
    id: 'kb-vpn-reset',
    title: 'Reset company VPN after password change',
    excerpt:
      'Sign out of the VPN client, remove saved credentials, restart the device, and reconnect with the new password.',
    score: 0.92,
  },
  {
    id: 'kb-mfa',
    title: 'Troubleshooting MFA push failures',
    excerpt:
      'Verify mobile connectivity, authenticator registration, retry limits, and account lock status before escalation.',
    score: 0.74,
  },
  {
    id: 'kb-phishing',
    title: 'Suspicious email reporting',
    excerpt:
      'Use the phishing report flow and avoid opening attachments until Information Security reviews the message.',
    score: 0.68,
  },
  {
    id: 'kb-api-outage',
    title: 'Internal API outage triage',
    excerpt:
      'Capture the affected API or application, endpoint, error code, start time, scope, recent changes, and business impact before escalation.',
    score: 0.86,
  },
];

function isDemoToken(token?: string) {
  return Boolean(token?.startsWith(DEMO_TOKEN_PREFIX));
}

function createDemoSession(email: string, password: string): UserSession | null {
  const account = demoUsers.find(
    (demoUser) =>
      demoUser.email.toLowerCase() === email.toLowerCase() && demoUser.password === password,
  );

  if (!account) {
    return null;
  }

  currentDemoUser = account.user;

  return {
    accessToken: `${DEMO_TOKEN_PREFIX}${account.user.role}`,
    refreshToken: `demo-refresh-token:${account.user.role}`,
    user: account.user,
  };
}

function countBy(items: string[]): Array<{ name: string; value: number }> {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, value]) => ({ name, value }));
}

function includesAny(text: string, terms: string[]) {
  const normalized = text.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function cleanDraftText(text: string) {
  const corrections: Array<[RegExp, string]> = [
    [/\bu\b/gi, 'I'],
    [/\bcant\b/gi, 'cannot'],
    [/\bdont\b/gi, 'do not'],
    [/\bplz\b/gi, 'please'],
    [/\bpls\b/gi, 'please'],
    [/\bsistem\b/gi, 'system'],
    [/\bsystm\b/gi, 'system'],
    [/\bbreeched\b/gi, 'breached'],
    [/\bbreched\b/gi, 'breached'],
    [/\bhackd\b/gi, 'hacked'],
    [/\bpasword\b/gi, 'password'],
    [/\bpasswrod\b/gi, 'password'],
    [/\bpayrol\b/gi, 'payroll'],
    [/\binvoce\b/gi, 'invoice'],
    [/\bapi\b/gi, 'API'],
    [/\bconect\b/gi, 'connect'],
    [/\bconection\b/gi, 'connection'],
    [/\brecieve\b/gi, 'receive'],
    [/\badress\b/gi, 'address'],
  ];
  let cleaned = text.trim().replace(/\s+/g, ' ');
  for (const [pattern, replacement] of corrections) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  if (!cleaned.endsWith('.') && !cleaned.endsWith('?') && !cleaned.endsWith('!')) {
    cleaned = `${cleaned}.`;
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function classifyDemoTicketText(text: string) {
  const isSecurity = includesAny(text, [
    'breach',
    'breached',
    'hacked',
    'phishing',
    'malware',
    'suspicious',
  ]);
  const isPayroll = includesAny(text, [
    'payroll',
    'salary',
    'payslip',
    'invoice',
    'reimbursement',
    'expense',
  ]);
  const isFacilities = includesAny(text, [
    'desk',
    'chair',
    'badge',
    'door',
    'printer',
    'room',
    'display',
  ]);
  const isHr = includesAny(text, ['benefits', 'policy', 'vacation', 'onboarding', 'leave']);
  const isHardware = includesAny(text, [
    'laptop',
    'monitor',
    'keyboard',
    'dock',
    'battery',
    'headset',
  ]);
  const isAccess = includesAny(text, [
    'access',
    'locked',
    'password',
    'account',
    'folder',
    'mailbox',
    'license',
  ]);
  const isNetwork = includesAny(text, ['vpn', 'network', 'wifi', 'internet']);
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
      category: categories[1]!,
      priority: 'CRITICAL' as const,
      title: 'Possible security breach reported',
      guidance:
        'affected systems, suspicious account names, timestamps, visible alerts, and whether data may have been accessed',
      suggestedResponse:
        'Treat this as urgent. Preserve evidence, avoid changing affected accounts until reviewed, and include systems, timestamps, account names, and visible alerts for Security.',
      reasoning:
        'Mock AI detected security incident language such as breach, suspicious activity, phishing, or malware.',
      referenceId: 'kb-phishing',
    };
  }
  if (isPayroll) {
    return {
      category: categories[3]!,
      priority: 'MEDIUM' as const,
      title: 'Payroll or finance question',
      guidance:
        'payroll period, affected amount or document, approval reference, and whether sensitive details should stay private',
      suggestedResponse:
        'Finance should review the payroll period, deduction or reimbursement details, and keep sensitive payroll information in private notes.',
      reasoning: 'Mock AI detected payroll, invoice, expense, or reimbursement language.',
      referenceId: null,
    };
  }
  if (isFacilities) {
    return {
      category: categories[4]!,
      priority: 'LOW' as const,
      title: 'Facilities support request',
      guidance:
        'office location, room or door number, time observed, and whether workplace access is blocked',
      suggestedResponse:
        'Facilities should confirm the location, room or door identifier, time observed, and whether the issue blocks workplace access.',
      reasoning:
        'Mock AI detected facilities language such as badge, room, door, printer, desk, or display.',
      referenceId: null,
    };
  }
  if (isHr) {
    return {
      category: categories[2]!,
      priority: 'LOW' as const,
      title: 'HR policy or onboarding question',
      guidance:
        'policy area, relevant dates, manager approval, and any required employee documentation',
      suggestedResponse:
        'HR should confirm the policy area, relevant dates, and whether manager approval or employee documentation is required.',
      reasoning: 'Mock AI detected HR policy, benefits, leave, or onboarding language.',
      referenceId: null,
    };
  }
  if (isHardware) {
    return {
      category: categories[6]!,
      priority: 'HIGH' as const,
      title: 'Hardware support request',
      guidance:
        'device type, urgency, location, manager approval, and whether the employee has a working backup',
      suggestedResponse:
        'Support should confirm device type, urgency, manager approval, and whether the employee has a working backup.',
      reasoning:
        'Mock AI detected hardware request language such as laptop, monitor, battery, dock, or headset.',
      referenceId: null,
    };
  }
  if (isNetwork) {
    return {
      category: categories[0]!,
      priority: 'HIGH' as const,
      title: 'VPN or network access issue',
      guidance:
        'VPN or network error message, device type, location, and whether other internal tools are affected',
      suggestedResponse:
        'Support should confirm the VPN or network error, device type, location, and whether other internal tools are affected.',
      reasoning: 'Mock AI detected VPN, Wi-Fi, internet, or network access language.',
      referenceId: 'kb-vpn-reset',
    };
  }
  if (isAccess) {
    return {
      category: categories[5]!,
      priority: 'MEDIUM' as const,
      title: 'Account or application access request',
      guidance: 'application name, approval status, access duration, and business reason',
      suggestedResponse:
        'Support should confirm the application, approval status, access duration, and business reason before changing permissions.',
      reasoning:
        'Mock AI detected account, password, license, folder, mailbox, or access language.',
      referenceId: 'kb-mfa',
    };
  }
  if (isSystemOutage) {
    return {
      category: categories[7]!,
      priority: 'HIGH' as const,
      title: 'Internal API or application outage',
      guidance:
        'affected API or application, endpoint, error message or status code, start time, scope, and business impact',
      suggestedResponse:
        'Operations should confirm the affected API or application, endpoint, error code, start time, scope, and business impact.',
      reasoning:
        'Mock AI detected internal API, app, service, endpoint, outage, or system-not-working language.',
      referenceId: 'kb-api-outage',
    };
  }

  return {
    category: categories[7]!,
    priority: 'MEDIUM' as const,
    title: 'Internal operations support request',
    guidance: 'affected workflow, urgency, owner team, and desired outcome',
    suggestedResponse:
      'Operations should verify the affected workflow, urgency, owner team, and desired outcome before routing the request.',
    reasoning: 'Mock AI classified this as a general internal operations support request.',
    referenceId: null,
  };
}

function improveDemoDraft(title: string, description: string): TicketDraftSuggestion {
  const text = `${title} ${description}`;
  const classification = classifyDemoTicketText(text);
  const improvedTitle =
    title.trim().length < 16 || includesAny(title, ['help', 'problem', 'issue', 'not working'])
      ? classification.title
      : cleanDraftText(title).replace(/\.$/, '');
  const cleanedDescription = cleanDraftText(description);

  return {
    improvedTitle,
    improvedDescription: [
      cleanedDescription,
      'Impact: This may affect employee access, business continuity, or an internal workflow.',
      `Helpful details to confirm: ${classification.guidance}.`,
    ].join('\n\n'),
    suggestedCategory: classification.category.name,
    suggestedCategoryId: classification.category.id,
    suggestedPriority: classification.priority,
    confidence: 0.86,
    changes: [
      'Corrected spelling and grammar.',
      'Made the title clearer and more specific.',
      'Added impact and missing-detail prompts.',
      'Suggested a category and priority for support review.',
    ],
    reasoning: classification.reasoning,
    mock: true,
    model: 'mock-deterministic-v1',
  };
}

function demoAnalytics(): DashboardAnalytics {
  const now = Date.now();
  const openTickets = demoTickets.filter(
    (ticket) => !['RESOLVED', 'CLOSED'].includes(ticket.status),
  );
  const acceptedAi = demoTickets
    .flatMap((ticket) => ticket.aiSuggestions ?? [])
    .filter((suggestion) => ['APPROVED', 'EDITED'].includes(suggestion.status));
  const allAi = demoTickets.flatMap((ticket) => ticket.aiSuggestions ?? []);

  return {
    openTickets: openTickets.length,
    unassignedTickets: demoTickets.filter((ticket) => !ticket.assignedAgent).length,
    atRiskTickets: openTickets.filter((ticket) => {
      const minutesLeft = ticket.slaDeadlineAt
        ? (new Date(ticket.slaDeadlineAt).getTime() - now) / 60_000
        : Infinity;
      return minutesLeft > 0 && minutesLeft <= 90;
    }).length,
    overdueTickets: openTickets.filter(
      (ticket) => ticket.slaDeadlineAt && new Date(ticket.slaDeadlineAt).getTime() < now,
    ).length,
    ticketsByCategory: countBy(
      demoTickets.map((ticket) => ticket.category?.name ?? 'Uncategorized'),
    ),
    ticketsByPriority: countBy(demoTickets.map((ticket) => ticket.priority)),
    ticketsByStatus: countBy(demoTickets.map((ticket) => ticket.status)),
    averageResponseMinutes: 42,
    averageResolutionMinutes: 390,
    slaCompliancePercent: 94,
    agentWorkload: countBy(
      openTickets.map((ticket) => ticket.assignedAgent?.fullName ?? 'Unassigned'),
    ),
    recurringIssueTrends: countBy(
      demoTickets.map(
        (ticket) => ticket.aiSummary?.split(' ').slice(0, 3).join(' ') ?? ticket.title,
      ),
    ).slice(0, 6),
    employeeSatisfaction: 4.6,
    aiSuggestionAcceptanceRate: allAi.length
      ? Math.round((acceptedAi.length / allAi.length) * 100)
      : 78,
  };
}

function findDemoTicket(id: string) {
  const ticket = demoTickets.find((item) => item.id === id);
  if (!ticket) {
    throw new Error('Ticket was not found.');
  }
  return ticket;
}

export const api = {
  async login(email: string, password: string) {
    try {
      return await request<UserSession>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    } catch (error) {
      const demoSession = createDemoSession(email, password);
      if (demoSession) {
        return demoSession;
      }
      throw error;
    }
  },
  logout(refreshToken: string) {
    if (refreshToken.startsWith('demo-refresh-token:')) {
      return Promise.resolve({ message: 'Logged out' });
    }
    return request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },
  listTickets(token: string, query = '') {
    if (isDemoToken(token)) {
      const params = new URLSearchParams(query.replace(/^\?/, ''));
      const search = params.get('search')?.toLowerCase();
      const assignment = params.get('assignment') ?? 'all';
      let visibleTickets =
        currentDemoUser.role === 'employee'
          ? demoTickets.filter((ticket) => ticket.reporter?.id === currentDemoUser.id)
          : demoTickets;
      if (currentDemoUser.role !== 'employee' && assignment === 'available') {
        visibleTickets = visibleTickets.filter(
          (ticket) => !ticket.assignedAgent && !['RESOLVED', 'CLOSED'].includes(ticket.status),
        );
      }
      if (currentDemoUser.role !== 'employee' && assignment === 'mine') {
        visibleTickets = visibleTickets.filter(
          (ticket) => ticket.assignedAgent?.id === currentDemoUser.id,
        );
      }
      const items = search
        ? visibleTickets.filter((ticket) =>
            `${ticket.number} ${ticket.title} ${ticket.description}`.toLowerCase().includes(search),
          )
        : visibleTickets;
      return Promise.resolve({ items, total: items.length });
    }
    return request<{ items: Ticket[]; total: number }>(`/tickets${query}`, { token });
  },
  createTicket(token: string, body: { title: string; description: string; categoryId?: string }) {
    if (isDemoToken(token)) {
      const classification = classifyDemoTicketText(`${body.title} ${body.description}`);
      const category =
        categories.find((item) => item.id === body.categoryId) ?? classification.category;
      const reference = classification.referenceId
        ? knowledge.find((item) => item.id === classification.referenceId)
        : undefined;
      const ticket: Ticket = {
        id: createId('ticket'),
        number: `ACME-2026-${String(demoTickets.length + 31).padStart(5, '0')}`,
        title: body.title,
        description: body.description,
        status: 'NEW',
        priority: 'MEDIUM',
        aiSummary: `${body.title} - ${body.description.slice(0, 120)}`,
        aiConfidence: 0.88,
        slaDeadlineAt: new Date(Date.now() + 1000 * 60 * 120).toISOString(),
        createdAt: new Date().toISOString(),
        reporter: {
          id: currentDemoUser.id,
          fullName: currentDemoUser.fullName,
          email: currentDemoUser.email,
        },
        assignedAgent: null,
        category,
        department: category.department ?? null,
        comments: [],
        aiSuggestions: [
          {
            id: createId('ai'),
            status: 'PENDING_REVIEW',
            mock: true,
            recommendation: classification.suggestedResponse,
            confidence: 0.88,
            reasoning: classification.reasoning,
            payload: {
              category: classification.category.name,
              priority: classification.priority,
              department: classification.category.department?.name ?? 'Operations',
              suggestedResponse: classification.suggestedResponse,
            },
            references: reference
              ? [
                  {
                    knowledgeDocument: { id: reference.id, title: reference.title },
                    excerpt: reference.excerpt,
                    relevanceScore: reference.score ?? 0.86,
                  },
                ]
              : [],
          },
        ],
        relatedFrom: demoTickets.slice(0, 1).map((ticketItem) => ({
          id: createId('related'),
          similarity: 0.81,
          targetTicket: {
            id: ticketItem.id,
            number: ticketItem.number,
            title: ticketItem.title,
            status: ticketItem.status,
            priority: ticketItem.priority,
          },
        })),
        statusHistory: [
          {
            id: createId('history'),
            previousStatus: null,
            newStatus: 'NEW',
            reason: 'Ticket created in local demo mode',
            changedAt: new Date().toISOString(),
            changedBy: { id: currentDemoUser.id, fullName: currentDemoUser.fullName },
          },
        ],
      };
      demoTickets.unshift(ticket);
      return Promise.resolve(ticket);
    }
    return request<Ticket>('/tickets', {
      token,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  improveTicketDraft(token: string, body: { title: string; description: string }) {
    if (isDemoToken(token)) {
      return Promise.resolve(improveDemoDraft(body.title, body.description));
    }
    return request<TicketDraftSuggestion>('/tickets/draft/improve', {
      token,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  getTicket(token: string, id: string): Promise<Ticket> {
    if (isDemoToken(token)) {
      const ticket = findDemoTicket(id);
      return Promise.resolve(
        currentDemoUser.role === 'employee'
          ? {
              ...ticket,
              comments: (ticket.comments ?? []).filter(
                (comment) => comment.visibility === 'PUBLIC',
              ),
            }
          : ticket,
      );
    }
    return request<Ticket>(`/tickets/${id}`, { token });
  },
  addComment(
    token: string,
    id: string,
    body: string,
    visibility: 'PUBLIC' | 'INTERNAL' = 'PUBLIC',
  ) {
    if (isDemoToken(token)) {
      const ticket = findDemoTicket(id);
      const comment = {
        id: createId('comment'),
        body,
        visibility,
        createdAt: new Date().toISOString(),
        author: {
          id: currentDemoUser.id,
          fullName: currentDemoUser.fullName,
          role: { slug: currentDemoUser.role },
        },
      };
      ticket.comments = [...(ticket.comments ?? []), comment];
      return Promise.resolve(comment);
    }
    return request(`/tickets/${id}/comments`, {
      token,
      method: 'POST',
      body: JSON.stringify({ body, visibility }),
    });
  },
  changeStatus(token: string, id: string, status: string, reason?: string) {
    if (isDemoToken(token)) {
      const ticket = findDemoTicket(id);
      const previousStatus = ticket.status;
      ticket.status = status as Ticket['status'];
      ticket.statusHistory = [
        ...(ticket.statusHistory ?? []),
        {
          id: createId('history'),
          previousStatus,
          newStatus: ticket.status,
          reason: reason ?? null,
          changedAt: new Date().toISOString(),
          changedBy: { id: currentDemoUser.id, fullName: currentDemoUser.fullName },
        },
      ];
      return Promise.resolve(ticket);
    }
    return request<Ticket>(`/tickets/${id}/status`, {
      token,
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  },
  assignTicket(token: string, id: string, agentId: string) {
    if (isDemoToken(token)) {
      const ticket = findDemoTicket(id);
      const agent = demoUsers.find((user) => user.user.id === agentId)?.user ?? demoUsers[1]!.user;
      const assignedAt = new Date().toISOString();
      ticket.assignedAgent = { id: agent.id, fullName: agent.fullName, email: agent.email };
      ticket.status = 'ASSIGNED';
      ticket.assignments = [
        {
          id: createId('assignment'),
          assignedAt,
          unassignedAt: null,
          agent: { id: agent.id, fullName: agent.fullName, role: { slug: agent.role } },
        },
        ...(ticket.assignments ?? []),
      ];
      return Promise.resolve(ticket);
    }
    return request<Ticket>(`/tickets/${id}/assign`, {
      token,
      method: 'POST',
      body: JSON.stringify({ agentId }),
    });
  },
  claimTicket(token: string, id: string) {
    if (isDemoToken(token)) {
      if (currentDemoUser.role === 'employee') {
        return Promise.reject(new Error('Only support team members can take tickets.'));
      }

      const ticket = findDemoTicket(id);
      if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
        return Promise.reject(new Error('Resolved or closed tickets cannot be claimed.'));
      }
      if (ticket.assignedAgent?.id === currentDemoUser.id) {
        return Promise.resolve(ticket);
      }
      if (ticket.assignedAgent) {
        return Promise.reject(
          new Error(`This ticket is already assigned to ${ticket.assignedAgent.fullName}.`),
        );
      }

      const previousStatus = ticket.status;
      const assignedAt = new Date().toISOString();
      ticket.assignedAgent = {
        id: currentDemoUser.id,
        fullName: currentDemoUser.fullName,
        email: currentDemoUser.email,
      };
      if (['NEW', 'TRIAGED', 'REOPENED'].includes(ticket.status)) {
        ticket.status = 'ASSIGNED';
      }
      ticket.assignments = [
        {
          id: createId('assignment'),
          assignedAt,
          unassignedAt: null,
          agent: {
            id: currentDemoUser.id,
            fullName: currentDemoUser.fullName,
            role: { slug: currentDemoUser.role },
          },
        },
        ...(ticket.assignments ?? []),
      ];
      ticket.statusHistory = [
        ...(ticket.statusHistory ?? []),
        {
          id: createId('history'),
          previousStatus,
          newStatus: ticket.status,
          reason: `${currentDemoUser.fullName} took ownership of this ticket`,
          changedAt: assignedAt,
          changedBy: { id: currentDemoUser.id, fullName: currentDemoUser.fullName },
        },
      ];
      return Promise.resolve(ticket);
    }
    return request<Ticket>(`/tickets/${id}/claim`, {
      token,
      method: 'POST',
    });
  },
  approveAiSuggestion(token: string, ticketId: string, suggestionId: string, body?: string) {
    if (isDemoToken(token)) {
      const ticket = findDemoTicket(ticketId);
      const suggestion = ticket.aiSuggestions?.find((item) => item.id === suggestionId);
      if (suggestion) {
        suggestion.status = 'APPROVED';
      }
      return api.addComment(token, ticketId, body || suggestion?.recommendation || '', 'PUBLIC');
    }
    return request(`/tickets/${ticketId}/ai-suggestions/${suggestionId}/approve`, {
      token,
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  },
  listCategories(token: string) {
    if (isDemoToken(token)) {
      return Promise.resolve(categories);
    }
    return request<Category[]>('/meta/categories', { token });
  },
  searchKnowledge(token: string, search?: string) {
    if (isDemoToken(token)) {
      const normalizedSearch = search?.toLowerCase() ?? '';
      return Promise.resolve(
        knowledge.filter((item) =>
          normalizedSearch
            ? `${item.title} ${item.excerpt}`
                .toLowerCase()
                .includes(normalizedSearch.split(' ')[0] ?? '')
            : true,
        ),
      );
    }
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<Array<{ id: string; title: string; excerpt: string; score?: number }>>(
      `/knowledge${query}`,
      { token },
    );
  },
  analytics(token: string) {
    if (isDemoToken(token)) {
      return Promise.resolve(demoAnalytics());
    }
    return request<DashboardAnalytics>('/analytics/dashboard', { token });
  },
  users(token: string) {
    if (isDemoToken(token)) {
      return Promise.resolve(
        demoUsers.map((demoUser) => ({
          id: demoUser.user.id,
          fullName: demoUser.user.fullName,
          email: demoUser.user.email,
          title: demoUser.user.title,
          role: { name: demoUser.user.role.replaceAll('_', ' ') },
          department: demoUser.user.departmentId
            ? {
                id: demoUser.user.departmentId,
                name: departmentNames[demoUser.user.departmentId] ?? 'Unassigned',
              }
            : null,
        })),
      );
    }
    return request<Array<{ id: string; fullName: string; email: string; role: { name: string } }>>(
      '/users',
      { token },
    );
  },
  audit(token: string) {
    if (isDemoToken(token)) {
      return Promise.resolve([
        {
          id: 'audit-1',
          action: 'LOGIN_SUCCESS',
          entityType: 'User',
          createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
        },
        {
          id: 'audit-2',
          action: 'AI_SUGGESTION_APPROVED',
          entityType: 'AiSuggestion',
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        },
        {
          id: 'audit-3',
          action: 'SLA_POLICY_UPDATED',
          entityType: 'SlaPolicy',
          createdAt: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
        },
      ]);
    }
    return request<Array<{ id: string; action: string; entityType: string; createdAt: string }>>(
      '/audit',
      { token },
    );
  },
};

export const apiUrl = API_URL;
