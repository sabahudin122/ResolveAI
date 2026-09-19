import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { ok } from '../lib/responses.js';
import { authorize, managementRoles } from '../middleware/authorize.js';
import { requireAuth } from '../middleware/require-auth.js';
import { getDashboardAnalytics } from '../services/analytics.service.js';

export const analyticsRouter = Router();

analyticsRouter.get(
  '/dashboard',
  authorize(managementRoles),
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    ok(res, await getDashboardAnalytics(auth.organizationId));
  }),
);
