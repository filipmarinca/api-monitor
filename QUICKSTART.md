# Quick Start Guide

Get API Monitor running in 5 minutes.

## Prerequisites
- Docker and Docker Compose installed
- 4GB+ RAM available
- Ports 3001, 5173, 5432, 6379 available

## Installation

1. **Clone the repository**
```bash
git clone https://github.com/filipmarinca/api-monitor.git
cd api-monitor
```

2. **Start all services**
```bash
docker-compose up -d
```

3. **Wait for services to be ready** (30-60 seconds)
```bash
docker-compose logs -f server
# Wait for "Server running on http://localhost:3001"
```

4. **Initialize database**
```bash
docker-compose exec server npx prisma migrate deploy
docker-compose exec server npm run prisma:seed
```

5. **Access the dashboard**
```
URL: http://localhost:5173
Email: demo@apimonitor.dev
Password: demo123
```

## What You Get

After seeding, you'll have:
- 5 pre-configured monitors (Google, GitHub API, JSONPlaceholder, etc.)
- Demo workspace with sample data
- Public status page at: http://localhost:3001/api/status-pages/demo-status
- API documentation at: http://localhost:3001/api-docs
- Your API key displayed in the dashboard

## First Steps

1. **View Monitors**: Dashboard shows all active monitors with real-time status
2. **Check Details**: Click any monitor to see response time charts and uptime stats
3. **Create Alert Rule**: Go to Alerts tab and set up email/webhook notifications
4. **Test Integration**: Use the Postman collection or API key for programmatic access

## Common Commands

```bash
# View logs
docker-compose logs -f server

# Restart services
docker-compose restart

# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# Access database
docker-compose exec postgres psql -U apimonitor -d apimonitor

# Access Redis
docker-compose exec redis redis-cli
```

## Next Steps

- Configure SMTP for email alerts (edit server/.env)
- Add your own monitors
- Set up Slack/Discord webhooks
- Create custom status pages
- Explore the API with Postman collection

## Troubleshooting

**Port conflicts**: Change ports in docker-compose.yml
**Database errors**: Run `docker-compose down -v` to reset volumes
**Can't login**: Check server logs and ensure seed ran successfully

See README.md for full documentation.
