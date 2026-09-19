import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { prisma } from '../lib/prisma.js';
import { ok } from '../lib/responses.js';
import { authorize } from '../middleware/authorize.js';
import { requireAuth } from '../middleware/require-auth.js';

export const auditRouter = Router();

auditRouter.get(
  '/',
  authorize(['administrator']),
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const logs = await prisma.auditLog.findMany({
      where: { organizationId: auth.organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { actor: { select: { id: true, fullName: true, email: true } } },
    });
    ok(res, logs);
  }),
);
