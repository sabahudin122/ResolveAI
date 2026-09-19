import type { Request } from 'express';
import { ApiError } from '../lib/errors.js';
import type { AuthContext } from '../types/express.js';

export function requireAuth(req: Request): AuthContext {
  if (!req.auth) {
    throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication is required.');
  }

  return req.auth;
}
