# Truckify - Modern Trucking & Shipping Platform

A scalable, cloud-agnostic trucking platform built with Go microservices architecture. Similar to Uber Freight, Truckify connects shippers with drivers, fleet operators, and dispatchers, with built-in compliance for Australia (NHVR) and Kenya (NTSA) regulations.

## Features

- **Multi-User Support**: Shippers, Drivers, Fleet Operators, and Dispatchers
- **Smart Matching**: Real-time job-to-driver matching with proximity-based algorithms
- **Backhaul Optimization**: Reduce empty miles and maximize efficiency
- **Regulatory Compliance**: Built-in compliance for Australia (NHVR) and Kenya (NTSA)
- **Real-Time Tracking**: GPS tracking with geofencing and ETA calculations
- **Route Optimization**: Multi-stop route planning with OSRM road routing
- **Payment Processing**: Integrated payment gateway with multi-currency support
- **Analytics & BI**: Comprehensive dashboards, demand forecasting, and dynamic pricing
- **Mobile Apps**: iOS and Android apps with offline support
- **End-to-End Encryption**: 3-way key escrow for secure messaging
- **Multi-Language**: English, Spanish, and Swahili support
- **Cloud-Agnostic**: Not tied to any specific cloud provider
- **Highly Scalable**: Microservices architecture with horizontal scaling

## Architecture

### Microservices

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 8000 | Single entry point, routing, authentication |
| Auth Service | 8001 | User authentication, passkeys, JWT |
| User Service | 8002 | User profiles, documents |
| Shipper Service | 8003 | Shipper-specific functionality |
| Driver Service | 8004 | Driver profiles and qualifications |
| Fleet Service | 8005 | Fleet management |
| Job Service | 8006 | Freight job management |
| Matching Service | 8007 | Job-to-driver matching |
| Bidding Service | 8008 | Bidding system |
| Route Service | 8009 | Route planning and optimization |
| Backhaul Service | 8010 | Backhaul opportunity matching |
| Tracking Service | 8011 | Real-time GPS tracking |
| Payment Service | 8012 | Payment processing |
| Rating Service | 8013 | Ratings and reviews |
| Notification Service | 8014 | Push notifications, SMS, email, WebSocket |
| Analytics Service | 8015 | BI, demand forecasting, dynamic pricing |
| Compliance Service | 8016 | Regulatory compliance |
| Admin Service | 8017 | System configuration management |

### Technology Stack

- **Backend**: Go 1.21+
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Mobile**: React Native (Expo SDK 54)
- **Databases**: PostgreSQL (with PostGIS), MongoDB, Redis
- **Message Broker**: NATS
- **Service Discovery**: Consul
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Containers**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Testing**: Go test, Jest, Vitest

## Quick Start

### Prerequisites

- Go 1.21 or higher
- Node.js 20+
- Docker and Docker Compose
- Make (optional)

### 1. Clone and Setup

```bash
git clone https://github.com/vk3xxx/Truckify.git
cd Truckify
cp .env.example .env
```

### 2. Start Backend Services

```bash
make dev
```

### 3. Start Frontend

```bash
cd web/frontend
npm install
npm run dev
```

### 4. Start Mobile App

```bash
cd mobile/truckify-mobile
npm install
npx expo start
```

### 5. Access Services

| Service | URL |
|---------|-----|
| Web Frontend | http://localhost:5173 |
| API Gateway | http://localhost:8000 |
| Auth Service | http://localhost:8001 |
| Grafana | http://localhost:3000 |
| Prometheus | http://localhost:9090 |

## API Documentation

### Authentication

```bash
# Register
curl -X POST http://localhost:8001/register \
  -H "Content-Type: application/json" \
  -d '{"email": "driver@example.com", "password": "password123", "user_type": "driver"}'

# Login
curl -X POST http://localhost:8001/login \
  -H "Content-Type: application/json" \
  -d '{"email": "driver@example.com", "password": "password123"}'

# Passkey Login
curl -X POST http://localhost:8001/passkey/login/begin \
  -H "Content-Type: application/json" \
  -d '{"email": "driver@example.com"}'
```

### Analytics & Forecasting

```bash
# Dashboard Stats
curl http://localhost:8015/analytics/dashboard

# Demand Forecast (next 7 days)
curl http://localhost:8015/analytics/forecast/demand?days=7

# Dynamic Pricing
curl "http://localhost:8015/analytics/pricing/recommend?origin=Sydney&destination=Melbourne&base_price=1500"

# Market Conditions
curl http://localhost:8015/analytics/market/conditions?region=Sydney

# Demand Heatmap
curl http://localhost:8015/analytics/forecast/heatmap
```

### Jobs

```bash
# List Jobs
curl http://localhost:8006/jobs -H "Authorization: Bearer $TOKEN"

# Create Job
curl -X POST http://localhost:8006/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pickup_city": "Sydney", "delivery_city": "Melbourne", "price": 2500}'
```

## Project Structure

```
Truckify/
├── api-gateway/              # API Gateway service
├── services/                 # Backend microservices
│   ├── admin/               # System admin & config
│   ├── analytics/           # BI, forecasting, pricing
│   ├── auth/                # Authentication & passkeys
│   ├── compliance/          # NHVR/NTSA compliance
│   ├── driver/              # Driver management
│   ├── job/                 # Job management
│   ├── notification/        # Push, SMS, WebSocket
│   ├── tracking/            # GPS tracking
│   └── ...
├── shared/                   # Shared Go packages
│   └── pkg/
│       ├── jwt/             # JWT utilities
│       ├── logger/          # Structured logging
│       ├── middleware/      # HTTP middlewares
│       └── validator/       # Request validation
├── web/
│   └── frontend/            # React web application
├── mobile/
│   └── truckify-mobile/     # React Native mobile app
├── infrastructure/          # Docker, K8s configs
├── .github/
│   └── workflows/           # CI/CD pipelines
└── docs/                    # Documentation
```

## Mobile App Features

- **Authentication**: Email/password, biometric (Face ID/Touch ID), passkeys
- **Job Management**: Browse, accept, track jobs
- **Real-Time Tracking**: Live GPS with OSRM road routing
- **Documents**: Upload license, insurance, vehicle registration
- **Proof of Delivery**: Photo capture, signature, recipient name
- **Invoices**: Payment history and status
- **Messaging**: E2E encrypted chat with shippers/dispatchers
- **Offline Support**: Queue actions when disconnected
- **Multi-Language**: English, Spanish, Swahili

## Testing

### Run All Tests

```bash
# Backend
go test ./...

# Frontend
cd web/frontend && npm test

# Mobile
cd mobile/truckify-mobile && npm test
```

### Test Coverage

| Component | Suites | Tests |
|-----------|--------|-------|
| Mobile | 5 | 37 |
| Frontend | 3 | 10 |
| Backend | 14 | 50+ |

## CI/CD

GitHub Actions workflows:

- **ci.yml**: Build and test on push/PR
- **pr-check.yml**: Smart path-filtered checks
- **deploy.yml**: Build images, deploy to staging/production
- **mobile-build.yml**: EAS builds for iOS/Android

## Security

- JWT authentication (15 min access, 7 day refresh)
- Passkey/WebAuthn support
- Biometric authentication
- E2E encryption for messaging (3-way key escrow)
- AES-256-GCM for config encryption
- bcrypt password hashing
- Rate limiting
- Input validation
- CORS protection

## Compliance

### Australia (NHVR)
- Chain of Responsibility (CoR)
- Mass Management
- Fatigue Management
- Vehicle Standards

### Kenya (NTSA)
- Axle Load Control
- Driver Licensing
- Vehicle Inspection
- Speed Limiting
- Insurance Requirements

## Roadmap

### ✅ Phase 1: Foundation
- [x] Project structure and shared libraries
- [x] API Gateway
- [x] Auth Service with passkeys
- [x] Docker Compose setup

### ✅ Phase 2: Core Business Services
- [x] User Service with documents
- [x] Driver Service
- [x] Fleet Service
- [x] Job Service

### ✅ Phase 3: Smart Features
- [x] Matching Service
- [x] Bidding Service
- [x] Route Service
- [x] Backhaul Service

### ✅ Phase 4: Operations
- [x] Tracking Service
- [x] Payment Service
- [x] Rating Service
- [x] Notification Service with WebSocket

### ✅ Phase 5: Intelligence & Compliance
- [x] Analytics Service
- [x] Compliance Service
- [x] AI-powered demand forecasting
- [x] Dynamic pricing

### ✅ Phase 6: Frontend & Mobile
- [x] Web frontend (React + TypeScript)
- [x] Mobile apps (React Native/Expo)
- [x] System Admin page
- [x] E2E encrypted messaging
- [x] Multi-language support

### 🔄 Production Release (Pending)
- [x] Deployment script with reverse proxy detection
- [x] Email verification and password reset
- [ ] Kubernetes deployment configs
- [ ] EAS Build for app stores
- [ ] Production security hardening

## Production Deployment

### Quick Deploy to Docker Server

```bash
# On your remote server
git clone https://github.com/vk3xxx/Truckify.git
cd Truckify/infrastructure

# Deploy with your domain
DOMAIN=truckify.example.com SSL_EMAIL=admin@example.com ./deploy.sh
```

### What the Deploy Script Does

1. **Detects existing reverse proxy** - Checks for nginx, traefik, or nginx-proxy-manager
2. **If proxy found** - Adds Truckify config and reloads
3. **If no proxy** - Sets up nginx + certbot with auto-SSL
4. **Starts all services** - Builds and runs all microservices

### Manual Deployment

```bash
# 1. Clone and configure
git clone https://github.com/vk3xxx/Truckify.git
cd Truckify
cp .env.example .env
# Edit .env with production values

# 2. Start services
cd infrastructure/docker
docker compose up -d --build

# 3. (Optional) Start reverse proxy
docker compose -f docker-compose.proxy.yml up -d
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `JWT_SECRET` | Secret for JWT signing | Yes |
| `POSTGRES_PASSWORD` | Database password | Yes |
| `REDIS_PASSWORD` | Redis password | Yes |
| `STRIPE_SECRET_KEY` | Stripe API key | For payments |
| `SMTP_HOST` | Email server | For emails |
| `SMTP_USER` | Email username | For emails |
| `SMTP_PASSWORD` | Email password | For emails |
| `APP_URL` | Public URL | For email links |
| `ALLOWED_ORIGINS` | CORS origins | Yes |

### Post-Deployment URLs

| Service | URL |
|---------|-----|
| Web App | https://your-domain.com |
| API | https://api.your-domain.com |
| Grafana | https://your-domain.com:3000 |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes
4. Ensure all tests pass (`make test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- Email: support@truckify.com
- GitHub Issues: [Create an issue](https://github.com/vk3xxx/Truckify/issues)
