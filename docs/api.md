# API

The API is versioned under `/api/v1`.

Swagger documentation is served at:

```text
http://localhost:4000/api-docs
```

Main route groups:

- `/auth` login, refresh, logout, current user
- `/users` administrator user management
- `/meta` roles, departments, categories
- `/tickets` ticket creation, queue, details, comments, assignment, status changes, AI approval
- `/knowledge` knowledge-base listing and search
- `/notifications` persisted notifications
- `/analytics/dashboard` management analytics
- `/sla` SLA policy configuration
- `/audit` administrator-only audit log

Response envelope:

```json
{
  "ok": true,
  "data": {}
}
```

Error envelope:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request data is invalid."
  }
}
```
