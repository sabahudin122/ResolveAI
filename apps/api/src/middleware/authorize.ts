import type { RequestHandler } from 'express';
import type { RoleSlug } from '@opspilot/shared';
import { ApiError } from '../lib/errors.js';

export function authorize(roles: RoleSlug[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new ApiError(401, 'AUTH_REQUIRED', 'Authentication is required.'));
      return;
    }

    if (!roles.includes(req.auth.role)) {
      next(new ApiError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
      return;
    }

    next();
  };
}

export const supportRoles: RoleSlug[] = ['support_agent', 'manager', 'administrator'];
export const managementRoles: RoleSlug[] = ['manager', 'administrator'];
export const adminRoles: RoleSlug[] = ['administrator'];
