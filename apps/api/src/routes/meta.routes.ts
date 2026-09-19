import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { prisma } from '../lib/prisma.js';
import { ok } from '../lib/responses.js';
import { authorize, managementRoles } from '../middleware/authorize.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { recordAudit } from '../services/audit.service.js';

export const metaRouter = Router();

metaRouter.get(
  '/roles',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const roles = await prisma.role.findMany({
      where: { organizationId: auth.organizationId },
      orderBy: { name: 'asc' },
    });
    ok(res, roles);
  }),
);

metaRouter.get(
  '/departments',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const departments = await prisma.department.findMany({
      where: { organizationId: auth.organizationId },
      orderBy: { name: 'asc' },
    });
    ok(res, departments);
  }),
);

metaRouter.post(
  '/departments',
  authorize(['administrator']),
  validate(
    'body',
    z.object({
      name: z.string().min(2).max(120),
      code: z.string().min(2).max(20),
      description: z.string().max(300).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const department = await prisma.department.create({
      data: {
        organizationId: auth.organizationId,
        name: req.body.name,
        code: req.body.code.toUpperCase(),
        description: req.body.description,
      },
    });
    await recordAudit({
      organizationId: auth.organizationId,
      actorId: auth.userId,
      action: 'DEPARTMENT_CREATED',
      entityType: 'Department',
      entityId: department.id,
    });
    ok(res, department, 201);
  }),
);

metaRouter.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const categories = await prisma.ticketCategory.findMany({
      where: { organizationId: auth.organizationId },
      include: { department: true },
      orderBy: { name: 'asc' },
    });
    ok(res, categories);
  }),
);

metaRouter.post(
  '/categories',
  authorize(managementRoles),
  validate(
    'body',
    z.object({
      name: z.string().min(2).max(120),
      slug: z.string().min(2).max(80),
      description: z.string().max(300).optional(),
      departmentId: z.string().uuid().nullable().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const category = await prisma.ticketCategory.create({
      data: {
        organizationId: auth.organizationId,
        name: req.body.name,
        slug: req.body.slug,
        description: req.body.description,
        departmentId: req.body.departmentId,
      },
    });
    ok(res, category, 201);
  }),
);
