import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { prisma } from '../lib/prisma.js';
import { ok } from '../lib/responses.js';
import { authorize, managementRoles } from '../middleware/authorize.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { searchKnowledge } from '../services/knowledge.service.js';
import { recordAudit } from '../services/audit.service.js';

export const knowledgeRouter = Router();

knowledgeRouter.get(
  '/',
  validate('query', z.object({ search: z.string().max(120).optional() })),
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    if (search) {
      ok(res, await searchKnowledge(auth.organizationId, search));
      return;
    }

    const docs = await prisma.knowledgeDocument.findMany({
      where: {
        organizationId: auth.organizationId,
        OR: [{ isPublished: true }, { createdById: auth.userId }],
      },
      include: { department: true },
      orderBy: { updatedAt: 'desc' },
    });
    ok(res, docs);
  }),
);

knowledgeRouter.post(
  '/',
  authorize(managementRoles),
  validate(
    'body',
    z.object({
      title: z.string().min(4).max(160),
      body: z.string().min(20),
      departmentId: z.string().uuid().nullable().optional(),
      isPublished: z.boolean().default(false),
    }),
  ),
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const sections = req.body.body
      .split(/\n#{1,3}\s+/)
      .map((section: string) => section.trim())
      .filter(Boolean);

    const doc = await prisma.knowledgeDocument.create({
      data: {
        organizationId: auth.organizationId,
        title: req.body.title,
        body: req.body.body,
        departmentId: req.body.departmentId,
        createdById: auth.userId,
        isPublished: req.body.isPublished,
        publishedAt: req.body.isPublished ? new Date() : null,
        chunks: {
          create: (sections.length ? sections : [req.body.body]).map((section: string, index: number) => ({
            organizationId: auth.organizationId,
            content: section,
            ordinal: index,
          })),
        },
      },
      include: { chunks: true },
    });

    await recordAudit({
      organizationId: auth.organizationId,
      actorId: auth.userId,
      action: req.body.isPublished ? 'KNOWLEDGE_DOCUMENT_PUBLISHED' : 'KNOWLEDGE_DOCUMENT_CREATED',
      entityType: 'KnowledgeDocument',
      entityId: doc.id,
    });

    ok(res, doc, 201);
  }),
);
