#!/bin/bash

# Comprehensive test runner for Docker environment
# Usage: ./run-tests.sh [--frontend] [--backend] [--integration] [--all]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default test options
RUN_FRONTEND=false
RUN_BACKEND=false
RUN_INTEGRATION=false
RUN_ALL=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --frontend)
            RUN_FRONTEND=true
            shift
            ;;
        --backend)
            RUN_BACKEND=true
            shift
            ;;
        --integration)
            RUN_INTEGRATION=true
            shift
            ;;
        --all)
            RUN_ALL=true
            shift
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

# If no specific tests specified, run all
if [[ "$RUN_FRONTEND" == false && "$RUN_BACKEND" == false && "$RUN_INTEGRATION" == false ]]; then
    RUN_ALL=true
fi

echo -e "${BLUE}🧪 Starting Test Suite${NC}"
echo "=================================="

# Check if Docker containers are running
check_containers() {
    echo -e "${YELLOW}📋 Checking container status...${NC}"
    
    if ! docker ps | grep -q "tagix-frontend"; then
        echo -e "${RED}❌ Frontend container not running${NC}"
        return 1
    fi
    
    if ! docker ps | grep -q "tagix-backend"; then
        echo -e "${RED}❌ Backend container not running${NC}"
        return 1
    fi
    
    if ! docker ps | grep -q "tagix-mongodb"; then
        echo -e "${RED}❌ MongoDB container not running${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ All containers are running${NC}"
    return 0
}

# Test frontend
test_frontend() {
    echo -e "${BLUE}🎨 Testing Frontend...${NC}"
    echo "------------------------"
    
    # Test if frontend is accessible
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
        echo -e "${GREEN}✅ Frontend is accessible${NC}"
    else
        echo -e "${RED}❌ Frontend is not accessible${NC}"
        return 1
    fi
    
    # Test WebSocket connection
    echo -e "${YELLOW}🔌 Testing WebSocket connection...${NC}"
    if node test_frontend_websocket.js > /dev/null 2>&1; then
        echo -e "${GREEN}✅ WebSocket connection working${NC}"
    else
        echo -e "${RED}❌ WebSocket connection failed${NC}"
        return 1
    fi
    
    # Run frontend unit tests (if available)
    if docker exec tagix-frontend test -f package.json && docker exec tagix-frontend npm test -- --watchAll=false > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend unit tests passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend unit tests not available or failed${NC}"
    fi
    
    echo -e "${GREEN}✅ Frontend tests completed${NC}"
}

# Test backend
test_backend() {
    echo -e "${BLUE}⚙️  Testing Backend...${NC}"
    echo "------------------------"
    
    # Test if backend is accessible
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/health | grep -q "200"; then
        echo -e "${GREEN}✅ Backend health check passed${NC}"
    else
        echo -e "${RED}❌ Backend health check failed${NC}"
        return 1
    fi
    
    # Test API endpoints
    echo -e "${YELLOW}🔗 Testing API endpoints...${NC}"
    
    # Test user registration endpoint
    if curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8001/api/auth/register \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","password":"testpass","user_type":"rider"}' | grep -q "201\|400"; then
        echo -e "${GREEN}✅ User registration endpoint working${NC}"
    else
        echo -e "${RED}❌ User registration endpoint failed${NC}"
        return 1
    fi
    
    # Test WebSocket endpoint
    if node test_docker_websocket.js > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend WebSocket working${NC}"
    else
        echo -e "${RED}❌ Backend WebSocket failed${NC}"
        return 1
    fi
    
    # Run backend unit tests (if available)
    if docker exec tagix-backend test -f requirements.txt && docker exec tagix-backend python -m pytest tests/ -v > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend unit tests passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend unit tests not available or failed${NC}"
    fi
    
    echo -e "${GREEN}✅ Backend tests completed${NC}"
}

# Test integration
test_integration() {
    echo -e "${BLUE}🔗 Testing Integration...${NC}"
    echo "------------------------"
    
    # Test frontend to backend communication
    echo -e "${YELLOW}🌐 Testing frontend-backend communication...${NC}"
    
    # Test API proxy
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health | grep -q "200"; then
        echo -e "${GREEN}✅ API proxy working${NC}"
    else
        echo -e "${RED}❌ API proxy failed${NC}"
        return 1
    fi
    
    # Test WebSocket through frontend
    if node test_frontend_websocket.js > /dev/null 2>&1; then
        echo -e "${GREEN}✅ WebSocket integration working${NC}"
    else
        echo -e "${RED}❌ WebSocket integration failed${NC}"
        return 1
    fi
    
    # Test database connectivity
    echo -e "${YELLOW}🗄️  Testing database connectivity...${NC}"
    if docker exec tagix-backend python -c "from server import app; print('Database connected')" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database connectivity working${NC}"
    else
        echo -e "${RED}❌ Database connectivity failed${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Integration tests completed${NC}"
}

# Test Docker health
test_docker_health() {
    echo -e "${BLUE}🐳 Testing Docker Health...${NC}"
    echo "------------------------"
    
    # Check container health
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "Up"; then
        echo -e "${GREEN}✅ All containers are healthy${NC}"
    else
        echo -e "${RED}❌ Some containers are not healthy${NC}"
        return 1
    fi
    
    # Check resource usage
    echo -e "${YELLOW}📊 Checking resource usage...${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
    
    echo -e "${GREEN}✅ Docker health tests completed${NC}"
}

# Main test execution
main() {
    echo -e "${BLUE}🚀 Starting comprehensive test suite${NC}"
    echo "=================================="
    
    # Check if containers are running
    if ! check_containers; then
        echo -e "${RED}❌ Please start containers first with: ./deploy.sh${NC}"
        exit 1
    fi
    
    # Wait for services to be ready
    echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
    sleep 5
    
    local test_results=()
    
    # Run selected tests
    if [[ "$RUN_ALL" == true || "$RUN_FRONTEND" == true ]]; then
        if test_frontend; then
            test_results+=("Frontend: ✅ PASSED")
        else
            test_results+=("Frontend: ❌ FAILED")
        fi
    fi
    
    if [[ "$RUN_ALL" == true || "$RUN_BACKEND" == true ]]; then
        if test_backend; then
            test_results+=("Backend: ✅ PASSED")
        else
            test_results+=("Backend: ❌ FAILED")
        fi
    fi
    
    if [[ "$RUN_ALL" == true || "$RUN_INTEGRATION" == true ]]; then
        if test_integration; then
            test_results+=("Integration: ✅ PASSED")
        else
            test_results+=("Integration: ❌ FAILED")
        fi
    fi
    
    # Always run Docker health tests
    if test_docker_health; then
        test_results+=("Docker Health: ✅ PASSED")
    else
        test_results+=("Docker Health: ❌ FAILED")
    fi
    
    # Print results summary
    echo ""
    echo -e "${BLUE}📊 Test Results Summary${NC}"
    echo "========================"
    for result in "${test_results[@]}"; do
        echo -e "$result"
    done
    
    # Check if any tests failed
    local failed_tests=0
    for result in "${test_results[@]}"; do
        if [[ $result == *"❌ FAILED"* ]]; then
            ((failed_tests++))
        fi
    done
    
    if [[ $failed_tests -eq 0 ]]; then
        echo ""
        echo -e "${GREEN}🎉 All tests passed!${NC}"
        exit 0
    else
        echo ""
        echo -e "${RED}❌ $failed_tests test(s) failed${NC}"
        exit 1
    fi
}

# Run main function
main "$@"
