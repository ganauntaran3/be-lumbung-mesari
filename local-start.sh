#!/bin/bash

# Lumbung Mesari - Local Development Startup Script
# This script starts the development environment and the application

set -e  # Exit on any error

echo "🚀 Starting Lumbung Mesari Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_success "Docker is running"

# Check if docker-compose.yml or dev-compose.yml exists
if [ ! -f "dev-compose.yml" ]; then
    print_error "dev-compose.yml not found in current directory"
    exit 1
fi

print_success "Found dev-compose.yml"

# Step 1: Start Docker services
print_step "Starting Docker services (PostgreSQL, Adminer)..."
docker compose -f dev-compose.yml up -d

if [ $? -eq 0 ]; then
    print_success "Docker services started successfully"
else
    print_error "Failed to start Docker services"
    exit 1
fi

# Step 2: Wait for PostgreSQL to be ready
print_step "Waiting for PostgreSQL to be ready..."
sleep 5

# Check if PostgreSQL is ready
for i in {1..30}; do
    if docker compose -f dev-compose.yml exec postgres pg_isready -U postgres > /dev/null 2>&1; then
        print_success "PostgreSQL is ready"
        break
    fi
    
    if [ $i -eq 30 ]; then
        print_error "PostgreSQL failed to start within 30 seconds"
        exit 1
    fi
    
    echo -n "."
    sleep 1
done

# Step 3: Install dependencies (if node_modules doesn't exist)
if [ ! -d "node_modules" ]; then
    print_step "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed"
fi

# Step 4: # Check migrations status
npm run migrate:status

if [ $? -eq 0 ]; then
    print_success "Database migrations are up to date"
else
    print_warning "Database migrations are not up to date, running migrations..."
    npm run migrate:up
fi


# Step 5: Show service information
echo ""
echo "🎉 Development environment is ready!"
echo ""
echo "📊 Services:"
echo "  • PostgreSQL: localhost:5432"
echo "  • Adminer:    http://localhost:8080"
echo "    - Server:   postgres"
echo "    - Username: postgres" 
echo "    - Password: password"
echo "    - Database: lumbung_mesari"
echo ""
echo "🔧 API Documentation:"
echo "  • Swagger UI: http://localhost:8000/docs"
echo ""

# Step 6: Start the application
print_step "Starting the NestJS application..."
echo "Press Ctrl+C to stop the application and services"
echo ""

# Trap Ctrl+C to cleanup
cleanup() {
    echo ""
    print_step "Shutting down..."
    docker compose -f dev-compose.yml down
    print_success "Development environment stopped"
    exit 0
}

trap cleanup INT

# Start the application
npm run start:dev
