#!/bin/bash

# AI Court Reporting & Legal Transcription Service - Startup Script
# This script sets up and starts the entire application

set -e

echo "=============================================="
echo "  AI Court Reporting & Legal Transcription"
echo "  Starting Application..."
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✓ Environment variables loaded${NC}"
else
    echo -e "${RED}✗ .env file not found! Please create one.${NC}"
    exit 1
fi

# Function to kill processes on specific ports
cleanup_ports() {
    echo -e "\n${YELLOW}Cleaning up ports...${NC}"
    for port in 3000 3001; do
        PID=$(lsof -ti:$port 2>/dev/null || true)
        if [ -n "$PID" ]; then
            echo -e "  Killing process on port $port (PID: $PID)"
            kill -9 $PID 2>/dev/null || true
            sleep 1
        fi
    done
    echo -e "${GREEN}✓ Ports cleaned${NC}"
}

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    cleanup_ports
    echo -e "${GREEN}✓ All services stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Step 1: Clean up ports
cleanup_ports

# Step 2: Check PostgreSQL
echo -e "\n${BLUE}Checking PostgreSQL...${NC}"
if command -v pg_isready &>/dev/null; then
    if pg_isready -q 2>/dev/null; then
        echo -e "${GREEN}✓ PostgreSQL is running${NC}"
    else
        echo -e "${YELLOW}Starting PostgreSQL...${NC}"
        if command -v brew &>/dev/null; then
            brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
        fi
        sleep 2
        if pg_isready -q 2>/dev/null; then
            echo -e "${GREEN}✓ PostgreSQL started${NC}"
        else
            echo -e "${RED}✗ Could not start PostgreSQL. Please start it manually.${NC}"
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠ pg_isready not found, assuming PostgreSQL is running${NC}"
fi

# Step 3: Install server dependencies
echo -e "\n${BLUE}Installing server dependencies...${NC}"
cd "$PROJECT_DIR/server"
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    npm install --silent 2>&1 | tail -1
    echo -e "${GREEN}✓ Server dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Server dependencies already up to date${NC}"
fi

# Step 4: Install client dependencies
echo -e "\n${BLUE}Installing client dependencies...${NC}"
cd "$PROJECT_DIR/client"
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    npm install --silent 2>&1 | tail -1
    echo -e "${GREEN}✓ Client dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Client dependencies already up to date${NC}"
fi

# Step 5: Setup database and seed data
echo -e "\n${BLUE}Setting up database and seeding data...${NC}"
cd "$PROJECT_DIR/server"
node seed.js
echo -e "${GREEN}✓ Database seeded successfully${NC}"

# Step 6: Start server with nodemon (auto-reload on changes)
echo -e "\n${BLUE}Starting backend server with auto-reload (port ${SERVER_PORT:-3001})...${NC}"
cd "$PROJECT_DIR/server"
npx nodemon --watch . --ext js,json index.js &
SERVER_PID=$!
echo -e "${GREEN}✓ Backend server starting (PID: $SERVER_PID)${NC}"

# Wait for server to be ready
echo -e "${YELLOW}  Waiting for server to be ready...${NC}"
for i in {1..30}; do
    if curl -s "http://localhost:${SERVER_PORT:-3001}/api/dashboard" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend server is ready${NC}"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Server failed to start in 30 seconds${NC}"
    fi
done

# Step 7: Start client with hot reload
echo -e "\n${BLUE}Starting frontend client (port ${CLIENT_PORT:-3000})...${NC}"
cd "$PROJECT_DIR/client"
BROWSER=none PORT=${CLIENT_PORT:-3000} npx react-scripts start &
CLIENT_PID=$!
echo -e "${GREEN}✓ Frontend client starting (PID: $CLIENT_PID)${NC}"

echo ""
echo "=============================================="
echo -e "${GREEN}  Application is starting!${NC}"
echo "=============================================="
echo -e "  Frontend: ${BLUE}http://localhost:${CLIENT_PORT:-3000}${NC}"
echo -e "  Backend:  ${BLUE}http://localhost:${SERVER_PORT:-3001}${NC}"
echo ""
echo -e "  Login: ${YELLOW}admin@courtreport.com / password123${NC}"
echo -e "  (or use the Quick Login button)"
echo ""
echo -e "  ${YELLOW}Both servers auto-reload on code changes${NC}"
echo -e "  Press ${RED}Ctrl+C${NC} to stop all services"
echo "=============================================="

# Wait for both processes
wait $SERVER_PID $CLIENT_PID
