import { z } from 'zod';

export const roleSlugs = ['employee', 'support_agent', 'manager', 'administrator'] as const;
export const ticketStatuses = [
  'NEW',
  'TRIAGED',
  'ASSIGNED',
  'IN_PROGRESS',
  'WAITING_FOR_EMPLOYEE',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
] as const;
export const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export type RoleSlug = (typeof roleSlugs)[number];
export type TicketStatus = (typeof ticketStatuses)[number];
export type Priority = (typeof priorities)[number];

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const createTicketSchema = z.object({
  title: z.string().min(5).max(160),
  description: z.string().min(15).max(5000),
  categoryId: z.string().uuid().optional(),
  attachmentIds: z.array(z.string().uuid()).max(5).default([]),
});

export const ticketFilterSchema = z.object({
  status: z.enum(ticketStatuses).optional(),
  priority: z.enum(priorities).optional(),
  search: z.string().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const aiRecommendationSchema = z.object({
  recommendation: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  sourceReferences: z
    .array(
      z.object({
        title: z.string(),
        locator: z.string(),
        excerpt: z.string().max(500),
      }),
    )
    .default([]),
  mock: z.boolean().default(false),
});

export const apiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
