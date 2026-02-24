# Deployment Guide

Complete guide for deploying API Monitor to production.

## Deployment Options

1. Docker Compose (simplest)
2. Kubernetes (scalable)
3. VPS/Bare Metal (traditional)
4. Cloud Platforms (AWS, GCP, Azure)

---

## 1. Docker Compose Deployment (Recommended)

### Prerequisites
- Ubuntu 22.04+ or similar Linux distro
- Docker 24+
- Docker Compose 2.20+
- Domain name (optional)

### Steps

1. **Clone repository**
```bash
git clone https://github.com/filipmarinca/api-monitor.git
cd api-monitor
```

2. **Configure environment**
```bash
# Server config
cp server/.env.example server/.env
nano server/.env

# Update these critical values:
NODE_ENV=production
DATABASE_URL=postgresql://apimonitor:STRONG_PASSWORD@postgres:5432/apimonitor
JWT_SECRET=generate-with-openssl-rand-hex-32
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
CORS_ORIGIN=https://your-domain.com
```

3. **Update docker-compose.yml**
```yaml
# Change database password
environment:
  POSTGRES_PASSWORD: STRONG_PASSWORD

# Update server env
environment:
  DATABASE_URL: postgresql://apimonitor:STRONG_PASSWORD@postgres:5432/apimonitor
  JWT_SECRET: your-generated-secret
  CORS_ORIGIN: https://your-domain.com
```

4. **Start services**
```bash
docker-compose up -d
```

5. **Initialize database**
```bash
docker-compose exec server npx prisma migrate deploy
docker-compose exec server npm run prisma:seed
```

6. **Verify health**
```bash
curl http://localhost:3001/health
```

### Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/api-monitor
server {
    listen 80;
    server_name monitor.yourdomain.com;

    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name monitor.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/monitor.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/monitor.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}
```

Enable and reload:
```bash
sudo ln -s /etc/nginx/sites-available/api-monitor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL Certificate (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d monitor.yourdomain.com
```

---

## 2. Kubernetes Deployment

### Prerequisites
- Kubernetes cluster (1.28+)
- kubectl configured
- Helm 3+ (optional)

### Kubernetes Manifests

**Namespace**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: api-monitor
```

**PostgreSQL StatefulSet**
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: api-monitor
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        env:
        - name: POSTGRES_USER
          value: apimonitor
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: api-monitor-secrets
              key: db-password
        - name: POSTGRES_DB
          value: apimonitor
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 20Gi
```

**Redis Deployment**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: api-monitor
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-data
          mountPath: /data
      volumes:
      - name: redis-data
        persistentVolumeClaim:
          claimName: redis-pvc
```

**Server Deployment**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-monitor-server
  namespace: api-monitor
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-monitor-server
  template:
    metadata:
      labels:
        app: api-monitor-server
    spec:
      containers:
      - name: server
        image: filipmarinca/api-monitor-server:latest
        ports:
        - containerPort: 3001
        - containerPort: 9090
        env:
        - name: NODE_ENV
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: api-monitor-secrets
              key: database-url
        - name: REDIS_HOST
          value: redis
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: api-monitor-secrets
              key: jwt-secret
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
```

**Ingress**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-monitor-ingress
  namespace: api-monitor
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/websocket-services: api-monitor-server
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - monitor.yourdomain.com
    secretName: api-monitor-tls
  rules:
  - host: monitor.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-monitor-dashboard
            port:
              number: 80
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-monitor-server
            port:
              number: 3001
      - path: /socket.io
        pathType: Prefix
        backend:
          service:
            name: api-monitor-server
            port:
              number: 3001
```

Deploy:
```bash
kubectl apply -f k8s/
```

---

## 3. VPS Deployment (DigitalOcean, Linode, Hetzner)

### System Requirements
- 2+ CPU cores
- 4GB+ RAM
- 20GB+ SSD storage
- Ubuntu 22.04 LTS

### Installation Script

```bash
#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y git curl nginx certbot python3-certbot-nginx

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js (for local dev)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
cd /opt
sudo git clone https://github.com/filipmarinca/api-monitor.git
sudo chown -R $USER:$USER api-monitor
cd api-monitor

# Configure environment
cp server/.env.example server/.env
nano server/.env  # Edit configuration

# Start services
docker-compose up -d

# Initialize database
docker-compose exec server npx prisma migrate deploy
docker-compose exec server npm run prisma:seed

# Setup Nginx (use config from above)
sudo nano /etc/nginx/sites-available/api-monitor
sudo ln -s /etc/nginx/sites-available/api-monitor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d monitor.yourdomain.com

# Setup auto-renewal
sudo systemctl enable certbot.timer
```

### Systemd Service (Alternative to Docker)

```ini
# /etc/systemd/system/api-monitor.service
[Unit]
Description=API Monitor Server
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=apimonitor
WorkingDirectory=/opt/api-monitor/server
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable api-monitor
sudo systemctl start api-monitor
sudo systemctl status api-monitor
```

---

## 4. Cloud Platform Deployments

### AWS (ECS + RDS + ElastiCache)

1. **RDS PostgreSQL**: Create managed PostgreSQL instance
2. **ElastiCache Redis**: Create Redis cluster
3. **ECS**: Deploy containers using Fargate
4. **ALB**: Application Load Balancer for HTTPS
5. **Route53**: DNS management
6. **CloudWatch**: Logs and monitoring

### Google Cloud (Cloud Run + Cloud SQL)

1. **Cloud SQL**: Managed PostgreSQL
2. **Memorystore**: Managed Redis
3. **Cloud Run**: Serverless container deployment
4. **Cloud Load Balancing**: HTTPS load balancer
5. **Cloud DNS**: DNS management

### Azure (AKS + Azure Database)

1. **Azure Database for PostgreSQL**: Managed database
2. **Azure Cache for Redis**: Managed Redis
3. **AKS**: Kubernetes service
4. **Application Gateway**: Load balancer
5. **Azure DNS**: DNS management

---

## Production Checklist

### Before Deployment
- [ ] Change all default passwords
- [ ] Generate strong JWT secret
- [ ] Configure SMTP for email alerts
- [ ] Set up SSL/TLS certificates
- [ ] Configure CORS for your domain
- [ ] Set up database backups
- [ ] Configure monitoring (Prometheus/Grafana)
- [ ] Set up log aggregation
- [ ] Review rate limiting settings
- [ ] Test disaster recovery process

### After Deployment
- [ ] Verify health checks pass
- [ ] Test authentication flow
- [ ] Create test monitors
- [ ] Verify alerts work
- [ ] Test WebSocket connections
- [ ] Check Prometheus metrics
- [ ] Review server logs
- [ ] Set up monitoring alerts
- [ ] Document access credentials
- [ ] Train team members

### Ongoing Maintenance
- [ ] Monitor disk usage (especially checks table)
- [ ] Review and archive old incidents
- [ ] Update dependencies regularly
- [ ] Rotate secrets periodically
- [ ] Review access logs
- [ ] Performance optimization
- [ ] Scale based on usage
- [ ] Database maintenance (VACUUM, ANALYZE)

---

## Backup Strategy

### Database Backups
```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backup/postgres"
DATE=$(date +%Y%m%d_%H%M%S)

docker-compose exec -T postgres pg_dump -U apimonitor apimonitor | \
  gzip > "$BACKUP_DIR/apimonitor_$DATE.sql.gz"

# Keep last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

### Redis Backups
```bash
# Redis persistence is enabled (appendonly)
# Copy /data/appendonly.aof periodically
docker-compose exec redis redis-cli BGSAVE
```

### Restore Process
```bash
# Restore PostgreSQL
gunzip < backup.sql.gz | docker-compose exec -T postgres psql -U apimonitor apimonitor

# Restart services
docker-compose restart
```

---

## Monitoring & Alerts

### Prometheus + Grafana

```yaml
# Add to docker-compose.yml
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
```

### Uptime Monitoring
Monitor the monitor itself:
- Use external service (UptimeRobot, Pingdom)
- Monitor `/health` endpoint
- Alert on 3+ consecutive failures

---

## Performance Tuning

### Database
```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_checks_monitor_created 
  ON checks(monitor_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_incidents_status 
  ON incidents(status, started_at DESC);

-- Partition checks table by month
CREATE TABLE checks_2024_02 PARTITION OF checks
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

### Redis
```conf
# /etc/redis/redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### Node.js
```bash
# Set in docker-compose.yml
NODE_OPTIONS=--max-old-space-size=2048
UV_THREADPOOL_SIZE=128
```

---

## Security Hardening

1. **Firewall Rules**
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

2. **Fail2ban**
```bash
sudo apt install fail2ban
# Configure for nginx and SSH
```

3. **Regular Updates**
```bash
# Create update script
#!/bin/bash
cd /opt/api-monitor
git pull
docker-compose pull
docker-compose up -d --build
```

4. **Secrets Management**
- Use Docker secrets or Kubernetes secrets
- Never commit .env files
- Rotate credentials quarterly
- Use different keys per environment

---

## Troubleshooting

### High Memory Usage
- Increase container limits
- Enable Redis LRU eviction
- Archive old checks data
- Optimize database queries

### Slow Checks
- Increase worker concurrency
- Add more server replicas
- Optimize monitor intervals
- Use Redis caching

### Database Connection Pool Exhausted
- Increase `connection_limit` in DATABASE_URL
- Reduce concurrent workers
- Check for connection leaks

### WebSocket Disconnections
- Increase timeout settings
- Check reverse proxy WebSocket config
- Verify network stability
- Enable Socket.io reconnection

---

## Disaster Recovery

### RTO: 15 minutes | RPO: 1 hour

1. **Restore Database**
```bash
gunzip < backup.sql.gz | docker exec -i api-monitor-db psql -U apimonitor
```

2. **Restart Services**
```bash
docker-compose up -d
```

3. **Verify Functionality**
```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/monitors
```

4. **Monitor Logs**
```bash
docker-compose logs -f
```

---

## Cost Estimates

### Small Deployment (< 50 monitors)
- VPS: $10-20/month (2 CPU, 4GB RAM)
- Domain: $10/year
- Email (SendGrid): Free tier (100/day)
- Total: ~$15/month

### Medium Deployment (< 500 monitors)
- VPS: $40-80/month (4 CPU, 8GB RAM)
- Managed PostgreSQL: $15/month
- Managed Redis: $10/month
- Email: $15/month (40k/month)
- Total: ~$100/month

### Large Deployment (1000+ monitors)
- Kubernetes cluster: $200+/month
- Managed services: $100/month
- CDN: $20/month
- Monitoring: $50/month
- Total: ~$400+/month

---

## Support

For deployment issues, open an issue on GitHub or contact Filip Marinca.
