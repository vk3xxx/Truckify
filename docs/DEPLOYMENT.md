# Deployment Guide

Complete guide for deploying Truckify to a Docker server.

## Prerequisites

- Docker 24+ and Docker Compose v2
- Domain name (optional, for SSL)
- 4GB+ RAM recommended
- Ports 80, 443 available (or existing reverse proxy)

## Quick Deploy

```bash
git clone https://github.com/vk3xxx/Truckify.git
cd Truckify/infrastructure
DOMAIN=truckify.example.com SSL_EMAIL=admin@example.com ./deploy.sh
```

## What the Deploy Script Does

### 1. Reverse Proxy Detection

The script checks for existing reverse proxies:

| Proxy | Detection | Action |
|-------|-----------|--------|
| nginx | Container named `nginx`, `nginx-proxy`, or `reverse-proxy` | Adds config, reloads |
| Traefik | Container named `traefik` | Uses Docker labels |
| Nginx Proxy Manager | Container named `nginx-proxy-manager` or `npm` | Prints manual instructions |
| None | No proxy found | Sets up nginx + certbot |

### 2. Service Startup

Builds and starts all 18 microservices plus supporting infrastructure:
- PostgreSQL, MongoDB, Redis
- NATS message broker
- Consul service discovery
- Prometheus + Grafana monitoring
- Elasticsearch + Kibana logging

### 3. SSL Configuration

If no existing proxy and domain is not `localhost`:
- Requests Let's Encrypt certificates via certbot
- Configures auto-renewal (every 12 hours check)

## Manual Deployment

### Step 1: Clone and Configure

```bash
git clone https://github.com/vk3xxx/Truckify.git
cd Truckify
cp .env.example .env
```

### Step 2: Edit Environment Variables

```bash
# Required - generate strong secrets
JWT_SECRET=$(openssl rand -base64 32)
POSTGRES_PASSWORD=$(openssl rand -base64 16)
REDIS_PASSWORD=$(openssl rand -base64 16)

# Update .env file
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env
sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" .env
```

### Step 3: Start Services

```bash
cd infrastructure/docker
docker compose up -d --build
```

### Step 4: Start Reverse Proxy (if needed)

```bash
# Edit nginx config with your domain
sed -i 's/DOMAIN_PLACEHOLDER/yourdomain.com/g' ../nginx/truckify.conf

# Start proxy
docker compose -f docker-compose.proxy.yml up -d
```

### Step 5: Setup SSL (optional)

```bash
docker exec truckify-proxy certbot --nginx \
  -d yourdomain.com \
  -d api.yourdomain.com \
  --non-interactive \
  --agree-tos \
  -m admin@yourdomain.com
```

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing secret (32+ chars) | `openssl rand -base64 32` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `openssl rand -base64 16` |
| `REDIS_PASSWORD` | Redis password | `openssl rand -base64 16` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `https://yourdomain.com` |

### Email (for verification/reset)

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | `noreply@yourdomain.com` |
| `SMTP_PASSWORD` | SMTP password | App-specific password |
| `SMTP_FROM` | From address | `Truckify <noreply@yourdomain.com>` |
| `APP_URL` | Public URL for email links | `https://yourdomain.com` |

### Payments (Stripe)

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

## Architecture

```
                    ┌─────────────────┐
                    │  nginx/traefik  │
                    │  (reverse proxy)│
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │   Web    │  │   API    │  │ Grafana  │
        │ Frontend │  │ Gateway  │  │  :3000   │
        │   :80    │  │  :8000   │  └──────────┘
        └──────────┘  └────┬─────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │   Auth   │     │   Job    │     │ Tracking │
   │  :8001   │     │  :8006   │     │  :8011   │
   └────┬─────┘     └────┬─────┘     └────┬─────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │ Postgres │   │  Redis   │   │   NATS   │
   │  :5432   │   │  :6379   │   │  :4222   │
   └──────────┘   └──────────┘   └──────────┘
```

## Service Ports

| Service | Internal Port | External Port |
|---------|---------------|---------------|
| API Gateway | 8000 | 8000 |
| Auth | 8001 | 8001 |
| User | 8002 | 8002 |
| Driver | 8004 | 8004 |
| Fleet | 8005 | 8005 |
| Job | 8006 | 8006 |
| Matching | 8007 | 8007 |
| Bidding | 8008 | 8008 |
| Route | 8009 | 8009 |
| Backhaul | 8010 | 8010 |
| Tracking | 8011 | 8011 |
| Payment | 8012 | 8012 |
| Rating | 8013 | 8013 |
| Notification | 8014 | 8014 |
| Analytics | 8015 | 8015 |
| Compliance | 8016 | 8016 |
| Admin | 8017 | 8017 |
| PostgreSQL | 5432 | 5432 |
| MongoDB | 27017 | 27017 |
| Redis | 6379 | 6379 |
| NATS | 4222 | 4222 |
| Grafana | 3000 | 3000 |
| Prometheus | 9090 | 9090 |

## Health Checks

```bash
# Check all services
docker compose ps

# Check specific service logs
docker compose logs -f auth-service

# Check API health
curl http://localhost:8000/health

# Check database
docker exec truckify-postgres pg_isready -U truckify
```

## Backup & Restore

### Backup

```bash
# PostgreSQL
docker exec truckify-postgres pg_dumpall -U truckify > backup.sql

# MongoDB
docker exec truckify-mongodb mongodump --out /backup
docker cp truckify-mongodb:/backup ./mongo-backup

# Redis
docker exec truckify-redis redis-cli -a $REDIS_PASSWORD BGSAVE
```

### Restore

```bash
# PostgreSQL
cat backup.sql | docker exec -i truckify-postgres psql -U truckify

# MongoDB
docker cp ./mongo-backup truckify-mongodb:/backup
docker exec truckify-mongodb mongorestore /backup
```

## Scaling

For horizontal scaling, use Docker Swarm or Kubernetes:

```bash
# Scale specific service
docker compose up -d --scale job-service=3

# Or use Swarm
docker stack deploy -c docker-compose.yml truckify
```

## Troubleshooting

### Services won't start

```bash
# Check logs
docker compose logs

# Check resource usage
docker stats

# Restart all
docker compose down && docker compose up -d
```

### Database connection issues

```bash
# Check postgres is healthy
docker compose ps postgres

# Check network
docker network inspect truckify-network
```

### SSL certificate issues

```bash
# Check certbot logs
docker logs truckify-certbot

# Manual renewal
docker exec truckify-proxy certbot renew --dry-run
```

## Updating

```bash
cd Truckify
git pull
cd infrastructure/docker
docker compose down
docker compose up -d --build
```
