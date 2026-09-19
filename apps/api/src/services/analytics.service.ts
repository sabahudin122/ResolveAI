import { prisma } from '../lib/prisma.js';

function average(values: number[]): number {
  if (!values.length) {
    return 0;
  }
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function countBy<T extends string>(items: T[]): Array<{ name: T; value: number }> {
  const counts = new Map<T, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, value]) => ({ name, value }));
}

export async function getDashboardAnalytics(organizationId: string) {
  const [tickets, ratings, aiSuggestions, users] = await Promise.all([
    prisma.ticket.findMany({
      where: { organizationId },
      include: {
        category: true,
        assignedAgent: { select: { id: true, fullName: true } },
      },
    }),
    prisma.satisfactionRating.findMany({ where: { organizationId } }),
    prisma.aiSuggestion.findMany({ where: { organizationId } }),
    prisma.user.findMany({
      where: {
        organizationId,
        role: { slug: { in: ['support_agent', 'manager'] } },
      },
      select: { id: true, fullName: true },
    }),
  ]);

  const now = Date.now();
  const responseTimes = tickets
    .filter((ticket) => ticket.firstResponseAt)
    .map((ticket) => Math.round((ticket.firstResponseAt!.getTime() - ticket.createdAt.getTime()) / 60_000));
  const resolutionTimes = tickets
    .filter((ticket) => ticket.resolvedAt)
    .map((ticket) => Math.round((ticket.resolvedAt!.getTime() - ticket.createdAt.getTime()) / 60_000));
  const closedTickets = tickets.filter((ticket) => ticket.status === 'RESOLVED' || ticket.status === 'CLOSED');
  const onTimeTickets = closedTickets.filter(
    (ticket) => !ticket.slaDeadlineAt || ticket.resolvedAt! <= ticket.slaDeadlineAt,
  );
  const acceptedAi = aiSuggestions.filter(
    (suggestion) => suggestion.status === 'APPROVED' || suggestion.status === 'EDITED',
  );

  const workload = users.map((user) => ({
    name: user.fullName,
    value: tickets.filter(
      (ticket) => ticket.assignedAgentId === user.id && !['RESOLVED', 'CLOSED'].includes(ticket.status),
    ).length,
  }));

  return {
    openTickets: tickets.filter((ticket) => !['RESOLVED', 'CLOSED'].includes(ticket.status)).length,
    unassignedTickets: tickets.filter((ticket) => !ticket.assignedAgentId).length,
    atRiskTickets: tickets.filter((ticket) => {
      if (!ticket.slaDeadlineAt || ['RESOLVED', 'CLOSED'].includes(ticket.status)) {
        return false;
      }
      const minutesLeft = (ticket.slaDeadlineAt.getTime() - now) / 60_000;
      return minutesLeft > 0 && minutesLeft <= 60;
    }).length,
    overdueTickets: tickets.filter(
      (ticket) =>
        ticket.slaDeadlineAt &&
        ticket.slaDeadlineAt.getTime() < now &&
        !['RESOLVED', 'CLOSED'].includes(ticket.status),
    ).length,
    ticketsByCategory: countBy(tickets.map((ticket) => ticket.category?.name ?? 'Uncategorized')),
    ticketsByPriority: countBy(tickets.map((ticket) => ticket.priority)),
    ticketsByStatus: countBy(tickets.map((ticket) => ticket.status)),
    averageResponseMinutes: average(responseTimes),
    averageResolutionMinutes: average(resolutionTimes),
    slaCompliancePercent: closedTickets.length
      ? Math.round((onTimeTickets.length / closedTickets.length) * 100)
      : 100,
    agentWorkload: workload,
    recurringIssueTrends: countBy(
      tickets
        .map((ticket) => ticket.aiSummary?.split(' ').slice(0, 3).join(' ') ?? ticket.title)
        .slice(0, 12),
    ),
    employeeSatisfaction: ratings.length
      ? Number((ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length).toFixed(1))
      : 0,
    aiSuggestionAcceptanceRate: aiSuggestions.length
      ? Math.round((acceptedAi.length / aiSuggestions.length) * 100)
      : 0,
  };
}
