import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { prisma } from '../lib/prisma.js';
import { ok } from '../lib/responses.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';

export const notificationsRouter = Router();

notificationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const notifications = await prisma.notification.findMany({
      where: {
        organizationId: auth.organizationId,
        userId: auth.userId,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    ok(res, notifications);
  }),
);

notificationsRouter.patch(
  '/:id/read',
  validate('params', z.object({ id: z.string().uuid() })),
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const notification = await prisma.notification.updateMany({
      where: {
        id: String(req.params.id),
        organizationId: auth.organizationId,
        userId: auth.userId,
      },
      data: {
        readAt: new Date(),
      },
    });
    ok(res, notification);
  }),
);
