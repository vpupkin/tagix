# 🔧 APACHE2 WEBSOCKET FIX GUIDE

## 🚨 **THE PROBLEM**
Apache2 is returning **403 Forbidden** for WebSocket connections because it's not configured to proxy WebSocket upgrades.

## 🔍 **STEP 1: CHECK CURRENT APACHE2 CONFIGURATION**

Run these commands to see what's currently configured:

```bash
# Check enabled modules
apache2ctl -M | grep proxy

# Check site configurations
ls -la /etc/apache2/sites-available/

# Check which site is active
apache2ctl -S

# Check current configuration for kar.bar
grep -r "kar.bar" /etc/apache2/sites-available/
```

## 🔧 **STEP 2: ENABLE REQUIRED APACHE2 MODULES**

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
sudo a2enmod rewrite
sudo a2enmod headers
```

## 📝 **STEP 3: FIND AND EDIT YOUR APACHE2 CONFIGURATION**

### Option A: If you have a specific kar.bar configuration
```bash
sudo nano /etc/apache2/sites-available/kar.bar.conf
```

### Option B: If using default configuration
```bash
sudo nano /etc/apache2/sites-available/000-default.conf
```

### Option C: Check which one is active
```bash
apache2ctl -S
```

## 🔌 **STEP 4: ADD WEBSOCKET CONFIGURATION**

Add this configuration to your Apache2 site file:

```apache
<VirtualHost *:443>
    ServerName kar.bar
    DocumentRoot /var/www/html
    
    # SSL Configuration (if using HTTPS)
    SSLEngine on
    SSLCertificateFile /path/to/your/certificate.crt
    SSLCertificateKeyFile /path/to/your/private.key
    
    # API Proxy (should already exist)
    ProxyPreserveHost On
    ProxyPass /be/ http://localhost:8001/
    ProxyPassReverse /be/ http://localhost:8001/
    
    # WEBSOCKET PROXY CONFIGURATION - ADD THIS!
    ProxyPass /be/ws/ ws://localhost:8001/ws/
    ProxyPassReverse /be/ws/ ws://localhost:8001/ws/
    
    # WebSocket Upgrade Headers - CRITICAL!
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/be/ws/(.*)$ ws://localhost:8001/ws/$1 [P,L]
    
    # Additional headers for WebSocket
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
</VirtualHost>
```

## 🔄 **STEP 5: RESTART APACHE2**

```bash
# Test configuration first
sudo apache2ctl configtest

# If test passes, restart Apache2
sudo systemctl restart apache2

# Check status
sudo systemctl status apache2
```

## 🧪 **STEP 6: TEST THE CONFIGURATION**

```bash
# Test API endpoint (should work)
curl -I https://kar.bar/be/api/auth/me

# Test WebSocket endpoint (should not return 403)
curl -I -H "Upgrade: websocket" -H "Connection: Upgrade" https://kar.bar/be/ws/test

# Test with our diagnostic script
cd /home/i1/git/tagix
node websocket_diagnostic.js
```

## 🚨 **COMMON ISSUES AND FIXES**

### Issue 1: "Module proxy_wstunnel not found"
```bash
sudo apt update
sudo apt install apache2
sudo a2enmod proxy_wstunnel
```

### Issue 2: "Configuration test failed"
```bash
# Check for syntax errors
sudo apache2ctl configtest

# Look for specific error messages
sudo tail -f /var/log/apache2/error.log
```

### Issue 3: "Permission denied"
```bash
# Make sure Apache2 can access the backend
sudo chown -R www-data:www-data /path/to/your/backend
```

### Issue 4: "Backend not accessible"
```bash
# Check if backend is running
ps aux | grep uvicorn

# Test direct backend connection
curl -I http://localhost:8001/ws/test
```

## 🔍 **STEP 7: VERIFY WEBSOCKET IS WORKING**

After fixing Apache2, test with:

```bash
cd /home/i1/git/tagix
node test_websocket_connection.js
```

You should see:
```
✅ WebSocket connection established successfully!
```

## 📋 **COMPLETE EXAMPLE CONFIGURATION**

Here's a complete Apache2 configuration for kar.bar:

```apache
<VirtualHost *:80>
    ServerName kar.bar
    Redirect permanent / https://kar.bar/
</VirtualHost>

<VirtualHost *:443>
    ServerName kar.bar
    DocumentRoot /var/www/html
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/kar.bar.crt
    SSLCertificateKeyFile /etc/ssl/private/kar.bar.key
    
    # API Proxy
    ProxyPreserveHost On
    ProxyPass /be/ http://localhost:8001/
    ProxyPassReverse /be/ http://localhost:8001/
    
    # WebSocket Proxy
    ProxyPass /be/ws/ ws://localhost:8001/ws/
    ProxyPassReverse /be/ws/ ws://localhost:8001/ws/
    
    # WebSocket Upgrade Headers
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/be/ws/(.*)$ ws://localhost:8001/ws/$1 [P,L]
    
    # CORS Headers
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
    
    # Logging
    ErrorLog ${APACHE_LOG_DIR}/kar.bar_error.log
    CustomLog ${APACHE_LOG_DIR}/kar.bar_access.log combined
</VirtualHost>
```

## 🎯 **QUICK COMMANDS TO RUN**

```bash
# 1. Enable modules
sudo a2enmod proxy proxy_http proxy_wstunnel rewrite headers

# 2. Edit configuration (replace with your actual config file)
sudo nano /etc/apache2/sites-available/kar.bar.conf

# 3. Test and restart
sudo apache2ctl configtest
sudo systemctl restart apache2

# 4. Test WebSocket
cd /home/i1/git/tagix
node test_websocket_connection.js
```

## 🆘 **IF NOTHING WORKS**

Try this alternative approach - use direct backend connection:

1. Change frontend environment:
```bash
echo "REACT_APP_BACKEND_URL=https://kar.bar:8001" > frontend/.env.local
```

2. Make sure port 8001 is accessible externally
3. Update backend CORS to allow your domain

This bypasses Apache2 entirely for WebSocket connections.
