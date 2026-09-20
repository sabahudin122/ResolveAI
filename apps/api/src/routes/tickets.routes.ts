import { Router } from 'express';
import { z } from 'zod';
import {
  createTicketSchema,
  ticketFilterSchema,
  ticketStatuses,
  type Priority,
  type TicketQueue,
  type TicketStatus,
} from '@opspilot/shared';
import { asyncHandler } from '../lib/async-handler.js';
import { ok } from '../lib/responses.js';
import { authorize, supportRoles } from '../middleware/authorize.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import {
  addComment,
  approveAiResponse,
  assignTicket,
  changeTicketStatus,
  claimTicket,
  createTicket,
  getTicket,
  improveTicketDraft,
  listTickets,
} from '../services/ticket.service.js';

export const ticketsRouter = Router();

ticketsRouter.get(
  '/',
  validate('query', ticketFilterSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const tickets = await listTickets(
      auth,
      req.query as unknown as {
        status?: TicketStatus;
        priority?: Priority;
        assignment: TicketQueue;
        search?: string;
        page: number;
        pageSize: number;
      },
    );
    ok(res, tickets);
  }),
);

ticketsRouter.post(
  '/',
  validate('body', createTicketSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const ticket = await createTicket(auth, req.body);
    ok(res, ticket, 201);
  }),
);

ticketsRouter.post(
  '/draft/improve',
  validate(
    'body',
    z.object({
      title: z.string().min(1).max(500),
      description: z.string().min(1).max(5000),
    }),
  ),
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const draft = await improveTicketDraft(auth, req.body);
    ok(res, draft);
  }),
);

ticketsRouter.get(
  '/:id',
  validate('params', z.object({ id: z.string().uuid() })),
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const ticket = await getTicket(auth, String(req.params.id));
    ok(res, ticket);
  }),
);

ticketsRouter.post(
  '/:id/comments',
  validate('params', z.object({ id: z.string().uuid() })),
  validate(
    'body',
    z.object({
      body: z.string().min(1).max(5000),
      visibility: z.enum(['PUBLIC', 'INTERNAL']).default('PUBLIC'),
    }),
  ),
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const comment = await addComment(auth, String(req.params.id), req.body);
    ok(res, comment, 201);
  }),
);

ticketsRouter.patch(
  '/:id/status',
  validate('params', z.object({ id: z.string().uuid() })),
  validate(
    'body',
    z.object({
      status: z.enum(ticketStatuses),
      reason: z.string().max(300).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const ticket = await changeTicketStatus(auth, String(req.params.id), req.body);
    ok(res, ticket);
  }),
);

ticketsRouter.post(
  '/:id/claim',
  authorize(supportRoles),
  validate('params', z.object({ id: z.string().uuid() })),
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const ticket = await claimTicket(auth, String(req.params.id));
    ok(res, ticket);
  }),
);

ticketsRouter.post(
  '/:id/assign',
  authorize(supportRoles),
  validate('params', z.object({ id: z.string().uuid() })),
  validate('body', z.object({ agentId: z.string().uuid() })),
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const ticket = await assignTicket(auth, String(req.params.id), req.body.agentId);
    ok(res, ticket);
  }),
);

ticketsRouter.post(
  '/:id/ai-suggestions/:suggestionId/approve',
  authorize(supportRoles),
  validate('params', z.object({ id: z.string().uuid(), suggestionId: z.string().uuid() })),
  validate('body', z.object({ body: z.string().min(1).max(5000).optional() })),
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const comment = await approveAiResponse(
      auth,
      String(req.params.id),
      String(req.params.suggestionId),
      req.body.body,
    );
    ok(res, comment, 201);
  }),
);
