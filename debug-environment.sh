#!/bin/bash

# Comprehensive debugging and troubleshooting script for Docker environment
# Usage: ./debug-environment.sh [--logs] [--network] [--database] [--websocket] [--all]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default options
SHOW_LOGS=false
CHECK_NETWORK=false
CHECK_DATABASE=false
CHECK_WEBSOCKET=false
CHECK_ALL=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --logs)
            SHOW_LOGS=true
            shift
            ;;
        --network)
            CHECK_NETWORK=true
            shift
            ;;
        --database)
            CHECK_DATABASE=true
            shift
            ;;
        --websocket)
            CHECK_WEBSOCKET=true
            shift
            ;;
        --all)
            CHECK_ALL=true
            shift
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

# If no specific checks specified, run all
if [[ "$SHOW_LOGS" == false && "$CHECK_NETWORK" == false && "$CHECK_DATABASE" == false && "$CHECK_WEBSOCKET" == false ]]; then
    CHECK_ALL=true
fi

echo -e "${BLUE}🔍 Docker Environment Debug Tool${NC}"
echo "=================================="

# Check container status
check_containers() {
    echo -e "${CYAN}📋 Container Status${NC}"
    echo "-------------------"
    
    if docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -q "tagix-"; then
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep "tagix-"
        echo -e "${GREEN}✅ Containers are running${NC}"
    else
        echo -e "${RED}❌ No tagix containers found${NC}"
        echo "Run './deploy.sh' to start containers"
        return 1
    fi
    echo ""
}

# Show logs
show_logs() {
    echo -e "${CYAN}📝 Container Logs${NC}"
    echo "-----------------"
    
    echo -e "${YELLOW}Frontend logs (last 20 lines):${NC}"
    docker logs tagix-frontend --tail 20 2>/dev/null || echo -e "${RED}❌ Frontend container not found${NC}"
    echo ""
    
    echo -e "${YELLOW}Backend logs (last 20 lines):${NC}"
    docker logs tagix-backend --tail 20 2>/dev/null || echo -e "${RED}❌ Backend container not found${NC}"
    echo ""
    
    echo -e "${YELLOW}MongoDB logs (last 20 lines):${NC}"
    docker logs tagix-mongodb --tail 20 2>/dev/null || echo -e "${RED}❌ MongoDB container not found${NC}"
    echo ""
}

# Check network connectivity
check_network() {
    echo -e "${CYAN}🌐 Network Connectivity${NC}"
    echo "------------------------"
    
    # Check Docker network
    echo -e "${YELLOW}Docker networks:${NC}"
    docker network ls | grep tagix || echo -e "${RED}❌ No tagix network found${NC}"
    echo ""
    
    # Check port accessibility
    echo -e "${YELLOW}Port accessibility:${NC}"
    
    # Frontend port
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
        echo -e "${GREEN}✅ Frontend (3000): Accessible${NC}"
    else
        echo -e "${RED}❌ Frontend (3000): Not accessible${NC}"
    fi
    
    # Backend port
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/health | grep -q "200"; then
        echo -e "${GREEN}✅ Backend (8001): Accessible${NC}"
    else
        echo -e "${RED}❌ Backend (8001): Not accessible${NC}"
    fi
    
    # MongoDB port
    if docker exec tagix-mongodb mongosh --eval "db.runCommand('ping')" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ MongoDB (27018): Accessible${NC}"
    else
        echo -e "${RED}❌ MongoDB (27018): Not accessible${NC}"
    fi
    
    # Check container-to-container communication
    echo -e "${YELLOW}Container-to-container communication:${NC}"
    
    # Frontend to Backend
    if docker exec tagix-frontend curl -s -o /dev/null -w "%{http_code}" http://backend:8001/api/health | grep -q "200"; then
        echo -e "${GREEN}✅ Frontend → Backend: Working${NC}"
    else
        echo -e "${RED}❌ Frontend → Backend: Failed${NC}"
    fi
    
    # Backend to MongoDB
    if docker exec tagix-backend python -c "import pymongo; pymongo.MongoClient('mongodb://admin:password123@mongodb:27017/tagix_db?authSource=admin').admin.command('ping')" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend → MongoDB: Working${NC}"
    else
        echo -e "${RED}❌ Backend → MongoDB: Failed${NC}"
    fi
    
    echo ""
}

# Check database
check_database() {
    echo -e "${CYAN}🗄️  Database Status${NC}"
    echo "-------------------"
    
    # Check MongoDB connection
    echo -e "${YELLOW}MongoDB connection:${NC}"
    if docker exec tagix-mongodb mongosh --eval "db.runCommand('ping')" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ MongoDB is running${NC}"
    else
        echo -e "${RED}❌ MongoDB is not responding${NC}"
        return 1
    fi
    
    # Check database and collections
    echo -e "${YELLOW}Database structure:${NC}"
    docker exec tagix-mongodb mongosh tagix_db --eval "db.getCollectionNames()" 2>/dev/null || echo -e "${RED}❌ Cannot access tagix_db${NC}"
    
    # Check user authentication
    echo -e "${YELLOW}User authentication:${NC}"
    if docker exec tagix-mongodb mongosh -u admin -p password123 --authenticationDatabase admin --eval "db.runCommand('ping')" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ MongoDB authentication working${NC}"
    else
        echo -e "${RED}❌ MongoDB authentication failed${NC}"
    fi
    
    # Check data
    echo -e "${YELLOW}Sample data:${NC}"
    docker exec tagix-mongodb mongosh tagix_db -u admin -p password123 --authenticationDatabase admin --eval "db.users.countDocuments()" 2>/dev/null || echo -e "${YELLOW}⚠️  No users found or cannot access${NC}"
    
    echo ""
}

# Check WebSocket
check_websocket() {
    echo -e "${CYAN}🔌 WebSocket Status${NC}"
    echo "-------------------"
    
    # Test direct WebSocket connection
    echo -e "${YELLOW}Direct WebSocket connection:${NC}"
    if node test_docker_websocket.js > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Direct WebSocket connection working${NC}"
    else
        echo -e "${RED}❌ Direct WebSocket connection failed${NC}"
    fi
    
    # Test WebSocket through frontend
    echo -e "${YELLOW}WebSocket through frontend:${NC}"
    if node test_frontend_websocket.js > /dev/null 2>&1; then
        echo -e "${GREEN}✅ WebSocket through frontend working${NC}"
    else
        echo -e "${RED}❌ WebSocket through frontend failed${NC}"
    fi
    
    # Check WebSocket endpoint
    echo -e "${YELLOW}WebSocket endpoint:${NC}"
    if curl -s -I -H "Upgrade: websocket" -H "Connection: Upgrade" http://localhost:8001/ws/test | grep -q "101\|400"; then
        echo -e "${GREEN}✅ WebSocket endpoint responding${NC}"
    else
        echo -e "${RED}❌ WebSocket endpoint not responding${NC}"
    fi
    
    echo ""
}

# Check environment variables
check_environment() {
    echo -e "${CYAN}🔧 Environment Variables${NC}"
    echo "------------------------"
    
    echo -e "${YELLOW}Frontend environment:${NC}"
    docker exec tagix-frontend env | grep REACT_APP || echo -e "${YELLOW}⚠️  No REACT_APP variables found${NC}"
    echo ""
    
    echo -e "${YELLOW}Backend environment:${NC}"
    docker exec tagix-backend env | grep -E "(MONGO|JWT|CORS|GOOGLE|STRIPE)" || echo -e "${YELLOW}⚠️  No backend environment variables found${NC}"
    echo ""
}

# Check resource usage
check_resources() {
    echo -e "${CYAN}📊 Resource Usage${NC}"
    echo "------------------"
    
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
    echo ""
}

# Check file permissions
check_permissions() {
    echo -e "${CYAN}🔐 File Permissions${NC}"
    echo "-------------------"
    
    echo -e "${YELLOW}Frontend permissions:${NC}"
    docker exec tagix-frontend ls -la /app/ | head -5
    echo ""
    
    echo -e "${YELLOW}Backend permissions:${NC}"
    docker exec tagix-backend ls -la /app/ | head -5
    echo ""
}

# Provide troubleshooting suggestions
troubleshooting_suggestions() {
    echo -e "${CYAN}🛠️  Troubleshooting Suggestions${NC}"
    echo "-------------------------------"
    
    echo -e "${YELLOW}Common fixes:${NC}"
    echo "1. Restart containers: docker-compose down && ./deploy.sh"
    echo "2. Clean Docker cache: docker system prune -f"
    echo "3. Check port conflicts: sudo lsof -i :3000 :8001 :27018"
    echo "4. Fix permissions: sudo chown -R \$USER:\$USER ."
    echo "5. Rebuild containers: docker-compose up --build"
    echo ""
    
    echo -e "${YELLOW}WebSocket issues:${NC}"
    echo "1. Check proxy configuration: docker logs tagix-frontend | grep setupProxy"
    echo "2. Test WebSocket: node test_frontend_websocket.js"
    echo "3. Check backend WebSocket: docker logs tagix-backend | grep WebSocket"
    echo ""
    
    echo -e "${YELLOW}Database issues:${NC}"
    echo "1. Check MongoDB logs: docker logs tagix-mongodb"
    echo "2. Test connection: docker exec tagix-mongodb mongosh"
    echo "3. Check authentication: docker exec tagix-mongodb mongosh -u admin -p password123"
    echo ""
}

# Main function
main() {
    echo -e "${BLUE}🔍 Starting comprehensive environment debug${NC}"
    echo "=================================="
    
    # Always check container status first
    check_containers
    
    # Run selected checks
    if [[ "$CHECK_ALL" == true || "$SHOW_LOGS" == true ]]; then
        show_logs
    fi
    
    if [[ "$CHECK_ALL" == true || "$CHECK_NETWORK" == true ]]; then
        check_network
    fi
    
    if [[ "$CHECK_ALL" == true || "$CHECK_DATABASE" == true ]]; then
        check_database
    fi
    
    if [[ "$CHECK_ALL" == true || "$CHECK_WEBSOCKET" == true ]]; then
        check_websocket
    fi
    
    # Always run these checks
    check_environment
    check_resources
    check_permissions
    troubleshooting_suggestions
    
    echo -e "${GREEN}🎉 Debug analysis complete!${NC}"
    echo "Use the suggestions above to resolve any issues."
}

# Run main function
main "$@"
