import { Router } from 'express';
import { z } from 'zod';
import { priorities } from '@opspilot/shared';
import { asyncHandler } from '../lib/async-handler.js';
import { prisma } from '../lib/prisma.js';
import { ok } from '../lib/responses.js';
import { authorize, managementRoles } from '../middleware/authorize.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { recordAudit } from '../services/audit.service.js';

export const slaRouter = Router();

slaRouter.get(
  '/',
  authorize(managementRoles),
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const policies = await prisma.slaPolicy.findMany({
      where: { organizationId: auth.organizationId },
      include: { department: true },
      orderBy: [{ departmentId: 'asc' }, { priority: 'asc' }],
    });
    ok(res, policies);
  }),
);

slaRouter.put(
  '/',
  authorize(['administrator']),
  validate(
    'body',
    z.object({
      departmentId: z.string().uuid().nullable().optional(),
      priority: z.enum(priorities),
      firstResponseMinutes: z.number().int().positive(),
      resolutionMinutes: z.number().int().positive(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const policy = await prisma.slaPolicy.upsert({
      where: {
        organizationId_departmentId_priority: {
          organizationId: auth.organizationId,
          departmentId: req.body.departmentId ?? null,
          priority: req.body.priority,
        },
      },
      update: {
        firstResponseMinutes: req.body.firstResponseMinutes,
        resolutionMinutes: req.body.resolutionMinutes,
      },
      create: {
        organizationId: auth.organizationId,
        departmentId: req.body.departmentId,
        priority: req.body.priority,
        firstResponseMinutes: req.body.firstResponseMinutes,
        resolutionMinutes: req.body.resolutionMinutes,
      },
    });

    await recordAudit({
      organizationId: auth.organizationId,
      actorId: auth.userId,
      action: 'SLA_POLICY_UPDATED',
      entityType: 'SlaPolicy',
      entityId: policy.id,
    });

    ok(res, policy);
  }),
);
