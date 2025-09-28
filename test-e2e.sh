#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting E2E Test Setup...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Stop any existing test database containers first
echo -e "${YELLOW}🧹 Cleaning up any existing test containers...${NC}"
docker-compose -f dev-compose.yml --profile test down

# Start test database
echo -e "${YELLOW}📦 Starting test database...${NC}"
docker-compose -f dev-compose.yml --profile test up -d postgres_test

# Wait for database to be ready
echo -e "${YELLOW}⏳ Waiting for test database to be ready...${NC}"
timeout=60
counter=0

while ! docker-compose -f dev-compose.yml exec -T postgres_test pg_isready -U admin -d db_lumbung_mesari_test > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        echo -e "${RED}❌ Test database failed to start within $timeout seconds${NC}"
        exit 1
    fi
    echo -e "${YELLOW}⏳ Waiting for database... ($counter/$timeout)${NC}"
    sleep 1
    counter=$((counter + 1))
done

echo -e "${GREEN}✅ Test database is ready!${NC}"

# Run migrations on test database
echo -e "${YELLOW}🔄 Running migrations on test database...${NC}"
NODE_ENV=test DB_HOST=localhost DB_PORT=5433 DB_NAME=db_lumbung_mesari_test DB_USER=admin DB_PASSWORD=admin123 npm run migrate:latest

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Migration failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Migrations completed successfully!${NC}"

# Run seeds on test database (for basic required data like roles)
echo -e "${YELLOW}🌱 Running seeds on test database...${NC}"
NODE_ENV=test DB_HOST=localhost DB_PORT=5433 DB_NAME=db_lumbung_mesari_test DB_USER=admin DB_PASSWORD=admin123 npm run seed:run

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Seeds failed or no seeds found - continuing with tests${NC}"
fi

echo -e "${GREEN}✅ Database setup completed!${NC}"

# Run E2E tests
echo -e "${YELLOW}🧪 Running E2E tests...${NC}"
npm run test:e2e

# Capture test result
test_result=$?

# Cleanup: Stop test database
echo -e "${YELLOW}🧹 Cleaning up test database...${NC}"
docker-compose -f dev-compose.yml --profile test down

if [ $test_result -eq 0 ]; then
    echo -e "${GREEN}✅ All E2E tests passed!${NC}"
else
    echo -e "${RED}❌ Some E2E tests failed${NC}"
fi

exit $test_result