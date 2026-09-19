import { Router } from 'express';
import { z } from 'zod';
import { loginSchema } from '@opspilot/shared';
import { asyncHandler } from '../lib/async-handler.js';
import { ok } from '../lib/responses.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAuth } from '../middleware/require-auth.js';
import { login, logout, refreshSession } from '../services/auth.service.js';

export const authRouter = Router();

authRouter.post(
  '/login',
  validate('body', loginSchema),
  asyncHandler(async (req, res) => {
    const session = await login({
      email: req.body.email,
      password: req.body.password,
      ipAddress: req.ip,
    });
    ok(res, session);
  }),
);

authRouter.post(
  '/refresh',
  validate('body', z.object({ refreshToken: z.string().min(20) })),
  asyncHandler(async (req, res) => {
    const session = await refreshSession(req.body.refreshToken);
    ok(res, session);
  }),
);

authRouter.post(
  '/logout',
  validate('body', z.object({ refreshToken: z.string().min(20) })),
  asyncHandler(async (req, res) => {
    await logout(req.body.refreshToken);
    ok(res, { message: 'Logged out' });
  }),
);

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    ok(res, { user: auth });
  }),
);
