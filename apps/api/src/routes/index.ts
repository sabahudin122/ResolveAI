import { Router } from 'express';
import { analyticsRouter } from './analytics.routes.js';
import { attachmentsRouter } from './attachments.routes.js';
import { auditRouter } from './audit.routes.js';
import { authRouter } from './auth.routes.js';
import { knowledgeRouter } from './knowledge.routes.js';
import { metaRouter } from './meta.routes.js';
import { notificationsRouter } from './notifications.routes.js';
import { slaRouter } from './sla.routes.js';
import { ticketsRouter } from './tickets.routes.js';
import { usersRouter } from './users.routes.js';
import { authenticate } from '../middleware/authenticate.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use(authenticate);
apiRouter.use('/attachments', attachmentsRouter);
apiRouter.use('/meta', metaRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/tickets', ticketsRouter);
apiRouter.use('/knowledge', knowledgeRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/analytics', analyticsRouter);
apiRouter.use('/sla', slaRouter);
apiRouter.use('/audit', auditRouter);
