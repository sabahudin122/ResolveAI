import {
  PrismaClient,
  type AiSuggestionStatus,
  type CommentVisibility,
  type Department,
  type KnowledgeDocument,
  type NotificationType,
  type Priority,
  type Prisma,
  type Role,
  type Ticket,
  type TicketCategory,
  type TicketStatus,
  type User,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const passwordByRole = {
  administrator: 'AdminPass123!',
  manager: 'ManagerPass123!',
  support_agent: 'AgentPass123!',
  employee: 'EmployeePass123!',
} as const;

type RoleSlug = keyof typeof passwordByRole;

const roleSeeds: Array<{ name: string; slug: RoleSlug; description: string }> = [
  {
    name: 'Administrator',
    slug: 'administrator',
    description: 'Full organization configuration, user administration and security access',
  },
  {
    name: 'Manager',
    slug: 'manager',
    description: 'Department analytics, SLA operations and knowledge-base management',
  },
  {
    name: 'Support Agent',
    slug: 'support_agent',
    description: 'Ticket queue ownership and employee support operations',
  },
  {
    name: 'Employee',
    slug: 'employee',
    description: 'Self-service ticket creation, ticket tracking and knowledge-base access',
  },
];

const departments = [
  {
    name: 'IT Support',
    code: 'IT',
    description: 'Endpoint, network, identity and productivity-tool support',
  },
  {
    name: 'Human Resources',
    code: 'HR',
    description: 'People operations, benefits, onboarding and policy support',
  },
  {
    name: 'Finance',
    code: 'FIN',
    description: 'Payroll, procurement, expenses and financial operations',
  },
  {
    name: 'Operations',
    code: 'OPS',
    description: 'Company operations, service coordination and access governance',
  },
  {
    name: 'Facilities',
    code: 'FAC',
    description: 'Office, building access, room equipment and workplace requests',
  },
  {
    name: 'Information Security',
    code: 'SEC',
    description: 'Security incidents, access reviews, risk response and compliance',
  },
] as const;

type DepartmentName = (typeof departments)[number]['name'];

const categories = [
  { name: 'Network access', slug: 'network-access', department: 'IT Support' },
  { name: 'Account access', slug: 'account-access', department: 'IT Support' },
  { name: 'Hardware request', slug: 'hardware-request', department: 'IT Support' },
  { name: 'HR policy', slug: 'hr-policy', department: 'Human Resources' },
  { name: 'Payroll question', slug: 'payroll-question', department: 'Finance' },
  { name: 'Facilities issue', slug: 'facilities-issue', department: 'Facilities' },
  { name: 'Security incident', slug: 'security-incident', department: 'Information Security' },
  { name: 'Operational request', slug: 'operational-request', department: 'Operations' },
] as const;

type CategorySlug = (typeof categories)[number]['slug'];

const categorySeedsBySlug = indexBy(categories, (category) => category.slug);

const knowledgeArticles: Array<{
  title: string;
  department: DepartmentName;
  body: string;
}> = [
  {
    title: 'Reset company VPN after password change',
    department: 'IT Support',
    body:
      'When a user changes their password, the VPN client may keep an old credential cache. Ask the employee to sign out of the VPN client, forget saved credentials, restart the device, confirm MFA approval, and sign in again with the new password.',
  },
  {
    title: 'VPN instability triage checklist',
    department: 'IT Support',
    body:
      'For repeated VPN disconnects, capture client version, network type, region, device posture status, and last successful connection time. Compare with current network incidents before reinstalling the managed client.',
  },
  {
    title: 'Troubleshooting MFA push failures',
    department: 'Information Security',
    body:
      'If MFA push approval does not arrive, verify mobile network access, authenticator registration, lockout state, and recent risky sign-in events. Support must never ask for one-time codes in a public ticket reply.',
  },
  {
    title: 'Suspicious email response process',
    department: 'Information Security',
    body:
      'Employees should report phishing messages with the report button when available. Do not open attachments or click links. Security reviews headers, sender reputation, payload indicators, and related mail activity.',
  },
  {
    title: 'Printer queue recovery',
    department: 'Facilities',
    body:
      'For shared office printers, clear the local queue, confirm the floor printer is online, reinstall the managed printer profile from the device portal, and escalate hardware faults to Facilities.',
  },
  {
    title: 'Badge access escalation',
    department: 'Facilities',
    body:
      'Temporary badge failures should be escalated with employee name, office location, door reader, badge number, and time of attempted entry. Failed access after hours requires manager confirmation.',
  },
  {
    title: 'Expense reimbursement timeline',
    department: 'Finance',
    body:
      'Approved reimbursement claims are usually paid in the next payroll cycle. Missing receipts, policy exceptions, or vendor mismatches require Finance review before payment.',
  },
  {
    title: 'Payroll tax form correction',
    department: 'Finance',
    body:
      'Payroll tax form corrections require employee confirmation, Finance review, and a payroll-system update before the next filing cycle. Sensitive payroll details should stay in internal notes.',
  },
  {
    title: 'New hire laptop checklist',
    department: 'IT Support',
    body:
      'A new laptop request requires department approval, hardware profile selection, endpoint enrollment, disk encryption, identity provisioning, and delivery confirmation before the onboarding date.',
  },
  {
    title: 'Remote work equipment policy',
    department: 'Human Resources',
    body:
      'Remote equipment approvals depend on role, location, manager approval, ergonomic need, and current company policy. HR owns policy questions and IT owns device fulfillment.',
  },
  {
    title: 'Benefits enrollment support',
    department: 'Human Resources',
    body:
      'Benefits enrollment changes must be validated against eligibility windows. HR should confirm qualifying life events, required documents, and payroll effective dates before making changes.',
  },
  {
    title: 'Quarter-end access freeze',
    department: 'Operations',
    body:
      'During quarter close, privileged production access changes require manager approval, documented business justification, and review from Operations before the change is released.',
  },
];

type TicketTemplate = {
  title: string;
  description: string;
  category: CategorySlug;
  priority: Priority;
  summary: string;
  suggestedResponse: string;
};

const ticketTemplates: TicketTemplate[] = [
  {
    title: 'Cannot connect to VPN after password reset',
    description:
      'I changed my password this morning and the company VPN now says authentication failed even though email still works.',
    category: 'network-access',
    priority: 'HIGH',
    summary: 'VPN authentication failure after password change',
    suggestedResponse:
      'Confirm the password reset time, clear saved VPN credentials, restart the client, and verify MFA is reaching the employee before escalating.',
  },
  {
    title: 'VPN disconnects every few minutes',
    description:
      'The VPN connects successfully but drops after three to five minutes. The issue started after the latest managed client update.',
    category: 'network-access',
    priority: 'HIGH',
    summary: 'Recurring VPN disconnects after client update',
    suggestedResponse:
      'Collect VPN client version, network type, and disconnect timestamps, then compare the device with the current VPN health advisory.',
  },
  {
    title: 'Authenticator push not arriving',
    description:
      'I am trying to approve a payroll login but no authenticator push appears on my phone.',
    category: 'security-incident',
    priority: 'CRITICAL',
    summary: 'MFA push delivery failure affecting payroll access',
    suggestedResponse:
      'Verify the employee identity, check account lockout and risky sign-in status, then refresh authenticator registration if required.',
  },
  {
    title: 'Suspicious email with invoice attachment',
    description:
      'I received an invoice attachment from a vendor address that looks misspelled and I have not opened it.',
    category: 'security-incident',
    priority: 'CRITICAL',
    summary: 'Potential phishing invoice attachment',
    suggestedResponse:
      'Ask the employee not to open the attachment, preserve the message, and send headers to Security for review.',
  },
  {
    title: 'Need access to finance reporting folder',
    description:
      'My manager asked me to review the quarter-end file but the finance reporting folder says access denied.',
    category: 'account-access',
    priority: 'MEDIUM',
    summary: 'Finance folder access request pending approval',
    suggestedResponse:
      'Confirm manager approval, business reason, and access duration before granting the finance reporting group.',
  },
  {
    title: 'Password reset link expired',
    description:
      'The password reset link expired before I could use it, and I need to sign in before the morning shift starts.',
    category: 'account-access',
    priority: 'MEDIUM',
    summary: 'Expired password reset link blocking sign-in',
    suggestedResponse:
      'Send a fresh reset link after verifying identity and confirm the employee can complete MFA after the reset.',
  },
  {
    title: 'Laptop battery drains quickly',
    description:
      'My managed laptop loses battery in less than one hour during meetings and gets very warm while charging.',
    category: 'hardware-request',
    priority: 'MEDIUM',
    summary: 'Laptop battery health issue requiring endpoint review',
    suggestedResponse:
      'Check battery health telemetry, recent background processes, charger model, and warranty status before approving replacement.',
  },
  {
    title: 'New hire laptop request',
    description:
      'A new employee starts next week and needs a laptop, docking station, and standard productivity access.',
    category: 'hardware-request',
    priority: 'HIGH',
    summary: 'New hire hardware request with onboarding deadline',
    suggestedResponse:
      'Confirm start date, role profile, manager approval, delivery location, and endpoint enrollment checklist.',
  },
  {
    title: 'Remote monitor request',
    description:
      'Can I request a second monitor for my home office setup under the remote equipment policy?',
    category: 'hr-policy',
    priority: 'LOW',
    summary: 'Remote equipment policy question',
    suggestedResponse:
      'Check role eligibility, remote-work status, manager approval, and whether the request should go through HR policy review.',
  },
  {
    title: 'Benefits enrollment date question',
    description:
      'I missed the benefits enrollment reminder and need to know whether I can still update my coverage.',
    category: 'hr-policy',
    priority: 'LOW',
    summary: 'Benefits enrollment eligibility question',
    suggestedResponse:
      'Confirm the enrollment window, qualifying life event status, required documents, and payroll effective date.',
  },
  {
    title: 'Payroll deduction looks incorrect',
    description:
      'My latest payslip includes a deduction I do not recognize, and I need Finance to review it.',
    category: 'payroll-question',
    priority: 'MEDIUM',
    summary: 'Unrecognized payroll deduction requires review',
    suggestedResponse:
      'Ask Finance to review the deduction code in payroll, keep sensitive details internal, and confirm the correction timeline.',
  },
  {
    title: 'Expense reimbursement missing',
    description:
      'My approved reimbursement is not visible in the payroll preview for this week.',
    category: 'payroll-question',
    priority: 'MEDIUM',
    summary: 'Approved reimbursement missing from payroll preview',
    suggestedResponse:
      'Check receipt status, approval timestamp, payroll cutoff, and whether the claim will roll into the next cycle.',
  },
  {
    title: 'Conference room display is offline',
    description:
      'The display in the large conference room shows no signal even after restarting the adapter.',
    category: 'facilities-issue',
    priority: 'LOW',
    summary: 'Conference room display outage',
    suggestedResponse:
      'Confirm the room, adapter status, input source, and whether the issue affects the room calendar schedule.',
  },
  {
    title: 'Badge denied at side entrance',
    description:
      'My badge works at reception but not at the side entrance after 6 PM.',
    category: 'facilities-issue',
    priority: 'MEDIUM',
    summary: 'Badge access denied at after-hours entrance',
    suggestedResponse:
      'Collect door reader, time, badge number, and manager confirmation before updating after-hours access.',
  },
  {
    title: 'Production access exception request',
    description:
      'A release is blocked because I need temporary production access during the quarter-end freeze.',
    category: 'operational-request',
    priority: 'HIGH',
    summary: 'Production access exception during change freeze',
    suggestedResponse:
      'Confirm business justification, manager approval, access scope, expiration time, and Operations review before approval.',
  },
  {
    title: 'Workflow automation failed overnight',
    description:
      'The overnight operations workflow failed and several internal reports did not refresh this morning.',
    category: 'operational-request',
    priority: 'HIGH',
    summary: 'Operations workflow failure affecting morning reports',
    suggestedResponse:
      'Check the failed job run, affected reports, owner team, and whether a manual rerun is safe.',
  },
  {
    title: 'Cannot print shipping labels',
    description:
      'The shared printer queue accepts shipping labels but nothing prints on the warehouse floor.',
    category: 'facilities-issue',
    priority: 'MEDIUM',
    summary: 'Shared printer queue failing for shipping labels',
    suggestedResponse:
      'Clear the local queue, confirm printer status, reinstall the managed printer profile, and inspect device errors.',
  },
  {
    title: 'Locked out after too many sign-in attempts',
    description:
      'I tried the old password too many times and now the portal says my account is locked.',
    category: 'account-access',
    priority: 'HIGH',
    summary: 'Account lockout blocking portal access',
    suggestedResponse:
      'Verify identity, review lockout logs, unlock the account if safe, and guide the employee through a clean sign-in.',
  },
  {
    title: 'Security training completion not recorded',
    description:
      'I completed security training but the compliance dashboard still says it is overdue.',
    category: 'security-incident',
    priority: 'MEDIUM',
    summary: 'Security training completion mismatch',
    suggestedResponse:
      'Check training vendor sync, completion timestamp, employee identifier, and compliance import status.',
  },
  {
    title: 'Desk move request for new project team',
    description:
      'Our project team needs to sit together for the next six weeks and we need Facilities to confirm available desks.',
    category: 'facilities-issue',
    priority: 'LOW',
    summary: 'Temporary desk move coordination request',
    suggestedResponse:
      'Confirm team size, floor preference, dates, accessibility needs, and Facilities availability.',
  },
  {
    title: 'Shared mailbox access request',
    description:
      'I need access to the regional support shared mailbox while covering for a teammate.',
    category: 'account-access',
    priority: 'MEDIUM',
    summary: 'Temporary shared mailbox access request',
    suggestedResponse:
      'Confirm manager approval, access duration, mailbox owner, and whether send-as permission is needed.',
  },
  {
    title: 'Tax form address correction',
    description:
      'My payroll tax form has an old address and I need it corrected before filing.',
    category: 'payroll-question',
    priority: 'HIGH',
    summary: 'Payroll tax form address correction',
    suggestedResponse:
      'Confirm the correct address securely, review payroll profile history, and document the correction before the next filing cycle.',
  },
  {
    title: 'Onboarding access missing for new hire',
    description:
      'A new hire can sign in but does not have access to the onboarding workspace or required checklist.',
    category: 'operational-request',
    priority: 'MEDIUM',
    summary: 'New hire onboarding workspace access missing',
    suggestedResponse:
      'Confirm the employee profile, onboarding group membership, manager approval, and required workspace permissions.',
  },
  {
    title: 'Video meeting license not available',
    description:
      'I need to host a client call this afternoon but my video meeting account is still on the basic license.',
    category: 'account-access',
    priority: 'MEDIUM',
    summary: 'Video meeting license upgrade request',
    suggestedResponse:
      'Confirm the meeting time, license policy, manager approval, and whether a temporary host transfer can solve the issue.',
  },
];

type UserSeed = {
  fullName: string;
  email: string;
  role: RoleSlug;
  department: DepartmentName;
  title: string;
};

type OrganizationSeed = {
  name: string;
  slug: string;
  ticketCount: number;
  users: UserSeed[];
};

const organizationSeeds: OrganizationSeed[] = [
  {
    name: 'Acme Operations',
    slug: 'acme',
    ticketCount: 280,
    users: [
      {
        fullName: 'Amina Kovac',
        email: 'admin@acme.test',
        role: 'administrator',
        department: 'Operations',
        title: 'Operations Administrator',
      },
      {
        fullName: 'Mirza Delic',
        email: 'manager@acme.test',
        role: 'manager',
        department: 'IT Support',
        title: 'IT Support Manager',
      },
      {
        fullName: 'Selma Rahman',
        email: 'finance.manager@acme.test',
        role: 'manager',
        department: 'Finance',
        title: 'Finance Operations Manager',
      },
      {
        fullName: 'Ava Novak',
        email: 'agent1@acme.test',
        role: 'support_agent',
        department: 'IT Support',
        title: 'Senior Support Agent',
      },
      {
        fullName: 'Noah Reed',
        email: 'agent2@acme.test',
        role: 'support_agent',
        department: 'IT Support',
        title: 'Endpoint Support Agent',
      },
      {
        fullName: 'Sara Music',
        email: 'agent3@acme.test',
        role: 'support_agent',
        department: 'Information Security',
        title: 'Security Support Agent',
      },
      {
        fullName: 'Daniel Kim',
        email: 'agent4@acme.test',
        role: 'support_agent',
        department: 'Facilities',
        title: 'Facilities Support Agent',
      },
      {
        fullName: 'Eli Stone',
        email: 'employee1@acme.test',
        role: 'employee',
        department: 'Operations',
        title: 'Operations Specialist',
      },
      {
        fullName: 'Lejla Basic',
        email: 'employee2@acme.test',
        role: 'employee',
        department: 'Finance',
        title: 'Finance Analyst',
      },
      {
        fullName: 'Omar Hayes',
        email: 'employee3@acme.test',
        role: 'employee',
        department: 'Human Resources',
        title: 'People Operations Coordinator',
      },
      {
        fullName: 'Mia Chen',
        email: 'employee4@acme.test',
        role: 'employee',
        department: 'Facilities',
        title: 'Workplace Coordinator',
      },
      {
        fullName: 'Ivan Petrov',
        email: 'employee5@acme.test',
        role: 'employee',
        department: 'Operations',
        title: 'Program Coordinator',
      },
      {
        fullName: 'Nadia Brooks',
        email: 'employee6@acme.test',
        role: 'employee',
        department: 'Information Security',
        title: 'Security Compliance Analyst',
      },
      {
        fullName: 'Theo Grant',
        email: 'employee7@acme.test',
        role: 'employee',
        department: 'IT Support',
        title: 'IT Asset Coordinator',
      },
      {
        fullName: 'Rania Cole',
        email: 'employee8@acme.test',
        role: 'employee',
        department: 'Human Resources',
        title: 'Benefits Specialist',
      },
      {
        fullName: 'Mateo Costa',
        email: 'employee9@acme.test',
        role: 'employee',
        department: 'Facilities',
        title: 'Office Experience Specialist',
      },
      {
        fullName: 'Janelle Wright',
        email: 'employee10@acme.test',
        role: 'employee',
        department: 'Finance',
        title: 'Payroll Coordinator',
      },
    ],
  },
  {
    name: 'Globex Shared Services',
    slug: 'globex',
    ticketCount: 90,
    users: [
      {
        fullName: 'Grace Hopper',
        email: 'admin@globex.test',
        role: 'administrator',
        department: 'Operations',
        title: 'Shared Services Administrator',
      },
      {
        fullName: 'Linus Carter',
        email: 'manager@globex.test',
        role: 'manager',
        department: 'IT Support',
        title: 'Support Operations Manager',
      },
      {
        fullName: 'Nora Blake',
        email: 'agent1@globex.test',
        role: 'support_agent',
        department: 'IT Support',
        title: 'Support Agent',
      },
      {
        fullName: 'Hana Weiss',
        email: 'agent2@globex.test',
        role: 'support_agent',
        department: 'Information Security',
        title: 'Security Support Agent',
      },
      {
        fullName: 'Diego Silva',
        email: 'employee1@globex.test',
        role: 'employee',
        department: 'Finance',
        title: 'Finance Associate',
      },
      {
        fullName: 'Priya Shah',
        email: 'employee2@globex.test',
        role: 'employee',
        department: 'Operations',
        title: 'Operations Analyst',
      },
      {
        fullName: 'Farah Iqbal',
        email: 'employee3@globex.test',
        role: 'employee',
        department: 'Human Resources',
        title: 'People Operations Associate',
      },
      {
        fullName: 'Marek Novak',
        email: 'employee4@globex.test',
        role: 'employee',
        department: 'Facilities',
        title: 'Facilities Coordinator',
      },
      {
        fullName: 'Amara Green',
        email: 'employee5@globex.test',
        role: 'employee',
        department: 'Information Security',
        title: 'Risk Analyst',
      },
      {
        fullName: 'Jon Bell',
        email: 'employee6@globex.test',
        role: 'employee',
        department: 'IT Support',
        title: 'Device Program Associate',
      },
    ],
  },
];

const statusCycle: TicketStatus[] = [
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'ASSIGNED',
  'TRIAGED',
  'WAITING_FOR_EMPLOYEE',
  'RESOLVED',
  'NEW',
  'IN_PROGRESS',
  'CLOSED',
  'ASSIGNED',
  'REOPENED',
  'RESOLVED',
  'TRIAGED',
  'WAITING_FOR_EMPLOYEE',
  'CLOSED',
  'IN_PROGRESS',
  'RESOLVED',
  'NEW',
  'ASSIGNED',
];

const priorityOverrideCycle: Priority[] = [
  'MEDIUM',
  'HIGH',
  'LOW',
  'MEDIUM',
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'HIGH',
  'MEDIUM',
];

const locations = [
  'Sarajevo HQ',
  'Berlin office',
  'Austin hub',
  'London floor 3',
  'remote home office',
  'warehouse floor',
  'client site',
  'regional support desk',
] as const;

const teams = [
  'Finance close team',
  'People operations',
  'Customer success',
  'Field operations',
  'Executive support',
  'Warehouse operations',
  'Security review team',
  'Sales operations',
] as const;

const impactStatements = [
  'The request blocks a scheduled meeting.',
  'The employee can work around it for a short time.',
  'The issue affects several people on the same team.',
  'The work is time-sensitive because of a customer commitment.',
  'The ticket is part of onboarding for a new employee.',
  'The issue is recurring and needs a permanent fix.',
  'The request is low-risk but needs clear ownership.',
  'The situation may become urgent if it is not handled today.',
] as const;

function indexBy<T, K extends string>(items: readonly T[], getKey: (item: T) => K): Record<K, T> {
  const record = {} as Record<K, T>;
  for (const item of items) {
    record[getKey(item)] = item;
  }
  return record;
}

function pick<T>(items: readonly T[], index: number): T {
  const item = items[index % items.length];
  if (item === undefined) {
    throw new Error('Cannot pick from an empty collection.');
  }
  return item;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE_MS);
}

function clampPast(date: Date, now: Date): Date {
  if (date.getTime() <= now.getTime()) {
    return date;
  }
  return new Date(now.getTime() - 2 * MINUTE_MS);
}

function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

async function buildPasswordHashes(): Promise<Record<RoleSlug, string>> {
  return {
    administrator: await hashPassword(passwordByRole.administrator),
    manager: await hashPassword(passwordByRole.manager),
    support_agent: await hashPassword(passwordByRole.support_agent),
    employee: await hashPassword(passwordByRole.employee),
  };
}

function firstResponseMinutes(priority: Priority): number {
  if (priority === 'CRITICAL') {
    return 30;
  }
  if (priority === 'HIGH') {
    return 120;
  }
  if (priority === 'MEDIUM') {
    return 480;
  }
  return 1440;
}

function resolutionMinutes(priority: Priority): number {
  if (priority === 'CRITICAL') {
    return 240;
  }
  if (priority === 'HIGH') {
    return 960;
  }
  if (priority === 'MEDIUM') {
    return 2880;
  }
  return 5760;
}

function isTerminal(status: TicketStatus): boolean {
  return status === 'RESOLVED' || status === 'CLOSED';
}

function chooseStatus(index: number): TicketStatus {
  return pick(statusCycle, index);
}

function choosePriority(templatePriority: Priority, index: number): Priority {
  if (index % 41 === 0) {
    return 'CRITICAL';
  }
  if (index % 17 === 0) {
    return pick(priorityOverrideCycle, index);
  }
  return templatePriority;
}

function createdAtFor(index: number, now: Date): Date {
  if (index % 29 === 0) {
    return new Date(now.getTime() - (25 + (index % 4) * 10) * MINUTE_MS);
  }
  if (index % 31 === 0) {
    return new Date(now.getTime() - (2 + (index % 7)) * HOUR_MS);
  }

  const daysAgo = (index * 37) % 90;
  const minutesAgo = (index * 173) % (24 * 60);
  return new Date(now.getTime() - daysAgo * DAY_MS - minutesAgo * MINUTE_MS);
}

function slaDeadlineFor(status: TicketStatus, priority: Priority, createdAt: Date, index: number, now: Date): Date {
  if (!isTerminal(status)) {
    if (index % 29 === 0) {
      return new Date(now.getTime() + (25 + (index % 3) * 10) * MINUTE_MS);
    }
    if (index % 11 === 0) {
      return new Date(now.getTime() - (35 + (index % 8) * 45) * MINUTE_MS);
    }
    if (index % 5 === 0) {
      return new Date(now.getTime() + (2 + (index % 18)) * HOUR_MS);
    }
  }

  return addMinutes(createdAt, resolutionMinutes(priority));
}

function resolvedAtFor(
  status: TicketStatus,
  priority: Priority,
  createdAt: Date,
  deadline: Date,
  index: number,
  now: Date,
): Date | null {
  if (!isTerminal(status)) {
    return null;
  }

  const breached = index % 9 === 0 || (priority === 'CRITICAL' && index % 4 === 0);
  const offsetMinutes = breached ? 45 + (index % 8) * 60 : -(90 + (index % 12) * 60);
  const candidate = addMinutes(deadline, offsetMinutes);
  const earliest = addMinutes(createdAt, 60 + (index % 4) * 30);
  const adjusted = candidate.getTime() < earliest.getTime() ? earliest : candidate;
  return clampPast(adjusted, now);
}

function firstResponseAtFor(
  status: TicketStatus,
  priority: Priority,
  createdAt: Date,
  index: number,
  now: Date,
  hasAgent: boolean,
): Date | null {
  if (!hasAgent || (status === 'NEW' && index % 3 !== 0)) {
    return null;
  }

  const responseMinutes = Math.max(8, Math.round(firstResponseMinutes(priority) * (0.2 + (index % 5) * 0.15)));
  return clampPast(addMinutes(createdAt, responseMinutes), now);
}

function updatedAtFor(status: TicketStatus, createdAt: Date, resolvedAt: Date | null, index: number, now: Date): Date {
  const candidate =
    isTerminal(status) && resolvedAt
      ? addMinutes(resolvedAt, status === 'CLOSED' ? 120 + (index % 5) * 20 : 25)
      : index % 4 === 0
        ? new Date(now.getTime() - (index % 18 + 1) * HOUR_MS)
        : addMinutes(createdAt, 180 + (index % 72) * 35);

  const bounded = clampPast(candidate, now);
  return bounded.getTime() < createdAt.getTime() ? createdAt : bounded;
}

function statusPath(status: TicketStatus): TicketStatus[] {
  switch (status) {
    case 'NEW':
      return ['NEW'];
    case 'TRIAGED':
      return ['NEW', 'TRIAGED'];
    case 'ASSIGNED':
      return ['NEW', 'TRIAGED', 'ASSIGNED'];
    case 'IN_PROGRESS':
      return ['NEW', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS'];
    case 'WAITING_FOR_EMPLOYEE':
      return ['NEW', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_EMPLOYEE'];
    case 'RESOLVED':
      return ['NEW', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];
    case 'CLOSED':
      return ['NEW', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    case 'REOPENED':
      return ['NEW', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REOPENED'];
  }
}

function statusHistoryFor(input: {
  organizationId: string;
  status: TicketStatus;
  createdAt: Date;
  resolvedAt: Date | null;
  reporter: User;
  agent: User | null;
  manager: User;
  admin: User;
  ticketIndex: number;
  now: Date;
}) {
  const path = statusPath(input.status);

  return path.map((newStatus, stepIndex) => {
    const previousStatus = stepIndex === 0 ? null : pick(path, stepIndex - 1);
    const actor =
      stepIndex === 0
        ? input.reporter
        : newStatus === 'CLOSED'
          ? input.reporter
          : input.agent ?? (newStatus === 'TRIAGED' ? input.manager : input.admin);

    let changedAt = addMinutes(input.createdAt, 20 + stepIndex * 85 + (input.ticketIndex % 17) * 3);
    if (newStatus === 'RESOLVED' && input.resolvedAt) {
      changedAt = input.resolvedAt;
    }
    if (newStatus === 'CLOSED' && input.resolvedAt) {
      changedAt = addMinutes(input.resolvedAt, 120 + (input.ticketIndex % 6) * 30);
    }

    return {
      organizationId: input.organizationId,
      changedById: actor.id,
      previousStatus,
      newStatus,
      changedAt: clampPast(changedAt, input.now),
      reason: reasonForStatus(newStatus),
    };
  });
}

function reasonForStatus(status: TicketStatus): string {
  if (status === 'NEW') {
    return 'Ticket created by employee';
  }
  if (status === 'TRIAGED') {
    return 'Support reviewed category, priority and likely owner';
  }
  if (status === 'ASSIGNED') {
    return 'Ticket assigned to support owner';
  }
  if (status === 'IN_PROGRESS') {
    return 'Investigation started';
  }
  if (status === 'WAITING_FOR_EMPLOYEE') {
    return 'Waiting for employee confirmation';
  }
  if (status === 'RESOLVED') {
    return 'Support provided a resolution';
  }
  if (status === 'CLOSED') {
    return 'Employee confirmed the issue can be closed';
  }
  return 'Employee reopened the ticket for follow-up';
}

type CommentSeed = {
  organizationId: string;
  authorId: string;
  body: string;
  visibility: CommentVisibility;
  createdAt: Date;
};

function commentsFor(input: {
  organizationId: string;
  template: TicketTemplate;
  status: TicketStatus;
  createdAt: Date;
  reporter: User;
  agent: User | null;
  manager: User;
  location: string;
  ticketIndex: number;
  now: Date;
}): CommentSeed[] {
  const comments: CommentSeed[] = [];

  if (input.agent) {
    comments.push({
      organizationId: input.organizationId,
      authorId: input.agent.id,
      body: `I reviewed the request for ${input.location} and am checking the matching runbook before sending the next response.`,
      visibility: 'PUBLIC',
      createdAt: clampPast(addMinutes(input.createdAt, 50 + (input.ticketIndex % 9) * 12), input.now),
    });
  }

  if (input.agent && input.ticketIndex % 2 === 0) {
    comments.push({
      organizationId: input.organizationId,
      authorId: input.agent.id,
      body: `Internal note: AI suggested ${input.template.category.replaceAll('-', ' ')} with ${input.template.priority} urgency. Confirm owner and affected systems before approval.`,
      visibility: 'INTERNAL',
      createdAt: clampPast(addMinutes(input.createdAt, 95 + (input.ticketIndex % 10) * 14), input.now),
    });
  }

  if (input.status === 'WAITING_FOR_EMPLOYEE') {
    comments.push({
      organizationId: input.organizationId,
      authorId: input.agent?.id ?? input.manager.id,
      body: 'Could you confirm the exact timestamp, device or location, and whether anyone else on your team sees the same behavior?',
      visibility: 'PUBLIC',
      createdAt: clampPast(addMinutes(input.createdAt, 145), input.now),
    });
  }

  if (input.status === 'REOPENED') {
    comments.push({
      organizationId: input.organizationId,
      authorId: input.reporter.id,
      body: 'The issue returned after the original fix. I reopened the request because the same workflow is blocked again.',
      visibility: 'PUBLIC',
      createdAt: clampPast(addMinutes(input.createdAt, 280), input.now),
    });
  }

  if (isTerminal(input.status) && input.agent) {
    comments.push({
      organizationId: input.organizationId,
      authorId: input.agent.id,
      body: `Resolution applied: ${input.template.suggestedResponse}`,
      visibility: 'PUBLIC',
      createdAt: clampPast(addMinutes(input.createdAt, 240 + (input.ticketIndex % 18) * 20), input.now),
    });
  }

  if (input.status === 'CLOSED') {
    comments.push({
      organizationId: input.organizationId,
      authorId: input.reporter.id,
      body: 'Confirmed, this is working now. Thank you for the clear update.',
      visibility: 'PUBLIC',
      createdAt: clampPast(addMinutes(input.createdAt, 360 + (input.ticketIndex % 8) * 20), input.now),
    });
  }

  return comments;
}

type AiSuggestionSeed = {
  organizationId: string;
  requestedById: string;
  type: 'TRIAGE' | 'RESPONSE';
  status: AiSuggestionStatus;
  model: string;
  mock: boolean;
  recommendation: string;
  confidence: number;
  reasoning: string;
  payload: Prisma.InputJsonObject;
  reviewedById?: string;
  reviewedAt?: Date;
  createdAt: Date;
  references: {
    create: Array<{
      organizationId: string;
      knowledgeDocumentId: string;
      excerpt: string;
      relevanceScore: number;
    }>;
  };
};

function aiStatusFor(ticketStatus: TicketStatus, index: number): AiSuggestionStatus {
  if (ticketStatus === 'NEW' || ticketStatus === 'TRIAGED') {
    return index % 4 === 0 ? 'PENDING_REVIEW' : 'APPROVED';
  }
  if (ticketStatus === 'REOPENED') {
    return index % 2 === 0 ? 'EDITED' : 'PENDING_REVIEW';
  }
  if (isTerminal(ticketStatus)) {
    return index % 5 === 0 ? 'EDITED' : 'APPROVED';
  }
  return index % 6 === 0 ? 'REJECTED' : 'APPROVED';
}

function aiSuggestionsFor(input: {
  organizationId: string;
  template: TicketTemplate;
  category: TicketCategory;
  status: TicketStatus;
  priority: Priority;
  reporter: User;
  reviewer: User;
  docs: KnowledgeDocument[];
  createdAt: Date;
  ticketIndex: number;
  team: string;
  location: string;
  now: Date;
}): AiSuggestionSeed[] {
  const triageStatus = aiStatusFor(input.status, input.ticketIndex);
  const reviewed = triageStatus !== 'PENDING_REVIEW';
  const confidence = Number((0.76 + (input.ticketIndex % 17) / 100).toFixed(3));
  const references = input.docs.slice(0, 2).map((doc, referenceIndex) => ({
    organizationId: input.organizationId,
    knowledgeDocumentId: doc.id,
    excerpt: doc.body.slice(0, 220),
    relevanceScore: Number((0.9 - referenceIndex * 0.07 - (input.ticketIndex % 4) * 0.01).toFixed(3)),
  }));

  const suggestions: AiSuggestionSeed[] = [
    {
      organizationId: input.organizationId,
      requestedById: input.reporter.id,
      type: 'TRIAGE',
      status: triageStatus,
      model: 'mock-deterministic-v1',
      mock: true,
      recommendation: input.template.suggestedResponse,
      confidence,
      reasoning:
        'Seeded mock AI triage based on ticket language, matching knowledge articles and recurring incidents. Human review is still required.',
      payload: {
        summary: input.template.summary,
        category: input.category.name,
        priority: input.priority,
        department: categorySeedsBySlug[input.template.category].department,
        affectedTeam: input.team,
        location: input.location,
        sourceReferences: references.map((reference) => ({
          knowledgeDocumentId: reference.knowledgeDocumentId,
          relevanceScore: reference.relevanceScore,
        })),
      },
      reviewedById: reviewed ? input.reviewer.id : undefined,
      reviewedAt: reviewed ? clampPast(addMinutes(input.createdAt, 80 + (input.ticketIndex % 8) * 9), input.now) : undefined,
      createdAt: clampPast(addMinutes(input.createdAt, 8), input.now),
      references: { create: references },
    },
  ];

  if (input.status !== 'NEW' && input.status !== 'TRIAGED') {
    suggestions.push({
      organizationId: input.organizationId,
      requestedById: input.reviewer.id,
      type: 'RESPONSE',
      status: isTerminal(input.status) || input.ticketIndex % 3 !== 0 ? 'APPROVED' : 'PENDING_REVIEW',
      model: 'mock-deterministic-v1',
      mock: true,
      recommendation: `Draft reply: ${input.template.suggestedResponse}`,
      confidence: Number((confidence - 0.04).toFixed(3)),
      reasoning:
        'Seeded mock response draft that demonstrates the approval workflow without sending employee-visible messages automatically.',
      payload: {
        tone: 'clear and operational',
        humanApprovalRequired: true,
        nextBestAction: input.template.suggestedResponse,
      },
      reviewedById: isTerminal(input.status) || input.ticketIndex % 3 !== 0 ? input.reviewer.id : undefined,
      reviewedAt:
        isTerminal(input.status) || input.ticketIndex % 3 !== 0
          ? clampPast(addMinutes(input.createdAt, 130 + (input.ticketIndex % 7) * 11), input.now)
          : undefined,
      createdAt: clampPast(addMinutes(input.createdAt, 65), input.now),
      references: { create: references.slice(0, 1) },
    });
  }

  return suggestions;
}

type NotificationSeed = {
  organizationId: string;
  userId: string;
  ticketId: string;
  type: NotificationType;
  title: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
};

function notificationsFor(input: {
  organizationId: string;
  ticket: Ticket;
  reporter: User;
  agent: User | null;
  manager: User;
  isOverdue: boolean;
  createdAt: Date;
  now: Date;
}): NotificationSeed[] {
  const notifications: NotificationSeed[] = [
    {
      organizationId: input.organizationId,
      userId: input.reporter.id,
      ticketId: input.ticket.id,
      type: 'TICKET_CREATED',
      title: `Created ${input.ticket.number}`,
      body: input.ticket.title,
      readAt: input.ticket.status === 'NEW' ? null : clampPast(addMinutes(input.createdAt, 30), input.now),
      createdAt: clampPast(addMinutes(input.createdAt, 2), input.now),
    },
  ];

  if (input.agent) {
    notifications.push({
      organizationId: input.organizationId,
      userId: input.agent.id,
      ticketId: input.ticket.id,
      type: 'TICKET_ASSIGNED',
      title: `Assigned ${input.ticket.number}`,
      body: input.ticket.title,
      readAt: input.ticket.status === 'ASSIGNED' ? null : clampPast(addMinutes(input.createdAt, 90), input.now),
      createdAt: clampPast(addMinutes(input.createdAt, 40), input.now),
    });
  }

  if (input.isOverdue) {
    notifications.push({
      organizationId: input.organizationId,
      userId: input.manager.id,
      ticketId: input.ticket.id,
      type: 'SLA_WARNING',
      title: `SLA attention needed for ${input.ticket.number}`,
      body: `${input.ticket.title} is past its SLA deadline.`,
      readAt: null,
      createdAt: new Date(input.now.getTime() - (15 + input.ticket.number.length) * MINUTE_MS),
    });
  }

  return notifications;
}

async function resetDatabase() {
  await prisma.satisfactionRating.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.relatedTicket.deleteMany();
  await prisma.knowledgeReference.deleteMany();
  await prisma.aiSuggestion.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.ticketAssignment.deleteMany();
  await prisma.ticketStatusHistory.deleteMany();
  await prisma.ticketComment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.knowledgeChunk.deleteMany();
  await prisma.knowledgeDocument.deleteMany();
  await prisma.slaPolicy.deleteMany();
  await prisma.ticketCategory.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.role.deleteMany();
  await prisma.organization.deleteMany();
}

async function createRoles(organizationId: string): Promise<Record<RoleSlug, Role>> {
  const rolesBySlug = {} as Record<RoleSlug, Role>;

  for (const role of roleSeeds) {
    rolesBySlug[role.slug] = await prisma.role.create({
      data: {
        organizationId,
        name: role.name,
        slug: role.slug,
        description: role.description,
      },
    });
  }

  return rolesBySlug;
}

async function createDepartments(organizationId: string): Promise<Record<DepartmentName, Department>> {
  const departmentsByName = {} as Record<DepartmentName, Department>;

  for (const department of departments) {
    departmentsByName[department.name] = await prisma.department.create({
      data: {
        organizationId,
        name: department.name,
        code: department.code,
        description: department.description,
      },
    });
  }

  return departmentsByName;
}

async function createCategories(
  organizationId: string,
  departmentsByName: Record<DepartmentName, Department>,
): Promise<Record<CategorySlug, TicketCategory>> {
  const categoriesBySlug = {} as Record<CategorySlug, TicketCategory>;

  for (const category of categories) {
    categoriesBySlug[category.slug] = await prisma.ticketCategory.create({
      data: {
        organizationId,
        name: category.name,
        slug: category.slug,
        description: `${category.name} requests routed to ${category.department}.`,
        departmentId: departmentsByName[category.department].id,
      },
    });
  }

  return categoriesBySlug;
}

async function createSlaPolicies(organizationId: string) {
  for (const priority of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const) {
    const firstResponse = firstResponseMinutes(priority);
    await prisma.slaPolicy.create({
      data: {
        organizationId,
        priority,
        firstResponseMinutes: firstResponse,
        resolutionMinutes: resolutionMinutes(priority),
      },
    });
  }
}

async function createUsers(input: {
  organizationId: string;
  departmentsByName: Record<DepartmentName, Department>;
  rolesBySlug: Record<RoleSlug, Role>;
  passwordHashes: Record<RoleSlug, string>;
  users: UserSeed[];
  now: Date;
}) {
  const groups: Record<RoleSlug, User[]> = {
    administrator: [],
    manager: [],
    support_agent: [],
    employee: [],
  };

  for (const [index, userSeed] of input.users.entries()) {
    const user = await prisma.user.create({
      data: {
        organizationId: input.organizationId,
        roleId: input.rolesBySlug[userSeed.role].id,
        departmentId: input.departmentsByName[userSeed.department].id,
        fullName: userSeed.fullName,
        email: userSeed.email,
        passwordHash: input.passwordHashes[userSeed.role],
        title: userSeed.title,
        lastLoginAt: index % 4 === 0 ? null : new Date(input.now.getTime() - (index + 1) * 9 * HOUR_MS),
      },
    });
    groups[userSeed.role].push(user);
  }

  return groups;
}

async function createKnowledgeDocuments(input: {
  organizationId: string;
  departmentsByName: Record<DepartmentName, Department>;
  createdBy: User;
}) {
  const byDepartment = {} as Record<DepartmentName, KnowledgeDocument[]>;
  for (const department of departments) {
    byDepartment[department.name] = [];
  }

  const all: KnowledgeDocument[] = [];

  for (const [index, article] of knowledgeArticles.entries()) {
    const doc = await prisma.knowledgeDocument.create({
      data: {
        organizationId: input.organizationId,
        departmentId: input.departmentsByName[article.department].id,
        title: article.title,
        body: article.body,
        sourceType: 'manual',
        isPublished: true,
        publishedAt: new Date(Date.now() - (index + 10) * DAY_MS),
        createdById: input.createdBy.id,
        chunks: {
          create: [
            {
              organizationId: input.organizationId,
              heading: article.title,
              content: article.body,
              ordinal: 0,
            },
            {
              organizationId: input.organizationId,
              heading: `${article.title} - support workflow`,
              content: `${article.body} Record the troubleshooting evidence, communicate clearly with the employee, and keep private information in internal notes.`,
              ordinal: 1,
            },
          ],
        },
      },
    });

    byDepartment[article.department].push(doc);
    all.push(doc);

    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.createdBy.id,
        action: 'KNOWLEDGE_DOCUMENT_PUBLISHED',
        entityType: 'KnowledgeDocument',
        entityId: doc.id,
        metadata: { title: doc.title, department: article.department },
      },
    });
  }

  return { byDepartment, all };
}

function docsForCategory(
  categorySlug: CategorySlug,
  docsByDepartment: Record<DepartmentName, KnowledgeDocument[]>,
  allDocs: KnowledgeDocument[],
  index: number,
): KnowledgeDocument[] {
  const departmentName = categorySeedsBySlug[categorySlug].department;
  const departmentDocs = docsByDepartment[departmentName];
  const primary = pick(departmentDocs.length ? departmentDocs : allDocs, index);
  const secondary = pick(allDocs, index + 3);
  return primary.id === secondary.id ? [primary] : [primary, secondary];
}

async function createTicketAssignmentsAndActivity(input: {
  organizationId: string;
  ticket: Ticket;
  reporter: User;
  agent: User | null;
  manager: User;
  admin: User;
  createdAt: Date;
  resolvedAt: Date | null;
  deadline: Date;
  ticketIndex: number;
  now: Date;
}) {
  if (input.agent) {
    await prisma.ticketAssignment.create({
      data: {
        organizationId: input.organizationId,
        ticketId: input.ticket.id,
        agentId: input.agent.id,
        assignedById: input.manager.id,
        assignedAt: clampPast(addMinutes(input.createdAt, 35 + (input.ticketIndex % 12) * 8), input.now),
      },
    });
  }

  const notifications = notificationsFor({
    organizationId: input.organizationId,
    ticket: input.ticket,
    reporter: input.reporter,
    agent: input.agent,
    manager: input.manager,
    isOverdue: input.deadline.getTime() < input.now.getTime() && !isTerminal(input.ticket.status),
    createdAt: input.createdAt,
    now: input.now,
  });

  if (notifications.length) {
    await prisma.notification.createMany({ data: notifications });
  }

  if (isTerminal(input.ticket.status) && input.ticketIndex % 6 !== 0) {
    await prisma.satisfactionRating.create({
      data: {
        organizationId: input.organizationId,
        ticketId: input.ticket.id,
        userId: input.reporter.id,
        score: input.ticketIndex % 13 === 0 ? 3 : input.ticketIndex % 5 === 0 ? 4 : 5,
        comment:
          input.ticketIndex % 7 === 0
            ? 'The final answer was helpful, but I would have liked an earlier update.'
            : 'The support response was clear and easy to follow.',
        createdAt: input.resolvedAt ? clampPast(addMinutes(input.resolvedAt, 180), input.now) : input.now,
      },
    });
  }

  const auditRows: Prisma.AuditLogCreateManyInput[] = [
    {
      organizationId: input.organizationId,
      actorId: input.reporter.id,
      action: 'TICKET_CREATED',
      entityType: 'Ticket',
      entityId: input.ticket.id,
      metadata: { number: input.ticket.number, priority: input.ticket.priority },
      createdAt: input.createdAt,
    },
  ];

  if (input.agent) {
    auditRows.push({
      organizationId: input.organizationId,
      actorId: input.manager.id,
      action: 'TICKET_ASSIGNED',
      entityType: 'Ticket',
      entityId: input.ticket.id,
      metadata: { number: input.ticket.number, agentId: input.agent.id },
      createdAt: clampPast(addMinutes(input.createdAt, 35), input.now),
    });
  }

  if (input.ticket.aiConfidence && input.ticketIndex % 3 !== 0) {
    auditRows.push({
      organizationId: input.organizationId,
      actorId: input.agent?.id ?? input.manager.id,
      action: 'AI_SUGGESTION_REVIEWED',
      entityType: 'AiSuggestion',
      entityId: input.ticket.id,
      metadata: { number: input.ticket.number, humanApprovalRequired: true },
      createdAt: clampPast(addMinutes(input.createdAt, 110), input.now),
    });
  }

  if (input.deadline.getTime() < input.now.getTime() && !isTerminal(input.ticket.status)) {
    auditRows.push({
      organizationId: input.organizationId,
      actorId: null,
      action: 'SLA_BREACH_RECORDED',
      entityType: 'Ticket',
      entityId: input.ticket.id,
      metadata: { number: input.ticket.number, deadline: input.deadline.toISOString() },
      createdAt: new Date(input.now.getTime() - 10 * MINUTE_MS),
    });
  }

  await prisma.auditLog.createMany({ data: auditRows });
}

async function createTickets(input: {
  organizationName: string;
  organizationSlug: string;
  organizationId: string;
  ticketCount: number;
  categoriesBySlug: Record<CategorySlug, TicketCategory>;
  departmentsByName: Record<DepartmentName, Department>;
  docsByDepartment: Record<DepartmentName, KnowledgeDocument[]>;
  allDocs: KnowledgeDocument[];
  userGroups: Record<RoleSlug, User[]>;
  now: Date;
}) {
  const admin = pick(input.userGroups.administrator, 0);
  const manager = pick(input.userGroups.manager.length ? input.userGroups.manager : input.userGroups.administrator, 0);
  const employees = input.userGroups.employee.length ? input.userGroups.employee : [admin];
  const supportAgents = input.userGroups.support_agent.length ? input.userGroups.support_agent : [manager];
  const supportPool = [...supportAgents, ...input.userGroups.manager, ...input.userGroups.administrator];
  const recentByCategory = new Map<CategorySlug, Ticket[]>();
  const year = input.now.getFullYear();
  const prefix = input.organizationSlug.toUpperCase();

  for (let index = 0; index < input.ticketCount; index += 1) {
    const template = pick(ticketTemplates, index);
    const category = input.categoriesBySlug[template.category];
    const categorySeed = categorySeedsBySlug[template.category];
    const reporter = pick(employees, index + template.title.length);
    const status = chooseStatus(index);
    const priority = choosePriority(template.priority, index);
    const shouldAssign = status !== 'NEW' && (status !== 'TRIAGED' || index % 3 === 0);
    const agent = shouldAssign ? pick(supportPool, index + category.name.length) : null;
    const createdAt = createdAtFor(index, input.now);
    const deadline = slaDeadlineFor(status, priority, createdAt, index, input.now);
    const resolvedAt = resolvedAtFor(status, priority, createdAt, deadline, index, input.now);
    const firstResponseAt = firstResponseAtFor(status, priority, createdAt, index, input.now, Boolean(agent));
    const updatedAt = updatedAtFor(status, createdAt, resolvedAt, index, input.now);
    const location = pick(locations, index);
    const team = pick(teams, index + reporter.fullName.length);
    const impact = pick(impactStatements, index + category.name.length);
    const number = `${prefix}-${year}-${String(index + 1).padStart(5, '0')}`;
    const docs = docsForCategory(template.category, input.docsByDepartment, input.allDocs, index);
    const title = index < ticketTemplates.length ? template.title : `${template.title} - ${team}`;
    const description = [
      template.description,
      `Impact: ${impact}`,
      `Location: ${location}. Affected team: ${team}.`,
      `Demo context: seeded ticket ${index + 1} of ${input.ticketCount} for ${input.organizationName}.`,
    ].join('\n\n');

    const ticket = await prisma.ticket.create({
      data: {
        organizationId: input.organizationId,
        number,
        title,
        description,
        categoryId: category.id,
        departmentId: input.departmentsByName[categorySeed.department].id,
        reporterId: reporter.id,
        assignedAgentId: agent?.id,
        priority,
        status,
        createdAt,
        updatedAt,
        firstResponseAt,
        resolvedAt,
        slaDeadlineAt: deadline,
        aiSummary: `${template.summary}. ${impact}`,
        aiConfidence: Number((0.78 + (index % 15) / 100).toFixed(3)),
        statusHistory: {
          create: statusHistoryFor({
            organizationId: input.organizationId,
            status,
            createdAt,
            resolvedAt,
            reporter,
            agent,
            manager,
            admin,
            ticketIndex: index,
            now: input.now,
          }),
        },
        comments: {
          create: commentsFor({
            organizationId: input.organizationId,
            template,
            status,
            createdAt,
            reporter,
            agent,
            manager,
            location,
            ticketIndex: index,
            now: input.now,
          }),
        },
        aiSuggestions: {
          create: aiSuggestionsFor({
            organizationId: input.organizationId,
            template,
            category,
            status,
            priority,
            reporter,
            reviewer: agent ?? manager,
            docs,
            createdAt,
            ticketIndex: index,
            team,
            location,
            now: input.now,
          }),
        },
      },
    });

    const previousTickets = recentByCategory.get(template.category) ?? [];
    if (previousTickets.length && index % 3 !== 1) {
      const target = pick(previousTickets.slice(-8), index);
      await prisma.relatedTicket.create({
        data: {
          organizationId: input.organizationId,
          sourceTicketId: ticket.id,
          targetTicketId: target.id,
          relationType: index % 8 === 0 ? 'DUPLICATE' : 'RELATED',
          similarity: Number((0.72 + (index % 21) / 100).toFixed(3)),
          markedById: agent?.id ?? manager.id,
          createdAt: clampPast(addMinutes(createdAt, 100), input.now),
        },
      });
    }
    previousTickets.push(ticket);
    recentByCategory.set(template.category, previousTickets);

    await createTicketAssignmentsAndActivity({
      organizationId: input.organizationId,
      ticket,
      reporter,
      agent,
      manager,
      admin,
      createdAt,
      resolvedAt,
      deadline,
      ticketIndex: index,
      now: input.now,
    });
  }
}

async function seedOrganization(seed: OrganizationSeed, passwordHashes: Record<RoleSlug, string>, now: Date) {
  const organization = await prisma.organization.create({
    data: {
      name: seed.name,
      slug: seed.slug,
    },
  });

  const rolesBySlug = await createRoles(organization.id);
  const departmentsByName = await createDepartments(organization.id);
  const categoriesBySlug = await createCategories(organization.id, departmentsByName);
  await createSlaPolicies(organization.id);

  const userGroups = await createUsers({
    organizationId: organization.id,
    departmentsByName,
    rolesBySlug,
    passwordHashes,
    users: seed.users,
    now,
  });
  const admin = pick(userGroups.administrator, 0);
  const knowledge = await createKnowledgeDocuments({
    organizationId: organization.id,
    departmentsByName,
    createdBy: admin,
  });

  await createTickets({
    organizationName: seed.name,
    organizationSlug: seed.slug,
    organizationId: organization.id,
    ticketCount: seed.ticketCount,
    categoriesBySlug,
    departmentsByName,
    docsByDepartment: knowledge.byDepartment,
    allDocs: knowledge.all,
    userGroups,
    now,
  });

  await prisma.auditLog.createMany({
    data: [
      {
        organizationId: organization.id,
        actorId: admin.id,
        action: 'DEMO_ORGANIZATION_SEEDED',
        entityType: 'Organization',
        entityId: organization.id,
        metadata: {
          users: seed.users.length,
          tickets: seed.ticketCount,
          mockAi: true,
        },
      },
      {
        organizationId: organization.id,
        actorId: admin.id,
        action: 'SLA_POLICY_UPDATED',
        entityType: 'SlaPolicy',
        metadata: {
          priorities: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
        },
      },
    ],
  });

  console.log(`Seeded ${seed.name}: ${seed.users.length} users, ${seed.ticketCount} tickets.`);
}

async function main() {
  const now = new Date();
  await resetDatabase();
  const passwordHashes = await buildPasswordHashes();

  for (const organization of organizationSeeds) {
    await seedOrganization(organization, passwordHashes, now);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('OpsPilot demo seed data created successfully.');
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
