# Security

OpsPilot implements the following security controls:

- Short-lived JWT access tokens
- Rotating opaque refresh tokens stored as hashes
- bcrypt password hashing
- Role-based authorization middleware
- Organization-level filtering on all tenant-owned records
- Zod validation at API boundaries
- Helmet security headers
- Rate limiting
- CORS configuration
- File upload type and size validation
- Audit logging for sensitive actions
- Generic authentication error messages
- `.env` files ignored by Git

AI guardrails:

- AI suggestions are stored separately from official ticket values.
- AI cannot close tickets.
- AI cannot assign employees.
- AI cannot send employee-facing replies.
- AI cannot delete data.
- Support agents must approve or edit AI responses before sending.

Production hardening recommendations:

- Add TOTP enrollment.
- Add account lockout and administrator unlock.
- Use managed secrets.
- Add centralized logging.
- Add object storage malware scanning for attachments.
- Add integration tests for unauthorized object access.
