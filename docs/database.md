# Database

The database is normalized around organizations, users, support workflow entities, knowledge documents, AI suggestions, and audit history.

```mermaid
erDiagram
  Organization ||--o{ User : owns
  Organization ||--o{ Department : owns
  Organization ||--o{ Role : owns
  Organization ||--o{ Ticket : owns
  Role ||--o{ User : grants
  Department ||--o{ User : groups
  Department ||--o{ Ticket : routes
  TicketCategory ||--o{ Ticket : classifies
  User ||--o{ Ticket : reports
  User ||--o{ TicketComment : writes
  Ticket ||--o{ TicketComment : contains
  Ticket ||--o{ TicketStatusHistory : records
  Ticket ||--o{ TicketAssignment : assigns
  Ticket ||--o{ AiSuggestion : receives
  KnowledgeDocument ||--o{ KnowledgeChunk : splits
  KnowledgeDocument ||--o{ KnowledgeReference : cites
  AiSuggestion ||--o{ KnowledgeReference : uses
  Ticket ||--o{ Notification : triggers
  Ticket ||--o{ SatisfactionRating : rates
  User ||--o{ RefreshToken : owns
```

Every organization-owned table includes `organizationId`. Access-control tests should prove that a user from one organization cannot read or mutate records from another organization.

Schema commands:

```bash
npm run db:push -w apps/api
npm run db:seed -w apps/api
```
