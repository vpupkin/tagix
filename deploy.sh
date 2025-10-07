#!/bin/bash

# deploy.sh - Smart Docker Deployment with Git Sync
set -e

echo "🚀 TAGIX SMART DOCKER DEPLOYMENT"
echo "================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check Docker
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check docker compose
if ! docker compose version &> /dev/null; then
    print_error "docker compose is not installed."
    exit 1
fi

# Check .env file
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        print_warning "Please edit .env file with your actual API keys."
        print_warning "Press Enter when ready, or Ctrl+C to cancel..."
        read
    else
        print_error ".env.example file not found."
        exit 1
    fi
fi

# Parse arguments
CLEAN_BUILD=false
SKIP_TESTS=false
PUSH_CHANGES=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN_BUILD=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --push)
            PUSH_CHANGES=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

print_status "Starting smart deployment process..."

# Step 1: Git operations
if [ "$PUSH_CHANGES" = true ]; then
    print_status "Step 1: Git operations..."
    git add .
    git commit -m "Auto-deploy: $(date '+%Y-%m-%d %H:%M:%S')" || print_warning "No changes to commit"
    git push origin main || print_warning "Failed to push to remote"
    print_success "Git operations completed"
fi

# Step 2: Stop existing containers
print_status "Step 2: Stopping existing containers..."
docker compose down --remove-orphans
print_success "Containers stopped"

# Step 3: Clean build (optional)
if [ "$CLEAN_BUILD" = true ]; then
    print_status "Step 3: Clean build - removing old images..."
    docker compose down --rmi all --volumes --remove-orphans
    print_success "Old images cleaned"
else
    print_status "Step 3: Fast rebuild - keeping base images..."
fi

# Step 4: Build images
print_status "Step 4: Building images..."
if [ "$CLEAN_BUILD" = true ]; then
    docker compose build --no-cache
else
    docker compose build
fi
print_success "Images built"

# Step 5: Start services
print_status "Step 5: Starting services..."
docker compose up -d
print_success "Services started"

# Step 6: Wait for health checks
print_status "Step 6: Waiting for services to be healthy..."
sleep 15

# Step 7: Health checks
print_status "Step 7: Running health checks..."

# Check MongoDB
if docker compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    print_success "✅ MongoDB is healthy"
else
    print_warning "⚠️  MongoDB health check failed"
fi

# Check Backend API
if curl -f http://localhost:8001/api/health > /dev/null 2>&1; then
    print_success "✅ Backend API is healthy"
else
    print_warning "⚠️  Backend API health check failed"
fi

# Check Frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_success "✅ Frontend is healthy"
else
    print_warning "⚠️  Frontend health check failed"
fi

# Step 8: Run tests (optional)
if [ "$SKIP_TESTS" = false ]; then
    print_status "Step 8: Running API tests..."
    
    # Test backend API
    if curl -f http://localhost:8001/api/health > /dev/null 2>&1; then
        print_success "✅ Backend API test passed"
    else
        print_warning "⚠️  Backend API test failed"
    fi
    
    # Test frontend
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_success "✅ Frontend test passed"
    else
        print_warning "⚠️  Frontend test failed"
    fi
fi

# Step 9: Show status
print_status "Step 9: Service status:"
docker compose ps

echo ""
print_success "🎉 DEPLOYMENT COMPLETED!"
echo ""
echo "📋 Service URLs:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8001"
echo "   MongoDB:   mongodb://localhost:27017"
echo ""
echo "📊 Useful commands:"
echo "   View logs:     docker compose logs -f"
echo "   Stop services: docker compose down"
echo "   Restart:       ./deploy.sh"
echo "   Clean rebuild: ./deploy.sh --clean"
echo "   Skip tests:    ./deploy.sh --skip-tests"
echo "   Push changes:  ./deploy.sh --push"
echo ""

