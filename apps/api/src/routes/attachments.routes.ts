import crypto from 'node:crypto';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { Router } from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import { asyncHandler } from '../lib/async-handler.js';
import { ApiError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { ok } from '../lib/responses.js';
import { requireAuth } from '../middleware/require-auth.js';

export const attachmentsRouter = Router();

const allowedTypes = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
  'text/markdown',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

attachmentsRouter.post(
  '/',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const auth = requireAuth(req);

    if (!req.file) {
      throw new ApiError(400, 'FILE_REQUIRED', 'A file is required.');
    }

    if (!allowedTypes.has(req.file.mimetype)) {
      throw new ApiError(400, 'UNSUPPORTED_FILE_TYPE', 'Only PDF, text, Markdown, PNG and JPEG files are allowed.');
    }

    await mkdir(env.UPLOAD_DIR, { recursive: true });
    const extension = path.extname(req.file.originalname).toLowerCase();
    const storageKey = `${auth.organizationId}/${crypto.randomUUID()}${extension}`;
    const absolutePath = path.join(env.UPLOAD_DIR, storageKey);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, req.file.buffer);

    const attachment = await prisma.attachment.create({
      data: {
        organizationId: auth.organizationId,
        uploadedById: auth.userId,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        storageKey,
      },
    });

    ok(res, attachment, 201);
  }),
);
