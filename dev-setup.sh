#!/bin/bash

# Quick development setup script
# Usage: ./dev-setup.sh [--clean] [--fresh]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CLEAN=false
FRESH=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN=true
            shift
            ;;
        --fresh)
            FRESH=true
            shift
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🚀 Development Environment Setup${NC}"
echo "=================================="

# Clean environment if requested
if [[ "$CLEAN" == true || "$FRESH" == true ]]; then
    echo -e "${YELLOW}🧹 Cleaning environment...${NC}"
    
    # Stop and remove containers
    docker-compose down 2>/dev/null || true
    
    # Remove containers and images
    docker rm -f tagix-frontend tagix-backend tagix-mongodb 2>/dev/null || true
    docker rmi -f tagix-frontend tagix-backend 2>/dev/null || true
    
    if [[ "$FRESH" == true ]]; then
        # Clean Docker system
        docker system prune -f
        echo -e "${GREEN}✅ Fresh environment prepared${NC}"
    else
        echo -e "${GREEN}✅ Environment cleaned${NC}"
    fi
fi

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

# Check Node.js (for testing)
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js not found - WebSocket tests will be skipped${NC}"
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Deploy the application
echo -e "${YELLOW}🚀 Deploying application...${NC}"
./deploy.sh

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Run health checks
echo -e "${YELLOW}🏥 Running health checks...${NC}"

# Check frontend
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    echo -e "${GREEN}✅ Frontend is healthy${NC}"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
fi

# Check backend
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/health | grep -q "200"; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
fi

# Check MongoDB
if docker exec tagix-mongodb mongosh --eval "db.runCommand('ping')" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MongoDB is healthy${NC}"
else
    echo -e "${RED}❌ MongoDB health check failed${NC}"
fi

# Test WebSocket if Node.js is available
if command -v node &> /dev/null; then
    echo -e "${YELLOW}🔌 Testing WebSocket...${NC}"
    if node test_frontend_websocket.js > /dev/null 2>&1; then
        echo -e "${GREEN}✅ WebSocket is working${NC}"
    else
        echo -e "${RED}❌ WebSocket test failed${NC}"
    fi
fi

# Display development URLs
echo ""
echo -e "${BLUE}🌐 Development URLs${NC}"
echo "=================="
echo -e "${GREEN}Frontend:${NC} http://localhost:3000"
echo -e "${GREEN}Backend API:${NC} http://localhost:8001/docs"
echo -e "${GREEN}MongoDB:${NC} localhost:27018"
echo ""

# Display useful commands
echo -e "${BLUE}🛠️  Useful Commands${NC}"
echo "=================="
echo -e "${YELLOW}View logs:${NC} docker-compose logs -f"
echo -e "${YELLOW}Run tests:${NC} ./run-tests.sh"
echo -e "${YELLOW}Debug environment:${NC} ./debug-environment.sh"
echo -e "${YELLOW}Stop services:${NC} docker-compose down"
echo -e "${YELLOW}Restart services:${NC} docker-compose restart"
echo ""

# Display development tips
echo -e "${BLUE}💡 Development Tips${NC}"
echo "=================="
echo "• Frontend changes are automatically reloaded"
echo "• Backend changes are automatically reloaded"
echo "• Use 'docker-compose logs -f' to view real-time logs"
echo "• Use './debug-environment.sh' to troubleshoot issues"
echo "• Use './run-tests.sh' to run comprehensive tests"
echo ""

echo -e "${GREEN}🎉 Development environment is ready!${NC}"
echo "Happy coding! 🚀"
