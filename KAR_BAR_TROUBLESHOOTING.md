# Kar.bar Domain Configuration Troubleshooting

## Issues Fixed

### 1. API Connection Errors
**Problem**: `POST http://localhost:8001/api/auth/login net::ERR_CONNECTION_REFUSED`

**Solution**: Created `.env.local` file in frontend with:
```
REACT_APP_BACKEND_URL=https://kar.bar/be
```

### 2. WebSocket Connection Errors
**Problem**: `WebSocket connection to 'wss://kar.bar:3000/ws' failed`

**Solution**: 
- WebSocket now uses the same domain and path as API: `wss://kar.bar/be/ws`
- Added debugging logs to WebSocketContext.js to verify URL construction

### 3. CORS Configuration
**Problem**: Cross-origin requests blocked

**Solution**: Updated backend `.env.local` with:
```
CORS_ORIGINS=https://kar.bar:3000,http://localhost:3000,https://kar.bar
```

### 4. Reverse Proxy Configuration
**Problem**: Backend not accessible on port 8001 directly

**Solution**: 
- Backend is accessible through reverse proxy at `https://kar.bar/be`
- API calls work correctly through the proxy
- WebSocket connections may need additional proxy configuration

## Files Modified

1. **Frontend Environment**: `/home/i1/git/tagix/frontend/.env.local`
2. **Backend Environment**: `/home/i1/git/tagix/backend/.env.local`
3. **WebSocket Context**: Added debugging logs
4. **Auth Context**: Added debugging logs

## How to Restart Services

1. **Quick restart** (recommended):
   ```bash
   ./restart_services.sh
   ```

2. **Manual restart**:
   ```bash
   # Stop existing services
   pkill -f "uvicorn.*server:app"
   pkill -f "craco start"
   
   # Start backend
   cd backend
   source venv/bin/activate
   uvicorn server:app --host 0.0.0.0 --port 8001 --reload &
   
   # Start frontend
   cd ../frontend
   npm start &
   ```

## Verification Steps

1. **Check environment variables are loaded**:
   - Open browser console
   - Look for: `API_URL from environment: https://kar.bar:8001`
   - Look for: `Backend URL from env: https://kar.bar:8001`

2. **Check WebSocket connection**:
   - Look for: `Attempting WebSocket connection to: wss://kar.bar:8001/ws/[user_id]`
   - Should see: `WebSocket connected`

3. **Test API connection**:
   - Try logging in
   - Should not see `ERR_CONNECTION_REFUSED` errors

## Common Issues

### PostHog Analytics Blocked
The `net::ERR_BLOCKED_BY_CLIENT` error for PostHog is likely due to:
- Ad blocker blocking analytics
- This is normal and doesn't affect functionality

### Development Server WebSocket
The `wss://kar.bar:3000/ws` connection is from the React development server (webpack-dev-server) for hot reloading. This is separate from your application's WebSocket and may fail if the dev server isn't configured for the domain.

### WebSocket Proxy Configuration
**Issue**: WebSocket connections may fail with 404 errors when going through a reverse proxy.

**Possible Solutions**:
1. **Configure reverse proxy for WebSocket support** (nginx example):
   ```nginx
   location /be/ws/ {
       proxy_pass http://localhost:8001/ws/;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```

2. **Alternative**: Use direct WebSocket connection if possible:
   - Update environment to use direct port: `REACT_APP_BACKEND_URL=https://kar.bar:8001`
   - Ensure port 8001 is accessible for WebSocket connections

### Excessive WebSocket Reconnection Attempts
**Fixed**: Reduced max reconnection attempts from 5 to 3 and improved error handling to prevent spam.

**Changes Made**:
- Reduced `maxReconnectAttempts` from 5 to 3
- Added proper timeout management with `reconnectTimeoutRef`
- Improved error handling to show fewer error toasts
- Added cleanup on component unmount

## SSL/HTTPS Considerations

If you're using HTTPS (which you should for production):
1. Ensure your SSL certificates are properly configured
2. The backend should also support HTTPS or be behind a reverse proxy
3. WebSocket connections must use `wss://` for secure connections

## Testing Tools

### WebSocket Connection Test
Run the WebSocket test script to verify connectivity:
```bash
cd /home/i1/git/tagix
node test_websocket_connection.js
```

### API Connection Test
Run the API test script to verify backend connectivity:
```bash
cd /home/i1/git/tagix
node test_kar_bar_connection.js
```

## Next Steps

1. Restart services using the provided script
2. Check browser console for the debugging messages
3. Test login functionality
4. Verify WebSocket connections are working
5. Remove debugging logs once everything is working
