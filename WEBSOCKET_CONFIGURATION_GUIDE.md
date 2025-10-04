# 🔌 COMPLETE WEBSOCKET CONFIGURATION GUIDE

## 🚨 **THE PROBLEM: Too Many Configuration Points!**

WebSocket connections can fail at **8 different levels**. Here's EVERYTHING that needs to be configured:

---

## 📍 **CONFIGURATION POINT #1: Frontend Environment**

**File**: `/home/i1/git/tagix/frontend/.env.local`

```bash
REACT_APP_BACKEND_URL=https://kar.bar/be
```

**Check**: `cat frontend/.env.local`

---

## 📍 **CONFIGURATION POINT #2: Backend Environment**

**File**: `/home/i1/git/tagix/backend/.env.local`

```bash
# Database Configuration
MONGO_URL=mongodb://localhost:27017
DB_NAME=mobility_hub

# JWT Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Server Configuration
HOST=0.0.0.0
PORT=8001

# CORS Configuration - Allow your domain
CORS_ORIGINS=https://kar.bar:3000,http://localhost:3000,https://kar.bar

# WebSocket Configuration
WS_HOST=0.0.0.0
WS_PORT=8001
```

**Check**: `cat backend/.env.local`

---

## 📍 **CONFIGURATION POINT #3: Apache2 Reverse Proxy**

**File**: `/etc/apache2/sites-available/kar.bar.conf` (or similar)

```apache
<VirtualHost *:443>
    ServerName kar.bar
    DocumentRoot /var/www/html
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /path/to/certificate.crt
    SSLCertificateKeyFile /path/to/private.key
    
    # API Proxy
    ProxyPreserveHost On
    ProxyPass /be/ http://localhost:8001/
    ProxyPassReverse /be/ http://localhost:8001/
    
    # WebSocket Proxy - CRITICAL!
    ProxyPass /be/ws/ ws://localhost:8001/ws/
    ProxyPassReverse /be/ws/ ws://localhost:8001/ws/
    
    # WebSocket Headers - CRITICAL!
    ProxyPassMatch ^/be/ws/(.*)$ ws://localhost:8001/ws/$1
    ProxyPreserveHost On
    ProxyRequests Off
    
    # WebSocket Upgrade Headers
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/be/ws/(.*)$ ws://localhost:8001/ws/$1 [P,L]
</VirtualHost>
```

**Required Apache2 Modules**:
```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
sudo a2enmod rewrite
sudo systemctl restart apache2
```

**Check**: `sudo apache2ctl -M | grep proxy`

---

## 📍 **CONFIGURATION POINT #4: FastAPI Backend Server**

**File**: `/home/i1/git/tagix/backend/server.py`

The WebSocket endpoint should be:
```python
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    # WebSocket implementation
```

**Check**: `grep -n "websocket" backend/server.py`

---

## 📍 **CONFIGURATION POINT #5: React Development Server**

**File**: `/home/i1/git/tagix/frontend/src/setupProxy.js`

```javascript
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy API requests to backend
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug'
    })
  );

  // Proxy WebSocket connections to backend
  app.use(
    '/ws',
    createProxyMiddleware({
      target: process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001',
      changeOrigin: true,
      secure: false,
      ws: true, // Enable WebSocket proxying
      logLevel: 'debug'
    })
  );
};
```

---

## 📍 **CONFIGURATION POINT #6: SSL/HTTPS Certificates**

**Requirements**:
- Valid SSL certificate for `kar.bar`
- Certificate must support WebSocket upgrades
- No certificate errors in browser

**Check**: `openssl s_client -connect kar.bar:443 -servername kar.bar`

---

## 📍 **CONFIGURATION POINT #7: Firewall/Network Rules**

**Required Ports**:
- 80 (HTTP)
- 443 (HTTPS)
- 8001 (Backend - internal only)

**Check**: `sudo ufw status` or `sudo iptables -L`

---

## 📍 **CONFIGURATION POINT #8: Browser WebSocket Implementation**

**Frontend Code**: `/home/i1/git/tagix/frontend/src/contexts/WebSocketContext.js`

The WebSocket URL construction:
```javascript
const backendUrl = process.env.REACT_APP_BACKEND_URL; // https://kar.bar/be
const wsUrl = backendUrl.replace(/^http/, 'ws'); // wss://kar.bar/be
const newSocket = new WebSocket(`${wsUrl}/ws/${user.id}`); // wss://kar.bar/be/ws/user_id
```

---

## 🔧 **QUICK DIAGNOSTIC COMMANDS**

### 1. Check All Configuration Files
```bash
cd /home/i1/git/tagix
node websocket_diagnostic.js
```

### 2. Test API Connection
```bash
curl -I https://kar.bar/be/api/auth/me
```

### 3. Test WebSocket Connection
```bash
cd /home/i1/git/tagix
node test_websocket_connection.js
```

### 4. Check Apache2 Configuration
```bash
sudo apache2ctl -S
sudo apache2ctl -M | grep proxy
sudo tail -f /var/log/apache2/error.log
```

### 5. Check Backend Server
```bash
ps aux | grep uvicorn
curl -I http://localhost:8001/ws/test
```

### 6. Check SSL Certificate
```bash
openssl s_client -connect kar.bar:443 -servername kar.bar
```

---

## 🚨 **COMMON FAILURE POINTS**

### 1. **Apache2 WebSocket Module Missing**
```bash
sudo a2enmod proxy_wstunnel
sudo systemctl restart apache2
```

### 2. **Wrong WebSocket Proxy Configuration**
The Apache2 config must have BOTH:
- `ProxyPass /be/ws/ ws://localhost:8001/ws/`
- `RewriteRule` for WebSocket upgrades

### 3. **Backend Server Not Running**
```bash
cd /home/i1/git/tagix/backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 4. **CORS Issues**
Backend `.env.local` must include your domain in `CORS_ORIGINS`

### 5. **SSL Certificate Issues**
WebSocket requires valid SSL certificates

---

## 🎯 **STEP-BY-STEP FIX PROCESS**

1. **Run Diagnostic**: `node websocket_diagnostic.js`
2. **Check Apache2 Modules**: `sudo a2enmod proxy_wstunnel`
3. **Verify Apache2 Config**: Check WebSocket proxy rules
4. **Restart Apache2**: `sudo systemctl restart apache2`
5. **Check Backend**: Ensure server is running on port 8001
6. **Test WebSocket**: `node test_websocket_connection.js`
7. **Check Browser Console**: Look for specific error codes

---

## 🔍 **ERROR CODE REFERENCE**

- **1006**: Connection closed abnormally (usually server-side issue)
- **1000**: Normal closure
- **1001**: Going away
- **1002**: Protocol error
- **1003**: Unsupported data
- **1004**: Reserved
- **1005**: No status received
- **1007**: Invalid frame payload data
- **1008**: Policy violation
- **1009**: Message too big
- **1010**: Missing extension
- **1011**: Internal error
- **1012**: Service restart
- **1013**: Try again later
- **1014**: Bad gateway
- **1015**: TLS handshake failure

---

## 💡 **PRO TIPS**

1. **Always check Apache2 error logs first**: `sudo tail -f /var/log/apache2/error.log`
2. **Test direct backend connection**: `curl -I http://localhost:8001/ws/test`
3. **Use browser dev tools**: Check Network tab for WebSocket connection attempts
4. **Verify environment variables**: Make sure they're loaded correctly
5. **Check SSL certificate validity**: WebSocket requires valid HTTPS

---

## 🆘 **EMERGENCY FIXES**

If nothing works, try these in order:

1. **Disable WebSocket temporarily**:
   ```javascript
   // In WebSocketContext.js, comment out the WebSocket connection
   // const newSocket = new WebSocket(`${wsUrl}/ws/${user.id}`);
   ```

2. **Use direct backend connection**:
   ```bash
   # Change frontend/.env.local to:
   REACT_APP_BACKEND_URL=https://kar.bar:8001
   ```

3. **Check if backend WebSocket endpoint exists**:
   ```bash
   curl -I http://localhost:8001/ws/test
   ```

4. **Restart everything**:
   ```bash
   sudo systemctl restart apache2
   # Restart backend server
   # Restart frontend
   ```
