# System Responsiveness & Health Monitoring

## Quick Health Check

Run the health check to verify all services are responsive:

```bash
make health
```

This checks all 22 services and displays their status:
- ✅ All microservices (API Gateway, Auth, User, Driver, etc.)
- ✅ Frontend (React app)
- ✅ Monitoring (Prometheus, Grafana, Kibana)
- ✅ Infrastructure (Consul, PostgreSQL, Redis, MongoDB, NATS)

## Service URLs

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | http://localhost:5173 | ✅ |
| **API Gateway** | http://localhost:8000 | ✅ |
| **Auth Service** | http://localhost:8001 | ✅ |
| **User Service** | http://localhost:8002 | ✅ |
| **Driver Service** | http://localhost:8004 | ✅ |
| **Fleet Service** | http://localhost:8005 | ✅ |
| **Job Service** | http://localhost:8006 | ✅ |
| **Matching Service** | http://localhost:8007 | ✅ |
| **Bidding Service** | http://localhost:8008 | ✅ |
| **Route Service** | http://localhost:8009 | ✅ |
| **Backhaul Service** | http://localhost:8010 | ✅ |
| **Tracking Service** | http://localhost:8011 | ✅ |
| **Payment Service** | http://localhost:8012 | ✅ |
| **Rating Service** | http://localhost:8013 | ✅ |
| **Notification Service** | http://localhost:8014 | ✅ |
| **Analytics Service** | http://localhost:8015 | ✅ |
| **Compliance Service** | http://localhost:8016 | ✅ |
| **Admin Service** | http://localhost:8017 | ✅ |
| **Prometheus** | http://localhost:9090 | ✅ |
| **Grafana** | http://localhost:3000 | ✅ |
| **Kibana** | http://localhost:5601 | ✅ |
| **Consul** | http://localhost:8500 | ✅ |

## Common Commands

```bash
# Check system health
make health

# View container status
make status

# View all logs
make logs

# View specific service logs
make logs-gateway
make logs-auth

# Restart all services
make docker-restart

# Stop all services
make docker-down

# Start all services
make docker-up
```

## Troubleshooting

### Service Not Responding

1. Check container status:
   ```bash
   make status
   ```

2. View service logs:
   ```bash
   docker-compose logs <service-name>
   ```

3. Restart the service:
   ```bash
   docker-compose restart <service-name>
   ```

### All Services Down

1. Restart everything:
   ```bash
   make docker-restart
   ```

2. Check Docker daemon:
   ```bash
   docker ps
   ```

3. Rebuild and restart:
   ```bash
   make docker-down
   make docker-up
   ```

### Frontend Not Loading

1. Check if dev server is running:
   ```bash
   ps aux | grep "npm run dev"
   ```

2. Restart frontend:
   ```bash
   cd web/frontend
   npm run dev
   ```

3. Clear cache and rebuild:
   ```bash
   cd web/frontend
   rm -rf node_modules dist
   npm install
   npm run dev
   ```

### Database Connection Issues

1. Check PostgreSQL:
   ```bash
   make db-shell
   ```

2. Check Redis:
   ```bash
   make redis-cli
   ```

3. View database logs:
   ```bash
   docker-compose logs postgres
   ```

## Monitoring

### Real-time Metrics
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)

### Logs
- **Kibana**: http://localhost:5601

### Service Discovery
- **Consul**: http://localhost:8500

## Performance Tips

1. **Monitor resource usage**:
   ```bash
   docker stats
   ```

2. **Check slow queries**:
   ```bash
   docker-compose logs postgres | grep "duration"
   ```

3. **View API metrics**:
   - Visit http://localhost:8000/metrics

4. **Check service health endpoints**:
   ```bash
   curl http://localhost:8000/health
   curl http://localhost:8001/health
   ```

## Ensuring Responsiveness After Changes

After making any changes:

1. **Run health check**:
   ```bash
   make health
   ```

2. **Monitor logs**:
   ```bash
   make logs
   ```

3. **Test critical endpoints**:
   ```bash
   # Test authentication
   curl -X POST http://localhost:8000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
   
   # Test admin config
   curl http://localhost:8017/api/v1/admin/config
   ```

4. **Verify frontend**:
   - Open http://localhost:5173 in browser
   - Check browser console for errors

## Automated Health Checks

The health check script (`scripts/health-check.sh`) can be run:

- **Manually**: `make health`
- **In CI/CD**: Add to your pipeline
- **Scheduled**: Use cron: `0 * * * * cd /path/to/Truckify && make health`

## Status Codes

- **200**: Service is healthy and responding
- **301/302**: Redirect (normal for some services like Consul, Prometheus)
- **000**: Connection refused (service not running)
- **5xx**: Service error (check logs)
