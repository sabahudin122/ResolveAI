import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { ApiError } from '../lib/errors.js';
import { hashPassword } from '../lib/passwords.js';
import { prisma } from '../lib/prisma.js';
import { ok } from '../lib/responses.js';
import { authorize, managementRoles } from '../middleware/authorize.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { recordAudit } from '../services/audit.service.js';

export const usersRouter = Router();

const createUserSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(10).max(128),
  roleId: z.string().uuid(),
  departmentId: z.string().uuid().nullable().optional(),
  title: z.string().max(120).optional(),
  isActive: z.boolean().default(true),
});

const updateUserSchema = createUserSchema
  .partial()
  .extend({
    password: z.string().min(10).max(128).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required.');

usersRouter.get(
  '/',
  authorize(managementRoles),
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const users = await prisma.user.findMany({
      where: { organizationId: auth.organizationId },
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        title: true,
        isActive: true,
        lastLoginAt: true,
        role: { select: { id: true, name: true, slug: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });
    ok(res, users);
  }),
);

usersRouter.post(
  '/',
  authorize(['administrator']),
  validate('body', createUserSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const [role, department] = await Promise.all([
      prisma.role.findFirst({ where: { id: req.body.roleId, organizationId: auth.organizationId } }),
      req.body.departmentId
        ? prisma.department.findFirst({
            where: { id: req.body.departmentId, organizationId: auth.organizationId },
          })
        : Promise.resolve(null),
    ]);

    if (!role) {
      throw new ApiError(404, 'ROLE_NOT_FOUND', 'Role was not found.');
    }
    if (req.body.departmentId && !department) {
      throw new ApiError(404, 'DEPARTMENT_NOT_FOUND', 'Department was not found.');
    }

    const user = await prisma.user.create({
      data: {
        organizationId: auth.organizationId,
        fullName: req.body.fullName,
        email: req.body.email.toLowerCase(),
        passwordHash: await hashPassword(req.body.password),
        roleId: role.id,
        departmentId: department?.id,
        title: req.body.title,
        isActive: req.body.isActive,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: { select: { name: true, slug: true } },
        department: { select: { name: true } },
      },
    });

    await recordAudit({
      organizationId: auth.organizationId,
      actorId: auth.userId,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
    });

    ok(res, user, 201);
  }),
);

usersRouter.patch(
  '/:id',
  authorize(['administrator']),
  validate('params', z.object({ id: z.string().uuid() })),
  validate('body', updateUserSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const target = await prisma.user.findFirst({
      where: { id: String(req.params.id), organizationId: auth.organizationId },
    });

    if (!target) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User was not found.');
    }

    const user = await prisma.user.update({
      where: { id: target.id },
      data: {
        fullName: req.body.fullName,
        email: req.body.email?.toLowerCase(),
        passwordHash: req.body.password ? await hashPassword(req.body.password) : undefined,
        roleId: req.body.roleId,
        departmentId: req.body.departmentId,
        title: req.body.title,
        isActive: req.body.isActive,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        role: { select: { name: true, slug: true } },
        department: { select: { name: true } },
      },
    });

    await recordAudit({
      organizationId: auth.organizationId,
      actorId: auth.userId,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: user.id,
    });

    ok(res, user);
  }),
);
