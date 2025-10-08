# 🚀 Development Workflow Guide

## ⚠️ CRITICAL: DOCKER DEPLOYMENT ONLY

**ALWAYS use `./deploy.sh` for development - NEVER run services directly!**

## Overview

This document outlines the complete development workflow for ongoing feature development, bugfixing, and testing in the Docker containerized environment.

## 🔄 Development Cycle

### 1. **Feature Development Workflow**

#### Step 1: Environment Setup
```bash
# Clone and setup
git clone <repository-url>
cd tagix
git checkout main

# Start development environment
./deploy.sh
```

#### Step 2: Feature Branch Creation
```bash
# Create feature branch
git checkout -b feature/new-feature-name

# Or for bugfixes
git checkout -b bugfix/issue-description
```

#### Step 3: Development with Hot Reload
```bash
# Frontend development (auto-reloads on changes)
# No additional commands needed - changes are reflected immediately

# Backend development (auto-reloads on changes)
# No additional commands needed - FastAPI auto-reloads

# View logs in real-time
docker-compose logs -f frontend
docker-compose logs -f backend
```

#### Step 4: Testing During Development
```bash
# Run automated tests
./run-tests.sh

# Test specific functionality
node test_frontend_websocket.js
python backend/test_specific_feature.py

# Manual testing
# Frontend: http://localhost:3000
# Backend API: http://localhost:8001/docs
```

#### Step 5: Code Quality Checks
```bash
# Frontend linting (if needed)
docker exec tagix-frontend npm run lint

# Backend linting
docker exec tagix-backend python -m flake8 .

# Type checking
docker exec tagix-backend python -m mypy .
```

### 2. **Bug Fixing Workflow**

#### Step 1: Reproduce the Bug
```bash
# Start clean environment
docker-compose down
./deploy.sh

# Reproduce the issue
# Document steps to reproduce
```

#### Step 2: Debug the Issue
```bash
# Check logs
docker logs tagix-frontend --tail 50
docker logs tagix-backend --tail 50
docker logs tagix-mongodb --tail 50

# Access container for debugging
docker exec -it tagix-backend bash
docker exec -it tagix-frontend sh

# Check database state
docker exec -it tagix-mongodb mongosh
```

#### Step 3: Fix and Test
```bash
# Make changes (hot reload will apply them)
# Test the fix
./run-tests.sh

# Verify fix works
# Test specific scenario that was broken
```

### 3. **Testing Workflow**

#### Automated Testing
```bash
# Run all tests
./run-tests.sh

# Run specific test suites
./run-tests.sh --frontend
./run-tests.sh --backend
./run-tests.sh --integration
```

#### Manual Testing Checklist
- [ ] Frontend loads correctly
- [ ] User registration/login works
- [ ] WebSocket connections work
- [ ] API endpoints respond correctly
- [ ] Database operations work
- [ ] Payment integration works
- [ ] Google Maps integration works

## 🛠️ Development Tools & Commands

### Essential Commands

#### Container Management
```bash
# Start all services
./deploy.sh

# Stop all services
docker-compose down

# Restart specific service
docker restart tagix-frontend
docker restart tagix-backend

# View service status
docker ps
docker-compose ps
```

#### Development Commands
```bash
# View logs
docker logs tagix-frontend -f
docker logs tagix-backend -f
docker logs tagix-mongodb -f

# Execute commands in containers
docker exec -it tagix-backend bash
docker exec -it tagix-frontend sh

# Install new packages
docker exec tagix-backend pip install new-package
docker exec tagix-frontend npm install new-package
```

#### Database Operations
```bash
# Access MongoDB
docker exec -it tagix-mongodb mongosh

# Backup database
docker exec tagix-mongodb mongodump --out /backup

# Restore database
docker exec tagix-mongodb mongorestore /backup
```

### Debugging Tools

#### Frontend Debugging
```bash
# Check browser console
# Open http://localhost:3000 in browser
# Use browser dev tools

# Check WebSocket connections
node test_frontend_websocket.js

# Check API proxy
curl -I http://localhost:3000/api/health
```

#### Backend Debugging
```bash
# Check API endpoints
curl http://localhost:8001/api/health
curl http://localhost:8001/docs

# Check WebSocket
node test_docker_websocket.js

# Check database connection
docker exec tagix-backend python -c "from server import app; print('DB connected')"
```

## 🧪 Testing Framework

### Test Structure
```
tests/
├── frontend/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── backend/
│   ├── unit/
│   ├── integration/
│   └── api/
└── docker/
    ├── health-checks/
    └── integration/
```

### Running Tests

#### Frontend Tests
```bash
# Unit tests
docker exec tagix-frontend npm test

# E2E tests
docker exec tagix-frontend npm run test:e2e
```

#### Backend Tests
```bash
# Unit tests
docker exec tagix-backend python -m pytest tests/backend/unit/

# Integration tests
docker exec tagix-backend python -m pytest tests/backend/integration/

# API tests
docker exec tagix-backend python -m pytest tests/backend/api/
```

#### Docker Tests
```bash
# Health checks
./test-docker-health.sh

# Integration tests
./test-docker-integration.sh
```

## 🔍 Debugging Guide

### Common Issues & Solutions

#### 1. Container Won't Start
```bash
# Check logs
docker logs tagix-frontend
docker logs tagix-backend

# Check port conflicts
sudo lsof -i :3000
sudo lsof -i :8001

# Clean restart
docker-compose down
docker system prune -f
./deploy.sh
```

#### 2. WebSocket Connection Issues
```bash
# Test WebSocket
node test_frontend_websocket.js

# Check proxy configuration
docker logs tagix-frontend | grep "setupProxy"

# Check backend WebSocket
docker logs tagix-backend | grep "WebSocket"
```

#### 3. Database Connection Issues
```bash
# Check MongoDB logs
docker logs tagix-mongodb

# Test connection
docker exec tagix-backend python -c "import pymongo; print('MongoDB OK')"

# Check network
docker network ls
docker network inspect tagix_tagix-network
```

#### 4. Permission Issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER .

# Clean Docker cache
docker system prune -a

# Rebuild containers
docker-compose down
docker-compose up --build
```

### Debug Mode

#### Enable Debug Logging
```bash
# Frontend debug mode
docker exec tagix-frontend sh -c "export REACT_APP_DEBUG=true && npm start"

# Backend debug mode
docker exec tagix-backend sh -c "export DEBUG=true && python server.py"
```

#### Access Container Shells
```bash
# Frontend container
docker exec -it tagix-frontend sh

# Backend container
docker exec -it tagix-backend bash

# MongoDB container
docker exec -it tagix-mongodb mongosh
```

## 📊 Monitoring & Performance

### Performance Monitoring
```bash
# Monitor resource usage
docker stats

# Check service health
docker-compose ps

# Monitor logs
docker-compose logs -f --tail=100
```

### Performance Testing
```bash
# Load testing
./load-test.sh

# WebSocket performance
./websocket-performance-test.sh

# Database performance
./database-performance-test.sh
```

## 🚀 Deployment Workflow

### Development to Staging
```bash
# 1. Complete development
git add .
git commit -m "feat: new feature implementation"

# 2. Run tests
./run-tests.sh

# 3. Create pull request
git push origin feature/new-feature-name

# 4. Code review process
# 5. Merge to main
```

### Staging to Production
```bash
# 1. Tag release
git tag -a v1.1.0 -m "Release v1.1.0: New features and bugfixes"

# 2. Push to remote server
git push origin main --tags

# 3. Deploy on remote server
# (Following user rules: ask developer to run)
# git pull origin main
# git checkout v1.1.0
# ./deploy.sh
```

## 🔧 Development Environment Customization

### Environment Variables
```bash
# Frontend development
REACT_APP_DEBUG=true
REACT_APP_API_URL=http://backend:8001
REACT_APP_WS_URL=ws://backend:8001

# Backend development
DEBUG=true
LOG_LEVEL=debug
MONGO_URL=mongodb://admin:password123@mongodb:27017/tagix_db?authSource=admin
```

### Docker Compose Overrides
```yaml
# docker-compose.override.yml
version: '3.8'
services:
  frontend:
    environment:
      - REACT_APP_DEBUG=true
    volumes:
      - ./frontend:/app
      - /app/node_modules
  
  backend:
    environment:
      - DEBUG=true
      - LOG_LEVEL=debug
    volumes:
      - ./backend:/app
```

## 📝 Best Practices

### Code Quality
- Write tests for new features
- Use meaningful commit messages
- Follow coding standards
- Document complex logic
- Use type hints in Python
- Use PropTypes in React

### Git Workflow
- Create feature branches
- Write descriptive commit messages
- Use conventional commits
- Keep commits atomic
- Review code before merging

### Docker Best Practices
- Use multi-stage builds
- Optimize layer caching
- Use .dockerignore files
- Keep images small
- Use health checks
- Monitor resource usage

## 🆘 Getting Help

### Documentation
- README.md - Project overview
- API_DOCUMENTATION.md - API reference
- TROUBLESHOOTING.md - Common issues

### Support Channels
- GitHub Issues - Bug reports
- GitHub Discussions - Questions
- Code reviews - Code quality

### Emergency Procedures
```bash
# Quick recovery
docker-compose down
docker system prune -f
./deploy.sh

# Database recovery
docker exec tagix-mongodb mongorestore /backup

# Rollback to previous version
git checkout v1.0.0-docker
./deploy.sh
```

---

## 🎯 Quick Reference

### Most Used Commands
```bash
# Start development
./deploy.sh

# View logs
docker-compose logs -f

# Run tests
./run-tests.sh

# Debug WebSocket
node test_frontend_websocket.js

# Access backend
docker exec -it tagix-backend bash

# Check health
curl http://localhost:8001/api/health
```

### Development URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001/docs
- MongoDB: localhost:27018
- WebSocket: ws://localhost:3000/ws/{user_id}
