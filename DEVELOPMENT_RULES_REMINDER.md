# 🚨 CRITICAL DEVELOPMENT RULES - TAGIX PROJECT

## ⚠️ ALWAYS FOLLOW THESE RULES - NO EXCEPTIONS!

### 1. **DOCKER DEPLOYMENT ONLY**
- ❌ **NEVER** run backend directly with `python -m uvicorn server:app`
- ❌ **NEVER** install dependencies manually with `pip install`
- ❌ **NEVER** use virtual environments directly
- ✅ **ALWAYS** use `./deploy.sh` script for all development

### 2. **DEPLOYMENT COMMANDS**
```bash
# Quick testing (most common)
./deploy.sh --skip-tests

# Clean rebuild when needed
./deploy.sh --clean

# Deploy with git commit and push
./deploy.sh --push

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### 3. **SERVICE PORTS**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **WebSocket**: ws://localhost:8001/ws/{user_id} ⚠️ **NOT port 3000**
- **MongoDB**: localhost:27018

### 4. **TESTING RULES**
- All test files must connect to `ws://localhost:8001/ws/` for WebSocket
- Never test against port 3000 for WebSocket connections
- Use the proper deployment script before running any tests

### 5. **WHY THIS MATTERS**
- Docker ensures consistent environment
- All dependencies are properly managed
- Services are properly networked
- WebSocket connections work correctly
- Database connections are configured properly

### 6. **EMERGENCY COMMANDS**
```bash
# If something goes wrong
docker compose down --remove-orphans
./deploy.sh --clean

# Check service status
docker compose ps

# View specific service logs
docker compose logs backend
docker compose logs frontend
docker compose logs mongodb
```

## 🎯 REMEMBER: The user has explicitly requested this Docker-first workflow. 
## This is the ONLY approved way to run TAGIX development environment.

---
*Created: $(date)*
*Last Updated: $(date)*
