.PHONY: help install dev build clean docker-up docker-down docker-logs lint format

help:
	@echo "Available commands:"
	@echo "  make install      - Install all dependencies"
	@echo "  make dev          - Start all services in development mode"
	@echo "  make build        - Build all packages"
	@echo "  make clean        - Clean build artifacts and node_modules"
	@echo "  make docker-up    - Start Docker services"
	@echo "  make docker-down  - Stop Docker services"
	@echo "  make docker-logs  - View Docker logs"
	@echo "  make lint         - Run linting"
	@echo "  make format       - Format code"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

clean:
	rm -rf node_modules packages/*/node_modules packages/*/dist packages/*/.next

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

lint:
	npm run lint

format:
	npm run format
