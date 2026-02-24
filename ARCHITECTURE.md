# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  React Dashboard  │  Mobile Apps  │  CLI Tools  │  External APIs│
└────────┬─────────────────────┬─────────────────────┬────────────┘
         │                     │                     │
         ├─────────────────────┴─────────────────────┤
         │            HTTPS/WSS                       │
         ▼                                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  • Rate Limiting (Redis)                                         │
│  • Authentication (JWT/API Keys)                                 │
│  • CORS & Security Headers                                       │
│  • Request Validation                                            │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  Express.js Server (TypeScript)                                  │
│  ├── REST API Endpoints                                          │
│  ├── WebSocket Server (Socket.io)                               │
│  ├── Controllers & Business Logic                               │
│  └── Middleware (Auth, Error Handling)                          │
└────────┬────────────────────────────────────────────────────────┘
         │
         ├──────────────┬─────────────┬──────────────┐
         ▼              ▼             ▼              ▼
┌─────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ PostgreSQL  │  │  Redis   │  │   Bull   │  │ Socket.io│
│   (Prisma)  │  │  Cache   │  │  Queues  │  │ Real-time│
│             │  │          │  │          │  │          │
│ • Users     │  │ • Cache  │  │ • Monitor│  │ • Live   │
│ • Monitors  │  │ • Rate   │  │   Checks │  │   Updates│
│ • Checks    │  │   Limit  │  │ • Alerts │  │ • Status │
│ • Incidents │  │ • Session│  │ • Jobs   │  │   Events │
│ • Alerts    │  │          │  │          │  │          │
└─────────────┘  └──────────┘  └────┬─────┘  └──────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │   Background Workers  │
                         ├───────────────────────┤
                         │ • Monitor Checker     │
                         │ • Incident Manager    │
                         │ • Alert Dispatcher    │
                         │ • Metric Collector    │
                         └───────────┬───────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
              ┌──────────┐    ┌──────────┐    ┌──────────┐
              │  Email   │    │ Webhook  │    │   SMS    │
              │  (SMTP)  │    │ (HTTP)   │    │ (Twilio) │
              └──────────┘    └──────────┘    └──────────┘
```

## Data Flow

### Monitor Check Flow

1. **Scheduling**: Bull queue triggers monitor check job based on interval
2. **Execution**: Worker fetches monitor config from PostgreSQL
3. **HTTP Request**: Axios makes HTTP request to target URL
4. **Validation**: Response validated against expected status, schema, regex
5. **SSL Check**: Certificate expiry checked for HTTPS endpoints
6. **Storage**: Check result saved to PostgreSQL
7. **Metrics**: Prometheus counters and histograms updated
8. **Real-time**: Socket.io broadcasts check result to connected clients
9. **Incident Detection**: Consecutive failures trigger incident creation
10. **Alert Evaluation**: Alert rules evaluated and notifications sent

### Alert Flow

1. **Trigger**: Check failure or threshold exceeded
2. **Rule Evaluation**: All alert rules for monitor checked
3. **Incident Linking**: Alert linked to existing or new incident
4. **Queue**: Alert job added to Bull queue
5. **Dispatch**: Worker sends notifications via configured channels
6. **Tracking**: Alert status tracked in database
7. **Retry**: Failed alerts retried with exponential backoff

### Real-time Updates

1. **Client Connection**: Dashboard connects via Socket.io
2. **Subscription**: Client subscribes to specific monitor channels
3. **Event Emission**: Server emits events on check completion
4. **Client Update**: Dashboard receives and renders updates instantly
5. **Automatic Reconnection**: Socket.io handles disconnections

## Component Responsibilities

### API Server (`server/src/index.ts`)
- Express server setup
- Middleware configuration
- Route registration
- Socket.io initialization
- Graceful shutdown handling

### Monitors (`server/src/monitors/`)
- HTTP request execution
- Response validation
- SSL certificate checking
- Multi-region support
- Error handling

### Jobs (`server/src/jobs/`)
- Bull queue configuration
- Monitor check scheduling
- Alert dispatching
- Incident management
- Job error handling

### Routes (`server/src/routes/`)
- REST API endpoints
- Request validation
- Authorization checks
- Response formatting
- Error handling

### Alerts (`server/src/alerts/`)
- Email sending (Nodemailer)
- Webhook posting (Axios)
- SMS sending (Twilio)
- Payload formatting (Slack, Discord)

### Dashboard (`dashboard/src/`)
- React components
- State management (Zustand)
- API client (Axios)
- Real-time updates (Socket.io)
- Data visualization (Recharts)

## Database Schema Relationships

```
User ──┬── Monitor ──┬── Check
       │             ├── Incident ── Alert
       │             └── AlertRule
       │
       └── WorkspaceMember ── Workspace ── Monitor

StatusPage ──> Monitor (many-to-many via monitorIds array)
```

## Scaling Considerations

### Horizontal Scaling
- Stateless API servers can be load-balanced
- Redis shared across instances for rate limiting
- PostgreSQL connection pooling
- Bull queue distributed processing

### Database Optimization
- Indexed queries on monitorId, createdAt, status
- Partitioning for checks table (by date)
- Archival strategy for old data
- Read replicas for analytics queries

### Caching Strategy
- Redis cache for frequently accessed monitors
- In-memory cache for configuration
- CDN for static dashboard assets
- Response caching with TTL

### Performance Targets
- API response time: < 100ms (p95)
- Monitor check interval: 60s minimum
- Real-time update latency: < 500ms
- Dashboard load time: < 2s

## Security Architecture

### Authentication
- JWT tokens (short-lived, 7 days default)
- API keys for programmatic access
- Bcrypt password hashing (10 rounds)
- Token rotation support

### Authorization
- Role-based access control (ADMIN, USER, VIEWER)
- Workspace-level isolation
- Resource ownership validation
- API rate limiting per user

### Data Protection
- Encrypted database connections (SSL)
- Secrets in environment variables
- No sensitive data in logs
- Response body size limits

### Network Security
- CORS configuration
- Helmet security headers
- Rate limiting (Redis-backed)
- DDoS protection (via reverse proxy)

## Monitoring the Monitor

### Health Checks
- `/health`: Overall system health
- `/health/ready`: Kubernetes readiness probe
- `/metrics`: Prometheus metrics endpoint

### Key Metrics
- `http_requests_total`: Total HTTP requests
- `http_request_duration_seconds`: Request latency
- `monitor_checks_total`: Total monitor checks
- `monitor_check_duration_milliseconds`: Check latency
- `active_monitors`: Current active monitors
- `active_incidents`: Current open incidents

### Logging
- Structured logging (Winston)
- Log levels: error, warn, info, debug
- Separate error log file
- Log rotation configured

## Future Enhancements

- GraphQL API support
- Multi-region deployment
- Advanced anomaly detection (ML-based)
- Custom dashboard widgets
- API performance profiling
- Synthetic transaction monitoring
- Browser-based monitoring (Playwright/Puppeteer)
- Integration marketplace
- Mobile apps (React Native)
- Terraform/Kubernetes deployment configs
