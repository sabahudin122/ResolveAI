import type { RequestHandler } from 'express';
import { ApiError } from '../lib/errors.js';
import { verifyAccessToken } from '../lib/tokens.js';
import { prisma } from '../lib/prisma.js';

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    const [scheme, token] = header?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication is required.');
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findFirst({
      where: {
        id: payload.sub,
        organizationId: payload.org,
        isActive: true,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication is required.');
    }

    req.auth = {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role.slug as typeof payload.role,
      email: user.email,
      fullName: user.fullName,
      departmentId: user.departmentId,
    };

    next();
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(401, 'AUTH_REQUIRED', 'Authentication is required.'));
  }
};
