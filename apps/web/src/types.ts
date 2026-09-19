export type RoleSlug = 'employee' | 'support_agent' | 'manager' | 'administrator';
export type TicketStatus =
  | 'NEW'
  | 'TRIAGED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_EMPLOYEE'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type UserSession = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    organizationId: string;
    organizationName: string;
    fullName: string;
    email: string;
    role: RoleSlug;
    title?: string | null;
    departmentId?: string | null;
  };
};

export type Ticket = {
  id: string;
  number: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  aiSummary?: string | null;
  aiConfidence?: string | number | null;
  slaDeadlineAt?: string | null;
  createdAt: string;
  reporter?: { id: string; fullName: string; email?: string };
  assignedAgent?: { id: string; fullName: string; email?: string } | null;
  category?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
  comments?: Array<{
    id: string;
    body: string;
    visibility: 'PUBLIC' | 'INTERNAL' | 'AI_DRAFT';
    createdAt: string;
    author: { id: string; fullName: string; role?: { slug: RoleSlug } };
  }>;
  aiSuggestions?: Array<{
    id: string;
    status: string;
    mock: boolean;
    recommendation: string;
    confidence: string | number;
    reasoning: string;
    payload: {
      category?: string;
      priority?: Priority;
      department?: string;
      suggestedResponse?: string;
      sourceReferences?: Array<{ title: string; excerpt: string; locator: string }>;
    };
    references: Array<{
      knowledgeDocument: { id: string; title: string };
      excerpt: string;
      relevanceScore: string | number;
    }>;
  }>;
  relatedFrom?: Array<{
    id: string;
    similarity: string | number;
    targetTicket: Pick<Ticket, 'id' | 'number' | 'title' | 'status' | 'priority'>;
  }>;
  statusHistory?: Array<{
    id: string;
    previousStatus?: TicketStatus | null;
    newStatus: TicketStatus;
    reason?: string | null;
    changedAt: string;
    changedBy: { id: string; fullName: string };
  }>;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  department?: { id: string; name: string } | null;
};

export type TicketDraftSuggestion = {
  improvedTitle: string;
  improvedDescription: string;
  suggestedCategory: string;
  suggestedCategoryId?: string;
  suggestedPriority: Priority;
  confidence: number;
  changes: string[];
  reasoning: string;
  mock: boolean;
  model: string;
};

export type DashboardAnalytics = {
  openTickets: number;
  unassignedTickets: number;
  atRiskTickets: number;
  overdueTickets: number;
  ticketsByCategory: Array<{ name: string; value: number }>;
  ticketsByPriority: Array<{ name: string; value: number }>;
  ticketsByStatus: Array<{ name: string; value: number }>;
  averageResponseMinutes: number;
  averageResolutionMinutes: number;
  slaCompliancePercent: number;
  agentWorkload: Array<{ name: string; value: number }>;
  recurringIssueTrends?: Array<{ name: string; value: number }>;
  employeeSatisfaction: number;
  aiSuggestionAcceptanceRate: number;
};
