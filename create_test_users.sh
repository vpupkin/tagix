#!/bin/bash

# create_test_users.sh - Quick script to recreate test users
set -e

echo "🚀 TAGIX TEST USERS CREATION"
echo "============================="
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

# Check if backend is running
if ! curl -f http://localhost:8001/api/health > /dev/null 2>&1; then
    print_error "Backend API is not running. Please start the services first with ./deploy.sh"
    exit 1
fi

print_status "Backend API is running. Creating test users..."

# Create DRRRRRRR2nd driver
print_status "Creating DRRRRRRR2nd driver..."
DRIVER_RESPONSE=$(curl -s -X POST http://localhost:8001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name": "DRRRRRRR2nd", "email": "driver@yourdomain.com", "password": "testpass123", "phone": "11111111111", "role": "driver"}')

if echo "$DRIVER_RESPONSE" | grep -q "successfully"; then
    print_success "✅ DRRRRRRR2nd driver created"
else
    print_warning "⚠️  DRRRRRRR2nd driver may already exist or failed to create"
fi

# Create test admin
print_status "Creating test admin..."
ADMIN_RESPONSE=$(curl -s -X POST http://localhost:8001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name": "Test Admin", "email": "testadmin@test.com", "password": "testpass123", "phone": "+1234567890", "role": "admin"}')

if echo "$ADMIN_RESPONSE" | grep -q "successfully"; then
    print_success "✅ Test Admin created"
else
    print_warning "⚠️  Test Admin may already exist or failed to create"
fi

# Create test rider
print_status "Creating test rider..."
RIDER_RESPONSE=$(curl -s -X POST http://localhost:8001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name": "Test Rider", "email": "testrider@test.com", "password": "testpass123", "phone": "+1234567890", "role": "rider"}')

if echo "$RIDER_RESPONSE" | grep -q "successfully"; then
    print_success "✅ Test Rider created"
else
    print_warning "⚠️  Test Rider may already exist or failed to create"
fi

# Create test driver
print_status "Creating test driver..."
DRIVER2_RESPONSE=$(curl -s -X POST http://localhost:8001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name": "Test Driver", "email": "testdriver@test.com", "password": "testpass123", "phone": "+1234567891", "role": "driver"}')

if echo "$DRIVER2_RESPONSE" | grep -q "successfully"; then
    print_success "✅ Test Driver created"
else
    print_warning "⚠️  Test Driver may already exist or failed to create"
fi

echo ""
print_status "Checking user count..."
USER_COUNT=$(curl -s http://localhost:8001/api/admin/stats | grep -o '"total_users":[0-9]*' | cut -d':' -f2)
if [ -n "$USER_COUNT" ]; then
    print_success "✅ Total users in system: $USER_COUNT"
else
    print_warning "⚠️  Could not retrieve user count"
fi

echo ""
print_success "🎉 Test users creation completed!"
echo ""
echo "📋 Test User Credentials:"
echo "   Admin:  testadmin@test.com / testpass123"
echo "   Rider:  testrider@test.com / testpass123"
echo "   Driver: testdriver@test.com / testpass123"
echo "   DRRRRRRR2nd: driver@yourdomain.com / testpass123"
echo ""
echo "🌐 Access URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8001"
echo ""
