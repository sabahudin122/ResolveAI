import type { RoleSlug } from '@opspilot/shared';

export type AuthContext = {
  userId: string;
  organizationId: string;
  role: RoleSlug;
  email: string;
  fullName: string;
  departmentId: string | null;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}
