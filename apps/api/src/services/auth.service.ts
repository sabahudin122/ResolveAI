import type { RoleSlug } from '@opspilot/shared';
import { ApiError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { verifyPassword } from '../lib/passwords.js';
import {
  createOpaqueRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
  signAccessToken,
} from '../lib/tokens.js';
import { recordAudit } from './audit.service.js';

type LoginInput = {
  email: string;
  password: string;
  ipAddress?: string | null;
};

function publicUser(user: {
  id: string;
  organizationId: string;
  fullName: string;
  email: string;
  title: string | null;
  departmentId: string | null;
  role: { slug: string; name: string };
  organization: { name: string; slug: string };
}) {
  return {
    id: user.id,
    organizationId: user.organizationId,
    organizationName: user.organization.name,
    organizationSlug: user.organization.slug,
    fullName: user.fullName,
    email: user.email,
    title: user.title,
    departmentId: user.departmentId,
    role: user.role.slug,
    roleName: user.role.name,
  };
}

async function createSession(user: {
  id: string;
  organizationId: string;
  email: string;
  role: { slug: string };
}) {
  const accessToken = signAccessToken({
    sub: user.id,
    org: user.organizationId,
      role: user.role.slug as RoleSlug,
    email: user.email,
  });
  const refreshToken = createOpaqueRefreshToken();

  await prisma.refreshToken.create({
    data: {
      organizationId: user.organizationId,
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshTokenExpiry(),
    },
  });

  return { accessToken, refreshToken };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findFirst({
    where: {
      email: input.email.toLowerCase(),
      isActive: true,
    },
    include: {
      role: true,
      organization: true,
    },
  });

  if (!user) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const passwordValid = await verifyPassword(input.password, user.passwordHash);

  if (!passwordValid) {
    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: 'LOGIN_FAILURE',
      entityType: 'User',
      entityId: user.id,
      ipAddress: input.ipAddress,
    });
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await recordAudit({
    organizationId: user.organizationId,
    actorId: user.id,
    action: 'LOGIN_SUCCESS',
    entityType: 'User',
    entityId: user.id,
    ipAddress: input.ipAddress,
  });

  const session = await createSession(user);

  return {
    user: publicUser(user),
    ...session,
  };
}

export async function refreshSession(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          role: true,
          organization: true,
        },
      },
    },
  });

  if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.');
  }

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  const session = await createSession(storedToken.user);

  return {
    user: publicUser(storedToken.user),
    ...session,
  };
}

export async function logout(refreshToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: {
      tokenHash: hashRefreshToken(refreshToken),
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}
