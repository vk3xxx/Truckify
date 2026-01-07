.PHONY: help build run stop clean test migrate-up migrate-down docker-build docker-up docker-down logs

# Variables
DOCKER_COMPOSE = docker-compose -f infrastructure/docker/docker-compose.yml
POSTGRES_CONTAINER = truckify-postgres
POSTGRES_USER = truckify
POSTGRES_PASSWORD = truckify_password
AUTH_DB = auth

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	@echo "Installing dependencies..."
	go work sync
	cd shared && go mod tidy
	cd api-gateway && go mod tidy
	cd services/auth && go mod tidy

build: ## Build all services
	@echo "Building services..."
	cd api-gateway && go build -o bin/api-gateway ./cmd/server
	cd services/auth && go build -o bin/auth-service ./cmd/server

run-gateway: ## Run API Gateway locally
	@echo "Running API Gateway..."
	cd api-gateway && go run ./cmd/server/main.go

run-auth: ## Run Auth Service locally
	@echo "Running Auth Service..."
	cd services/auth && go run ./cmd/server/main.go

test: ## Run tests
	@echo "Running tests..."
	go test -v -cover ./...

test-coverage: ## Run tests with coverage report
	@echo "Running tests with coverage..."
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

lint: ## Run linter
	@echo "Running linter..."
	golangci-lint run ./...

docker-build: ## Build Docker images
	@echo "Building Docker images..."
	$(DOCKER_COMPOSE) build

docker-up: ## Start all services with Docker Compose
	@echo "Starting services..."
	$(DOCKER_COMPOSE) up -d
	@echo "Waiting for services to be ready..."
	@sleep 10
	@echo "Services started!"
	@echo "API Gateway: http://localhost:8000"
	@echo "Prometheus: http://localhost:9090"
	@echo "Grafana: http://localhost:3000 (admin/admin)"
	@echo "Kibana: http://localhost:5601"
	@echo "Consul: http://localhost:8500"

docker-down: ## Stop all services
	@echo "Stopping services..."
	$(DOCKER_COMPOSE) down

docker-down-volumes: ## Stop all services and remove volumes
	@echo "Stopping services and removing volumes..."
	$(DOCKER_COMPOSE) down -v

docker-restart: docker-down docker-up ## Restart all services

logs: ## View logs from all services
	$(DOCKER_COMPOSE) logs -f

logs-gateway: ## View API Gateway logs
	$(DOCKER_COMPOSE) logs -f api-gateway

logs-auth: ## View Auth Service logs
	$(DOCKER_COMPOSE) logs -f auth-service

logs-postgres: ## View PostgreSQL logs
	$(DOCKER_COMPOSE) logs -f postgres

logs-redis: ## View Redis logs
	$(DOCKER_COMPOSE) logs -f redis

migrate-up: ## Run database migrations
	@echo "Running migrations..."
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d $(AUTH_DB) < services/auth/migrations/001_create_users_table.sql
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d $(AUTH_DB) < services/auth/migrations/002_add_passkey_support.sql
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d user < services/user/migrations/001_create_user_profiles.sql
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d user < services/user/migrations/002_documents.sql
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d shipper < services/shipper/migrations/001_create_shippers.sql
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d driver < services/driver/migrations/001_create_drivers.sql
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d fleet < services/fleet/migrations/001_create_fleet.sql
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d job < services/job/migrations/001_create_jobs.sql
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d matching < services/matching/migrations/001_create_matches.sql
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d bidding < services/bidding/migrations/001_create_bids.sql
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d backhaul < services/backhaul/migrations/001_create_backhaul.sql
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d tracking < services/tracking/migrations/001_create_tracking.sql
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d payment < services/payment/migrations/001_create_payments.sql
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d payment < services/payment/migrations/002_pricing.sql
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d payment < services/payment/migrations/003_stripe_subscription.sql
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d notification < services/notification/migrations/001_messaging.sql
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d rating < services/rating/migrations/001_create_ratings.sql
	@echo "Migrations completed!"

migrate-down: ## Rollback database migrations
	@echo "Rolling back migrations..."
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d $(AUTH_DB) -c "DROP TABLE IF EXISTS webauthn_challenges CASCADE; DROP TABLE IF EXISTS passkey_credentials CASCADE; DROP TABLE IF EXISTS users CASCADE; DROP TYPE IF EXISTS user_type; DROP TYPE IF EXISTS user_status;"
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d user -c "DROP TABLE IF EXISTS documents CASCADE; DROP TABLE IF EXISTS user_profiles CASCADE;"
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d shipper -c "DROP TABLE IF EXISTS shippers CASCADE;"
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d driver -c "DROP TABLE IF EXISTS vehicles CASCADE; DROP TABLE IF EXISTS drivers CASCADE;"
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d fleet -c "DROP TABLE IF EXISTS vehicle_handovers CASCADE; DROP TABLE IF EXISTS fleet_drivers CASCADE; DROP TABLE IF EXISTS fleet_vehicles CASCADE; DROP TABLE IF EXISTS fleets CASCADE;"
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d job -c "DROP TABLE IF EXISTS jobs CASCADE;"
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d matching -c "DROP TABLE IF EXISTS matches CASCADE;"
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d bidding -c "DROP TABLE IF EXISTS bids CASCADE;"
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d backhaul -c "DROP TABLE IF EXISTS backhaul_opportunities CASCADE;"
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d tracking -c "DROP TABLE IF EXISTS tracking_locations CASCADE; DROP TABLE IF EXISTS stops CASCADE; DROP TABLE IF EXISTS trips CASCADE;"
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d payment -c "DROP TABLE IF EXISTS stripe_subscriptions CASCADE; DROP TABLE IF EXISTS commission_tiers CASCADE; DROP TABLE IF EXISTS subscription_tiers CASCADE; DROP TABLE IF EXISTS transactions CASCADE; DROP TABLE IF EXISTS invoices CASCADE; DROP TABLE IF EXISTS platform_settings CASCADE;"
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d notification -c "DROP TABLE IF EXISTS messages CASCADE; DROP TABLE IF EXISTS conversations CASCADE; DROP TABLE IF EXISTS notifications CASCADE;"
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d rating -c "DROP TABLE IF EXISTS ratings CASCADE;"
	@echo "Rollback completed!"

db-shell: ## Open PostgreSQL shell
	docker exec -it $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d $(AUTH_DB)

redis-cli: ## Open Redis CLI
	docker exec -it truckify-redis redis-cli -a truckify_password

clean: ## Clean build artifacts
	@echo "Cleaning..."
	rm -f api-gateway/bin/*
	rm -f services/auth/bin/*
	rm -f coverage.out coverage.html

fmt: ## Format code
	@echo "Formatting code..."
	go fmt ./...

vet: ## Run go vet
	@echo "Running go vet..."
	go vet ./...

init: docker-up migrate-up ## Initialize project (start services and run migrations)
	@echo "Project initialized!"

dev: ## Start development environment
	@echo "Starting development environment..."
	$(MAKE) docker-up
	@sleep 5
	$(MAKE) migrate-up
	@echo "Development environment ready!"

status: ## Show status of services
	$(DOCKER_COMPOSE) ps

.DEFAULT_GOAL := help

test-integration: ## Run integration tests
	@./scripts/test-all.sh
