import type { Priority, RoleSlug, TicketStatus } from '@opspilot/shared';
import { ApiError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import type { AuthContext } from '../types/express.js';
import { createAiProvider } from './ai/index.js';
import { searchKnowledge } from './knowledge.service.js';
import { similarityScore } from './knowledge.service.js';
import { recordAudit } from './audit.service.js';

type CreateTicketInput = {
  title: string;
  description: string;
  categoryId?: string;
  attachmentIds?: string[];
};

type ImproveTicketDraftInput = {
  title: string;
  description: string;
};

type TicketFilters = {
  status?: TicketStatus;
  priority?: Priority;
  search?: string;
  page: number;
  pageSize: number;
};

type Actor = Pick<AuthContext, 'userId' | 'organizationId' | 'role' | 'departmentId'>;

function canAccessAll(role: RoleSlug): boolean {
  return role === 'support_agent' || role === 'manager' || role === 'administrator';
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

async function createTicketNumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.ticket.count({ where: { organizationId } });
  return `OPS-${year}-${String(count + 1).padStart(5, '0')}`;
}

async function resolveSlaDeadline(organizationId: string, priority: Priority, departmentId?: string | null) {
  const policy = await prisma.slaPolicy.findFirst({
    where: {
      organizationId,
      priority,
      isActive: true,
      OR: [{ departmentId: departmentId ?? undefined }, { departmentId: null }],
    },
    orderBy: { departmentId: 'desc' },
  });

  return policy ? addMinutes(new Date(), policy.firstResponseMinutes) : null;
}

export async function findSimilarTickets(
  organizationId: string,
  title: string,
  description: string,
  excludeTicketId?: string,
) {
  const tickets = await prisma.ticket.findMany({
    where: {
      organizationId,
      id: excludeTicketId ? { not: excludeTicketId } : undefined,
      status: { notIn: ['CLOSED'] },
    },
    select: {
      id: true,
      number: true,
      title: true,
      description: true,
      status: true,
      priority: true,
    },
    take: 100,
    orderBy: { createdAt: 'desc' },
  });

  const query = `${title} ${description}`;

  return tickets
    .map((ticket) => ({
      ...ticket,
      score: similarityScore(query, `${ticket.title} ${ticket.description}`),
    }))
    .filter((ticket) => ticket.score > 0.12)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
}

export async function createTicket(actor: Actor, input: CreateTicketInput) {
  const category = input.categoryId
    ? await prisma.ticketCategory.findFirst({
        where: {
          id: input.categoryId,
          organizationId: actor.organizationId,
        },
      })
    : null;

  if (input.categoryId && !category) {
    throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Ticket category was not found.');
  }

  const number = await createTicketNumber(actor.organizationId);
  const officialPriority: Priority = 'MEDIUM';
  const departmentId = category?.departmentId ?? null;
  const slaDeadlineAt = await resolveSlaDeadline(actor.organizationId, officialPriority, departmentId);
  const similarTickets = await findSimilarTickets(actor.organizationId, input.title, input.description);
  const knowledgeMatches = await searchKnowledge(
    actor.organizationId,
    `${input.title} ${input.description}`,
  );
  const aiProvider = createAiProvider();
  const ai = await aiProvider.analyzeTicket({
    title: input.title,
    description: input.description,
    knowledgeMatches,
    similarTickets: similarTickets.map((ticket) => ({
      number: ticket.number,
      title: ticket.title,
      score: ticket.score,
    })),
  });

  const ticket = await prisma.ticket.create({
    data: {
      organizationId: actor.organizationId,
      number,
      title: input.title,
      description: input.description,
      status: 'NEW',
      priority: officialPriority,
      categoryId: category?.id,
      departmentId,
      reporterId: actor.userId,
      slaDeadlineAt,
      aiSummary: ai.summary,
      aiConfidence: ai.confidence,
      statusHistory: {
        create: {
          organizationId: actor.organizationId,
          changedById: actor.userId,
          previousStatus: null,
          newStatus: 'NEW',
          reason: 'Ticket created',
        },
      },
      aiSuggestions: {
        create: {
          organizationId: actor.organizationId,
          requestedById: actor.userId,
          type: 'TRIAGE',
          model: ai.model,
          mock: ai.mock,
          recommendation: ai.suggestedResponse,
          confidence: ai.confidence,
          reasoning: ai.reasoning,
          payload: {
            summary: ai.summary,
            category: ai.category,
            priority: ai.priority,
            department: ai.department,
            suggestedResponse: ai.suggestedResponse,
            sourceReferences: ai.sourceReferences,
          },
          references: {
            create: knowledgeMatches.map((match) => ({
              organizationId: actor.organizationId,
              knowledgeDocumentId: match.id,
              excerpt: match.excerpt,
              relevanceScore: match.score,
            })),
          },
        },
      },
      relatedFrom: {
        create: similarTickets.map((similar) => ({
          organizationId: actor.organizationId,
          targetTicketId: similar.id,
          relationType: 'RELATED',
          similarity: similar.score,
        })),
      },
    },
    include: ticketDetailInclude,
  });

  if (input.attachmentIds?.length) {
    await prisma.attachment.updateMany({
      where: {
        organizationId: actor.organizationId,
        uploadedById: actor.userId,
        id: { in: input.attachmentIds },
        ticketId: null,
      },
      data: { ticketId: ticket.id },
    });
  }

  const supportUsers = await prisma.user.findMany({
    where: {
      organizationId: actor.organizationId,
      role: {
        slug: { in: ['support_agent', 'manager', 'administrator'] },
      },
      isActive: true,
    },
    select: { id: true },
  });

  if (supportUsers.length) {
    await prisma.notification.createMany({
      data: supportUsers.map((user) => ({
        organizationId: actor.organizationId,
        userId: user.id,
        ticketId: ticket.id,
        type: 'TICKET_CREATED',
        title: `New ticket ${ticket.number}`,
        body: ticket.title,
      })),
    });
  }

  await recordAudit({
    organizationId: actor.organizationId,
    actorId: actor.userId,
    action: 'TICKET_CREATED',
    entityType: 'Ticket',
    entityId: ticket.id,
    metadata: { number: ticket.number },
  });

  return ticket;
}

export async function improveTicketDraft(actor: Actor, input: ImproveTicketDraftInput) {
  const categories = await prisma.ticketCategory.findMany({
    where: { organizationId: actor.organizationId },
    include: {
      department: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  });
  const aiProvider = createAiProvider();

  return aiProvider.improveTicketDraft({
    title: input.title,
    description: input.description,
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      department: category.department?.name ?? null,
    })),
  });
}

const ticketDetailInclude = {
  reporter: { select: { id: true, fullName: true, email: true } },
  assignedAgent: { select: { id: true, fullName: true, email: true } },
  category: true,
  department: true,
  comments: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      author: { select: { id: true, fullName: true, role: { select: { slug: true } } } },
    },
  },
  statusHistory: {
    orderBy: { changedAt: 'asc' as const },
    include: {
      changedBy: { select: { id: true, fullName: true } },
    },
  },
  aiSuggestions: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      references: {
        include: {
          knowledgeDocument: { select: { id: true, title: true } },
        },
      },
    },
  },
  relatedFrom: {
    include: {
      targetTicket: {
        select: {
          id: true,
          number: true,
          title: true,
          status: true,
          priority: true,
        },
      },
    },
  },
};

export async function listTickets(actor: Actor, filters: TicketFilters) {
  const where = {
    organizationId: actor.organizationId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(canAccessAll(actor.role) ? {} : { reporterId: actor.userId }),
    ...(actor.role === 'manager' && actor.departmentId ? { departmentId: actor.departmentId } : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' as const } },
            { description: { contains: filters.search, mode: 'insensitive' as const } },
            { number: { contains: filters.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { updatedAt: 'desc' },
      include: {
        reporter: { select: { id: true, fullName: true } },
        assignedAgent: { select: { id: true, fullName: true } },
        category: true,
        department: true,
      },
    }),
    prisma.ticket.count({ where }),
  ]);

  return {
    items,
    page: filters.page,
    pageSize: filters.pageSize,
    total,
  };
}

export async function getTicket(actor: Actor, ticketId: string) {
  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      organizationId: actor.organizationId,
      ...(canAccessAll(actor.role) ? {} : { reporterId: actor.userId }),
      ...(actor.role === 'manager' && actor.departmentId ? { departmentId: actor.departmentId } : {}),
    },
    include: ticketDetailInclude,
  });

  if (!ticket) {
    throw new ApiError(404, 'TICKET_NOT_FOUND', 'Ticket was not found.');
  }

  return ticket;
}

export async function addComment(
  actor: Actor,
  ticketId: string,
  input: { body: string; visibility: 'PUBLIC' | 'INTERNAL' },
) {
  const ticket = await getTicket(actor, ticketId);

  if (input.visibility === 'INTERNAL' && actor.role === 'employee') {
    throw new ApiError(403, 'FORBIDDEN', 'Employees cannot create internal notes.');
  }

  const comment = await prisma.ticketComment.create({
    data: {
      organizationId: actor.organizationId,
      ticketId: ticket.id,
      authorId: actor.userId,
      body: input.body,
      visibility: input.visibility,
    },
  });

  if (actor.role !== 'employee' && input.visibility === 'PUBLIC' && !ticket.firstResponseAt) {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { firstResponseAt: new Date() },
    });
  }

  await recordAudit({
    organizationId: actor.organizationId,
    actorId: actor.userId,
    action: input.visibility === 'INTERNAL' ? 'INTERNAL_NOTE_ADDED' : 'COMMENT_ADDED',
    entityType: 'Ticket',
    entityId: ticket.id,
  });

  return comment;
}

export async function assignTicket(actor: Actor, ticketId: string, agentId: string) {
  const ticket = await getTicket(actor, ticketId);
  const agent = await prisma.user.findFirst({
    where: {
      id: agentId,
      organizationId: actor.organizationId,
      role: { slug: { in: ['support_agent', 'manager', 'administrator'] } },
      isActive: true,
    },
  });

  if (!agent) {
    throw new ApiError(404, 'AGENT_NOT_FOUND', 'Support agent was not found.');
  }

  const newStatus = ticket.status === 'NEW' || ticket.status === 'TRIAGED' ? 'ASSIGNED' : ticket.status;

  await prisma.ticketAssignment.create({
    data: {
      organizationId: actor.organizationId,
      ticketId: ticket.id,
      agentId,
      assignedById: actor.userId,
    },
  });

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      assignedAgentId: agentId,
      status: newStatus,
      statusHistory:
        newStatus !== ticket.status
          ? {
              create: {
                organizationId: actor.organizationId,
                changedById: actor.userId,
                previousStatus: ticket.status,
                newStatus,
                reason: 'Ticket assigned',
              },
            }
          : undefined,
    },
    include: ticketDetailInclude,
  });

  await prisma.notification.create({
    data: {
      organizationId: actor.organizationId,
      userId: agentId,
      ticketId: ticket.id,
      type: 'TICKET_ASSIGNED',
      title: `Assigned ${ticket.number}`,
      body: ticket.title,
    },
  });

  await recordAudit({
    organizationId: actor.organizationId,
    actorId: actor.userId,
    action: 'TICKET_ASSIGNED',
    entityType: 'Ticket',
    entityId: ticket.id,
    metadata: { agentId },
  });

  return updated;
}

export async function changeTicketStatus(
  actor: Actor,
  ticketId: string,
  input: { status: TicketStatus; reason?: string },
) {
  const ticket = await getTicket(actor, ticketId);

  if (actor.role === 'employee' && !['REOPENED', 'CLOSED'].includes(input.status)) {
    throw new ApiError(403, 'FORBIDDEN', 'Employees can only close or reopen their own tickets.');
  }

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: input.status,
      resolvedAt: input.status === 'RESOLVED' ? new Date() : ticket.resolvedAt,
      statusHistory: {
        create: {
          organizationId: actor.organizationId,
          changedById: actor.userId,
          previousStatus: ticket.status,
          newStatus: input.status,
          reason: input.reason,
        },
      },
    },
    include: ticketDetailInclude,
  });

  await recordAudit({
    organizationId: actor.organizationId,
    actorId: actor.userId,
    action: 'TICKET_STATUS_CHANGED',
    entityType: 'Ticket',
    entityId: ticket.id,
    metadata: {
      from: ticket.status,
      to: input.status,
    },
  });

  return updated;
}

export async function approveAiResponse(
  actor: Actor,
  ticketId: string,
  suggestionId: string,
  editedBody?: string,
) {
  const ticket = await getTicket(actor, ticketId);
  const suggestion = await prisma.aiSuggestion.findFirst({
    where: {
      id: suggestionId,
      organizationId: actor.organizationId,
      ticketId: ticket.id,
    },
  });

  if (!suggestion) {
    throw new ApiError(404, 'AI_SUGGESTION_NOT_FOUND', 'AI suggestion was not found.');
  }

  const body = editedBody?.trim() || suggestion.recommendation;

  const [comment] = await prisma.$transaction([
    prisma.ticketComment.create({
      data: {
        organizationId: actor.organizationId,
        ticketId: ticket.id,
        authorId: actor.userId,
        body,
        visibility: 'PUBLIC',
      },
    }),
    prisma.aiSuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: editedBody ? 'EDITED' : 'APPROVED',
        reviewedById: actor.userId,
        reviewedAt: new Date(),
      },
    }),
  ]);

  await recordAudit({
    organizationId: actor.organizationId,
    actorId: actor.userId,
    action: editedBody ? 'AI_SUGGESTION_EDITED' : 'AI_SUGGESTION_APPROVED',
    entityType: 'AiSuggestion',
    entityId: suggestion.id,
  });

  return comment;
}
