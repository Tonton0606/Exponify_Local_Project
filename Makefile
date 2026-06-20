# Hermes Enterprise Portal - Makefile
# Standardized commands for development, building, and deployment

.PHONY: help install dev build clean docker-build docker-dev docker-up docker-down lint format test

# Default target
help:
	@echo "Hermes Enterprise Portal - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make install       Install all dependencies"
	@echo "  make dev          Start development servers (client + server)"
	@echo "  make dev-client   Start client development server only"
	@echo "  make dev-server   Start server development server only"
	@echo ""
	@echo "Building:"
	@echo "  make build        Build production client"
	@echo "  make build-client Build client only"
	@echo "  make build-server Build server only"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build Build production Docker images"
	@echo "  make docker-dev   Start development containers with hot reload"
	@echo "  make docker-up    Start production containers"
	@echo "  make docker-down  Stop all containers"
	@echo "  make docker-logs  View container logs"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint         Run ESLint on all code"
	@echo "  make format       Run Prettier to format code"
	@echo "  make test         Run test suite"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean        Clean node_modules and build files"
	@echo "  make reset        Full reset (clean + install)"

# Development
install:
	@echo "Installing root dependencies..."
	npm install
	@echo "Installing client dependencies..."
	cd client && npm install
	@echo "Installing server dependencies..."
	cd server && npm install
	@echo "✅ All dependencies installed!"

dev:
	@echo "Starting development servers..."
	npm run dev

dev-client:
	@echo "Starting client development server..."
	cd client && npm run dev

dev-server:
	@echo "Starting server development server..."
	cd server && npm run dev

# Building
build: build-client

build-client:
	@echo "Building client for production..."
	cd client && npm run build
	@echo "✅ Client build complete!"

build-server:
	@echo "Server doesn't require build step (Node.js)"
	@echo "✅ Server ready!"

# Docker
docker-build:
	@echo "Building production Docker images..."
	docker compose -f docker-compose.yml build --no-cache
	@echo "✅ Docker images built!"

docker-build-fast:
	@echo "Building Docker images (with cache)..."
	docker compose -f docker-compose.yml build
	@echo "✅ Docker images built!"

docker-dev:
	@echo "Starting development containers (hot-reload)..."
	docker compose up -d
	@echo "✅ Development containers started!"
	@echo "  Client (Vite):  http://localhost:5173"
	@echo "  Server (API):   http://localhost:5000"
	@echo "  Redis:          localhost:6379"

docker-up:
	@echo "Starting production containers..."
	docker compose -f docker-compose.yml up -d
	@echo "✅ Production containers started!"
	@echo "  Application:    http://localhost"
	@echo "  Health check:   http://localhost/health"

docker-ps:
	docker compose ps

docker-logs:
	docker compose logs -f

docker-logs-server:
	docker compose logs -f server

docker-logs-client:
	docker compose logs -f client

docker-down:
	@echo "Stopping containers..."
	docker-compose down
	@echo "✅ Containers stopped!"

docker-logs:
	@echo "Showing container logs (Ctrl+C to exit)..."
	docker-compose logs -f

docker-clean:
	@echo "Removing containers and images..."
	docker-compose down -v --rmi all
	@echo "✅ Docker cleaned!"

# Code Quality
lint:
	@echo "Running ESLint..."
	cd client && npm run lint
	@echo "✅ Linting complete!"

format:
	@echo "Running Prettier..."
	cd client && npm run format
	@echo "✅ Formatting complete!"

test:
	@echo "Running tests..."
	cd client && npm test
	@echo "✅ Tests complete!"

# Maintenance
clean:
	@echo "Cleaning node_modules and build files..."
	rm -rf node_modules
	rm -rf client/node_modules
	rm -rf server/node_modules
	rm -rf client/dist
	@echo "✅ Clean complete!"

reset: clean install
	@echo "✅ Full reset complete!"

# Database
db-migrate:
	@echo "Running database migrations..."
	@echo "Please run SQL files in Supabase SQL Editor:"
	@echo "  - database/migrations/001_initial_setup.sql"
	@echo "  - database/migrations/002_rls_policies.sql"
	@echo "  - database/migrations/003_security_features.sql"

db-seed:
	@echo "Seeding database..."
	@echo "Please run seed files in Supabase SQL Editor:"
	@echo "  - database/seeds/initial_data.sql"

# Deployment
deploy-staging:
	@echo "Deploying to staging..."
	@echo "Run deployment scripts here"

deploy-production:
	@echo "Deploying to production..."
	@echo "Run deployment scripts here"
