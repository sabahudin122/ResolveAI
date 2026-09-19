# Three-Minute Demo Script

1. Start on the login page and explain that OpsPilot is a multi-tenant internal support platform.
2. Log in as `employee1@acme.test`.
3. Create the prefilled VPN ticket.
4. Open the ticket detail page and point out the AI summary, recommended category, priority, department, sources, and related incidents.
5. Explain that AI suggestions are not official actions.
6. Log in as `agent1@acme.test`.
7. Open the support queue, select the new ticket, edit the AI response if needed, and approve it.
8. Change the ticket status to `RESOLVED`.
9. Log in as `manager@acme.test`.
10. Show the analytics dashboard with SLA, workload, category, priority, and AI acceptance metrics.

Interview talking points:

- Tenant isolation is enforced by `organizationId`.
- Business logic lives in services.
- AI provider is swappable.
- Mock AI makes the app demoable without paid services.
- Human approval keeps operational risk under control.
