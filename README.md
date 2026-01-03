# Truckify - Modern Trucking & Shipping Platform

A scalable, cloud-agnostic trucking platform built with Go microservices architecture. Similar to Uber Freight, Truckify connects shippers with drivers, fleet operators, and dispatchers, with built-in compliance for Australia (NHVR) and Kenya (NTSA) regulations.

## Features

- **Multi-User Support**: Shippers, Drivers, Fleet Operators, and Dispatchers
- **Smart Matching**: Real-time job-to-driver matching with proximity-based algorithms
- **Backhaul Optimization**: Reduce empty miles and maximize efficiency
- **Regulatory Compliance**: Built-in compliance for Australia (NHVR) and Kenya (NTSA)
- **Real-Time Tracking**: GPS tracking with geofencing and ETA calculations
- **Route Optimization**: Multi-stop route planning with fuel cost estimation
- **Payment Processing**: Integrated payment gateway with multi-currency support
- **Analytics & BI**: Comprehensive dashboards and predictive analytics
- **Cloud-Agnostic**: Not tied to any specific cloud provider
- **Highly Scalable**: Microservices architecture with horizontal scaling

## Architecture

### Microservices

1. **API Gateway** (Port 8000) - Single entry point, routing, authentication
2. **Auth Service** (Port 8001) - User authentication and authorization
3. **User Service** (Port 8002) - User profile management
4. **Shipper Service** (Port 8003) - Shipper-specific functionality
5. **Driver Service** (Port 8004) - Driver profiles and qualifications
6. **Fleet Service** (Port 8005) - Fleet management
7. **Job Service** (Port 8006) - Freight job management
8. **Matching Service** (Port 8007) - Job-to-driver matching
9. **Bidding Service** (Port 8008) - Bidding system
10. **Route Service** (Port 8009) - Route planning and optimization
11. **Backhaul Service** (Port 8010) - Backhaul opportunity matching
12. **Tracking Service** (Port 8011) - Real-time GPS tracking
13. **Payment Service** (Port 8012) - Payment processing
14. **Rating Service** (Port 8013) - Ratings and reviews
15. **Notification Service** (Port 8014) - Push notifications, SMS, email
16. **Analytics Service** (Port 8015) - Business intelligence
17. **Compliance Service** (Port 8016) - Regulatory compliance

### Technology Stack

- **Backend**: Go 1.21+
- **Databases**: PostgreSQL (with PostGIS), MongoDB, Redis
- **Message Broker**: NATS
- **Service Discovery**: Consul
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Containers**: Docker + Docker Compose
- **API Gateway**: Custom Go gateway with rate limiting

## Prerequisites

- Go 1.21 or higher
- Docker and Docker Compose
- Make (optional, for using Makefile commands)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Truckify
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
# Edit .env and update the JWT_SECRET and other sensitive values
```

### 3. Start All Services

```bash
make dev
```

This command will:
- Start all infrastructure services (PostgreSQL, MongoDB, Redis, NATS, Consul, etc.)
- Run database migrations
- Start the API Gateway and Auth Service

### 4. Verify Services

```bash
make status
```

### 5. Access the Services

- **API Gateway**: http://localhost:8000
- **Auth Service**: http://localhost:8001
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)
- **Kibana**: http://localhost:5601
- **Consul UI**: http://localhost:8500

## API Documentation

### Authentication Endpoints

#### Register a New User

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "driver@example.com",
    "password": "securepassword123",
    "user_type": "driver"
  }'
```

#### Login

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "driver@example.com",
    "password": "securepassword123"
  }'
```

#### Refresh Token

```bash
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "your-refresh-token"
  }'
```

## Development

### Project Structure

```
Truckify/
├── api-gateway/          # API Gateway service
├── services/             # All microservices
│   ├── auth/            # Authentication service
│   ├── user/            # User service
│   ├── driver/          # Driver service
│   └── ...
├── shared/              # Shared packages and utilities
│   └── pkg/
│       ├── database/    # Database connections
│       ├── jwt/         # JWT utilities
│       ├── logger/      # Structured logging
│       ├── validator/   # Request validation
│       └── middleware/  # HTTP middlewares
├── infrastructure/      # Docker, monitoring, logging configs
├── web/                 # Frontend (to be implemented)
├── scripts/             # Utility scripts
└── docs/                # Documentation
```

### Available Make Commands

```bash
make help              # Show all available commands
make install           # Install dependencies
make build             # Build all services
make test              # Run tests
make test-coverage     # Run tests with coverage
make docker-up         # Start all services
make docker-down       # Stop all services
make docker-restart    # Restart all services
make migrate-up        # Run database migrations
make migrate-down      # Rollback migrations
make logs              # View all service logs
make logs-gateway      # View API Gateway logs
make logs-auth         # View Auth Service logs
make db-shell          # Open PostgreSQL shell
make redis-cli         # Open Redis CLI
make dev               # Start development environment
make clean             # Clean build artifacts
```

### Running Services Locally (Without Docker)

#### 1. Start Infrastructure Services Only

```bash
# Start only databases and supporting services
docker-compose -f infrastructure/docker/docker-compose.yml up -d postgres mongodb redis nats consul
```

#### 2. Run Migrations

```bash
make migrate-up
```

#### 3. Run Services

```bash
# Terminal 1: API Gateway
make run-gateway

# Terminal 2: Auth Service
make run-auth
```

## Testing

### Run All Tests

```bash
make test
```

### Run Tests with Coverage

```bash
make test-coverage
```

### Test Individual Services

```bash
cd services/auth
go test -v ./...
```

## Database Migrations

### Create a New Migration

```bash
# Create SQL file in services/<service-name>/migrations/
touch services/auth/migrations/002_add_new_field.sql
```

### Run Migrations

```bash
make migrate-up
```

### Rollback Migrations

```bash
make migrate-down
```

## Monitoring & Observability

### Prometheus Metrics

Access Prometheus at http://localhost:9090

All services expose metrics at `/metrics` endpoint.

### Grafana Dashboards

Access Grafana at http://localhost:3000 (admin/admin)

Pre-configured dashboards for:
- Service health and performance
- Database metrics
- API Gateway metrics
- System resources

### Logs

Access Kibana at http://localhost:5601 for centralized logging.

All services use structured JSON logging for easy parsing and searching.

## Compliance

### Australia (NHVR - National Heavy Vehicle Regulator)

- Chain of Responsibility (CoR) tracking
- Mass Management (weight limits)
- Fatigue Management (Hours of Service)
- Vehicle Standards compliance

### Kenya (NTSA - National Transport and Safety Authority)

- Axle Load Control
- Driver Licensing verification
- Vehicle Inspection certificates
- Speed Limiting compliance
- Insurance Requirements

## Deployment

### Production Considerations

1. **Environment Variables**: Use secure secret management (HashiCorp Vault, AWS Secrets Manager)
2. **TLS/SSL**: Enable HTTPS for all services
3. **Database**: Use managed database services or set up replication
4. **Scaling**: Use Kubernetes for container orchestration
5. **Monitoring**: Set up alerts in Prometheus/Grafana
6. **Backup**: Implement regular database backups
7. **CI/CD**: Set up GitHub Actions or GitLab CI for automated deployments

### Docker Deployment

```bash
# Build images
make docker-build

# Deploy
make docker-up
```

### Kubernetes Deployment (Future)

```bash
# Deploy to Kubernetes cluster
kubectl apply -f k8s/
```

## Security

- JWT-based authentication with short-lived access tokens (15 min)
- Refresh tokens for extended sessions (7 days)
- Password hashing with bcrypt
- Rate limiting to prevent abuse
- Input validation on all endpoints
- SQL injection prevention
- XSS protection
- CSRF protection
- Secure headers (HSTS, X-Frame-Options, etc.)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

### Phase 1: Foundation (Current)
- [x] Project structure and shared libraries
- [x] API Gateway
- [x] Auth Service
- [x] Docker Compose setup
- [ ] User Service
- [ ] Database schemas for all services

### Phase 2: Core Business Services
- [ ] Shipper Service
- [ ] Driver Service
- [ ] Fleet Service
- [ ] Job Service

### Phase 3: Smart Features
- [ ] Matching Service
- [ ] Bidding Service
- [ ] Route Service
- [ ] Backhaul Service

### Phase 4: Operations
- [ ] Tracking Service
- [ ] Payment Service
- [ ] Rating Service
- [ ] Notification Service

### Phase 5: Intelligence & Compliance
- [ ] Analytics Service
- [ ] Compliance Service
- [ ] AI-powered demand forecasting
- [ ] Dynamic pricing

### Phase 6: Frontend & Mobile
- [ ] Web frontend (React + TypeScript)
- [ ] Mobile apps (React Native)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@truckify.com or open an issue in the GitHub repository.

## Acknowledgments

- Uber Freight for inspiration
- Go community for excellent libraries and tools
- Open source contributors
