# API Monitor

Comprehensive API monitoring and analytics platform with real-time alerts, uptime tracking, and performance analytics.

## Features

### Monitoring
- HTTP endpoint monitoring (GET/POST/PUT/DELETE/PATCH/HEAD/OPTIONS)
- Response time tracking with millisecond precision
- Uptime/downtime detection with configurable thresholds
- Status code validation
- SSL certificate expiry monitoring
- Custom headers and authentication support
- Response validation (JSON schema, regex patterns)
- Multi-region checks (us-east, eu-west, ap-south)
- Configurable check intervals (1min to 1hour)
- Automatic incident detection and recovery

### Analytics Dashboard
- Real-time status overview with live updates
- Response time charts (1h/24h/7d/30d views)
- Uptime percentage with SLA tracking
- Error rate analysis and trends
- Historical data visualization
- Incident timeline with severity levels
- Performance trends and anomaly detection
- Custom dashboards per workspace

### Alerts & Notifications
- Email notifications via SMTP
- Webhook integrations (Slack, Discord, Teams, custom)
- SMS alerts via Twilio
- Configurable alert rules (response time, status codes, SSL)
- Consecutive failure thresholds
- Alert grouping to reduce noise
- Incident management workflow

### API & Integration
- RESTful API with JWT authentication
- API key management for programmatic access
- Rate limiting with Redis
- Real-time updates via Socket.io
- OpenAPI/Swagger documentation
- Prometheus metrics export
- Health check endpoints

### Technical Stack
- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis for rate limiting and caching
- **Queue**: Bull for async job processing
- **Real-time**: Socket.io for live updates
- **Metrics**: Prometheus client
- **Containerization**: Docker Compose

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16+
- Redis 7+

### Development Setup

1. **Clone and install dependencies**
```bash
git clone https://github.com/filipmarinca/api-monitor.git
cd api-monitor

# Install server dependencies
cd server
npm install

# Install dashboard dependencies
cd ../dashboard
npm install
cd ..
```

2. **Configure environment**
```bash
# Server configuration
cp server/.env.example server/.env
# Edit server/.env with your credentials

# Dashboard configuration
cp dashboard/.env.example dashboard/.env
```

3. **Start with Docker Compose**
```bash
docker-compose up -d
```

4. **Initialize database**
```bash
cd server
npm run prisma:migrate
npm run prisma:seed
```

5. **Access the application**
- Dashboard: http://localhost:5173
- API: http://localhost:3001
- API Docs: http://localhost:3001/api-docs
- Prometheus Metrics: http://localhost:3001/metrics

### Demo Credentials
```
Email: demo@apimonitor.dev
Password: demo123
```

## Manual Development Setup

### Start PostgreSQL
```bash
docker run -d \
  --name api-monitor-db \
  -e POSTGRES_USER=apimonitor \
  -e POSTGRES_PASSWORD=apimonitor \
  -e POSTGRES_DB=apimonitor \
  -p 5432:5432 \
  postgres:16-alpine
```

### Start Redis
```bash
docker run -d \
  --name api-monitor-redis \
  -p 6379:6379 \
  redis:7-alpine
```

### Start Server
```bash
cd server
npm run dev
```

### Start Dashboard
```bash
cd dashboard
npm run dev
```

## API Documentation

### Authentication

#### Register
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}

# Response includes JWT token
```

### Monitors

#### Create Monitor
```bash
POST /api/monitors
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My API",
  "url": "https://api.example.com/health",
  "method": "GET",
  "interval": 300000,
  "timeout": 30000,
  "expectedStatus": 200,
  "regions": ["us-east", "eu-west"]
}
```

#### Get All Monitors
```bash
GET /api/monitors
Authorization: Bearer <token>
```

#### Trigger Manual Check
```bash
POST /api/monitors/{id}/trigger
Authorization: Bearer <token>
```

### Checks & Stats

#### Get Check History
```bash
GET /api/checks?monitorId={id}&limit=100
Authorization: Bearer <token>
```

#### Get Statistics
```bash
GET /api/checks/stats?monitorId={id}&period=24h
Authorization: Bearer <token>

# Periods: 1h, 24h, 7d, 30d
```

### Alert Rules

#### Create Alert Rule
```bash
POST /api/alerts/rules
Authorization: Bearer <token>
Content-Type: application/json

{
  "monitorId": "monitor-uuid",
  "name": "High Response Time Alert",
  "condition": "SLOW",
  "threshold": 1000,
  "consecutiveFails": 3,
  "email": true,
  "webhook": true,
  "webhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
}
```

### Using API Keys

```bash
GET /api/monitors
X-API-Key: sk_your_api_key_here
```

## SDK Examples

### Node.js
```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'X-API-Key': 'your-api-key',
  },
});

// Create monitor
const monitor = await client.post('/monitors', {
  name: 'My Service',
  url: 'https://api.example.com/health',
  method: 'GET',
  interval: 60000,
});

// Get monitor stats
const stats = await client.get('/checks/stats', {
  params: { monitorId: monitor.data.id, period: '24h' },
});

console.log('Uptime:', stats.data.uptime);
console.log('Avg Response:', stats.data.responseTime.avg);
```

### Python
```python
import requests

API_URL = 'http://localhost:3001/api'
API_KEY = 'your-api-key'

headers = {'X-API-Key': API_KEY}

# Create monitor
response = requests.post(f'{API_URL}/monitors', 
    headers=headers,
    json={
        'name': 'My Service',
        'url': 'https://api.example.com/health',
        'method': 'GET',
        'interval': 60000,
    }
)

monitor = response.json()

# Get stats
stats = requests.get(f'{API_URL}/checks/stats',
    headers=headers,
    params={'monitorId': monitor['id'], 'period': '24h'}
).json()

print(f"Uptime: {stats['uptime']}%")
print(f"Avg Response: {stats['responseTime']['avg']}ms")
```

### cURL
```bash
# Create monitor
curl -X POST http://localhost:3001/api/monitors \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API",
    "url": "https://api.example.com/health",
    "method": "GET",
    "interval": 300000
  }'

# Get monitors
curl http://localhost:3001/api/monitors \
  -H "X-API-Key: your-api-key"

# Get stats
curl "http://localhost:3001/api/checks/stats?monitorId=<id>&period=24h" \
  -H "X-API-Key: your-api-key"
```

## Webhook Integration Examples

### Slack
```bash
POST /api/alerts/rules
{
  "monitorId": "monitor-uuid",
  "name": "Slack Alert",
  "condition": "DOWN",
  "webhook": true,
  "webhookUrl": "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX"
}
```

### Discord
```bash
POST /api/alerts/rules
{
  "monitorId": "monitor-uuid",
  "name": "Discord Alert",
  "condition": "DOWN",
  "webhook": true,
  "webhookUrl": "https://discord.com/api/webhooks/123456789/abcdefgh"
}
```

### Custom Webhook Payload
```json
{
  "type": "monitor.alert",
  "monitor": {
    "id": "monitor-uuid",
    "name": "My API",
    "url": "https://api.example.com"
  },
  "message": "Monitor is down: Connection timeout",
  "timestamp": "2024-02-24T12:00:00Z"
}
```

## Monitoring SDKs

Pre-built monitors are included in seed data:
- Google Homepage (https://www.google.com)
- JSONPlaceholder API (https://jsonplaceholder.typicode.com)
- GitHub API (https://api.github.com)
- HTTP Status Test endpoints

## Architecture

### Backend Components
- **Express Server**: REST API and WebSocket server
- **Prisma**: Type-safe database ORM
- **Bull Queue**: Async job processing for monitor checks
- **Redis**: Caching, rate limiting, and job queue backend
- **Socket.io**: Real-time updates to connected clients
- **Prometheus**: Metrics collection and export

### Frontend Components
- **React + TypeScript**: Type-safe UI components
- **Vite**: Fast build tool and dev server
- **TailwindCSS**: Utility-first styling
- **Recharts**: Data visualization
- **Zustand**: Lightweight state management
- **React Router**: Client-side routing

### Database Schema
- **Users**: Authentication and authorization
- **Workspaces**: Multi-tenancy support
- **Monitors**: API endpoint configurations
- **Checks**: Historical check results
- **Incidents**: Failure tracking and management
- **AlertRules**: Notification configurations
- **Alerts**: Sent notification history

## Monitoring Best Practices

1. **Set appropriate intervals**: Balance between freshness and load (5-15 minutes for most APIs)
2. **Configure timeouts**: Set timeouts slightly higher than expected response time
3. **Use regions wisely**: Monitor from regions closest to your users
4. **Alert thresholds**: Use consecutive failures (3+) to avoid false positives
5. **SSL monitoring**: Enable SSL validation and set expiry alerts (30 days)
6. **Response validation**: Use JSON schema for critical APIs
7. **Rate limiting**: Respect API rate limits when setting check intervals

## Production Deployment

### Environment Variables
```bash
# Server
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_HOST=your-redis-host
JWT_SECRET=generate-strong-random-secret
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
CORS_ORIGIN=https://your-domain.com
```

### Database Migrations
```bash
cd server
npx prisma migrate deploy
npx prisma generate
```

### Security Checklist
- Change default JWT secret
- Use strong database passwords
- Enable SSL/TLS for database connections
- Configure CORS for your domain
- Set up firewall rules
- Use environment-specific secrets
- Enable rate limiting
- Implement IP whitelisting for sensitive endpoints
- Regular security updates

## Monitoring the Monitor

Health check endpoint: `GET /health`
```json
{
  "status": "healthy",
  "timestamp": "2024-02-24T12:00:00Z",
  "services": {
    "database": "up",
    "redis": "up"
  }
}
```

Prometheus metrics: `GET /metrics`

## Performance Optimization

- Redis caching for frequently accessed data
- Database query optimization with indexes
- Connection pooling for PostgreSQL
- Job queue concurrency limits
- Response body size limits (10KB)
- Automatic cleanup of old check data (configurable retention)

## Troubleshooting

### Database connection issues
```bash
# Check PostgreSQL
docker-compose ps postgres
docker-compose logs postgres

# Test connection
docker exec -it api-monitor-db psql -U apimonitor -d apimonitor
```

### Redis connection issues
```bash
# Check Redis
docker-compose ps redis
docker-compose logs redis

# Test connection
docker exec -it api-monitor-redis redis-cli ping
```

### Monitor checks not running
```bash
# Check server logs
docker-compose logs server

# Check Bull queue
# Access Redis and check Bull keys
docker exec -it api-monitor-redis redis-cli
KEYS bull:*
```

## Development

### Running tests
```bash
cd server
npm test
```

### Linting
```bash
npm run lint
```

### Database migrations
```bash
cd server
npx prisma migrate dev --name description_of_changes
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Author

**Filip Marinca**
- GitHub: [@filipmarinca](https://github.com/filipmarinca)
- Email: contact@filipmarinca.com

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

Built with Node.js, React, PostgreSQL, Redis, and TypeScript.
