import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import type { RoleSlug } from '@opspilot/shared';
import { env } from '../config/env.js';

export type AccessTokenPayload = {
  sub: string;
  org: string;
  role: RoleSlug;
  email: string;
};

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    subject: payload.sub,
    expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'],
  };

  return jwt.sign(
    {
      org: payload.org,
      role: payload.role,
      email: payload.email,
    },
    env.JWT_ACCESS_SECRET,
    options,
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (typeof decoded !== 'object' || !decoded.sub) {
    throw new Error('Invalid token payload');
  }

  return {
    sub: decoded.sub,
    org: String(decoded.org),
    role: decoded.role as RoleSlug,
    email: String(decoded.email),
  };
}

export function createOpaqueRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(`${env.JWT_REFRESH_SECRET}:${token}`).digest('hex');
}

export function refreshTokenExpiry(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_DAYS);
  return expiresAt;
}
