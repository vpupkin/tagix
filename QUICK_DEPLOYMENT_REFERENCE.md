# 🚀 QUICK DEPLOYMENT REFERENCE

## ⚠️ CRITICAL RULES
- **NEVER** run `python -m uvicorn server:app` directly
- **ALWAYS** use `./deploy.sh` for development
- **WebSocket**: ws://localhost:8001/ws/ (NOT port 3000)

## 🎯 COMMON COMMANDS
```bash
# Start development environment
./deploy.sh --skip-tests

# Clean rebuild
./deploy.sh --clean

# Deploy with git push
./deploy.sh --push

# View logs
docker compose logs -f

# Stop services
docker compose down
```

## 📍 SERVICE PORTS
- Frontend: http://localhost:3000
- Backend: http://localhost:8001
- WebSocket: ws://localhost:8001/ws/
- MongoDB: localhost:27018

## 🧪 TESTING
- All WebSocket tests must use port 8001
- Run `./deploy.sh --skip-tests` before testing
- Check `docker compose ps` for service status

---
**REMEMBER: Docker deployment is MANDATORY for TAGIX development!**
