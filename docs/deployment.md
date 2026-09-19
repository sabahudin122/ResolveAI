# Deployment

Production checklist:

1. Provision PostgreSQL.
2. Set environment variables with managed secrets.
3. Run Prisma migrations.
4. Build and start the API.
5. Build and serve the web app through a static server.
6. Terminate HTTPS at Nginx, a load balancer, or the hosting platform.
7. Configure scheduled PostgreSQL backups.
8. Monitor API errors, latency, failed logins, and SLA warning jobs.

Example Nginx reverse proxy:

```nginx
server {
  listen 443 ssl http2;
  server_name opspilot.example.com;

  ssl_certificate /etc/letsencrypt/live/opspilot.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/opspilot.example.com/privkey.pem;

  location / {
    root /var/www/opspilot;
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
  }

  location /socket.io/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

Backup example:

```bash
pg_dump "$DATABASE_URL" > opspilot-backup.sql
```

Restore example:

```bash
psql "$DATABASE_URL" < opspilot-backup.sql
```
