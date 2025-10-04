#!/bin/bash

echo "🔧 FIXING APACHE2 WEBSOCKET CONFIGURATION"
echo "=========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

echo "📋 Step 1: Enabling required Apache2 modules..."
a2enmod proxy
a2enmod proxy_http
a2enmod proxy_wstunnel
a2enmod rewrite
a2enmod headers

echo "📋 Step 2: Checking current Apache2 configuration..."
echo "Current enabled modules:"
apache2ctl -M | grep proxy

echo "📋 Step 3: Looking for kar.bar configuration..."
if [ -f "/etc/apache2/sites-available/kar.bar.conf" ]; then
    echo "✅ Found kar.bar.conf"
    echo "Current WebSocket configuration:"
    grep -A 5 -B 5 "ws://" /etc/apache2/sites-available/kar.bar.conf || echo "❌ No WebSocket configuration found"
elif [ -f "/etc/apache2/sites-available/000-default.conf" ]; then
    echo "✅ Found default configuration"
    echo "Current WebSocket configuration:"
    grep -A 5 -B 5 "ws://" /etc/apache2/sites-available/000-default.conf || echo "❌ No WebSocket configuration found"
else
    echo "❌ No Apache2 configuration found for kar.bar"
    echo "Available sites:"
    ls -la /etc/apache2/sites-available/
fi

echo "📋 Step 4: Checking Apache2 error logs..."
echo "Recent errors:"
tail -10 /var/log/apache2/error.log

echo "📋 Step 5: Testing backend server..."
if curl -s -I http://localhost:8001/ws/test > /dev/null; then
    echo "✅ Backend server is accessible on port 8001"
else
    echo "❌ Backend server is NOT accessible on port 8001"
    echo "Check if backend is running: ps aux | grep uvicorn"
fi

echo ""
echo "🔧 MANUAL FIXES NEEDED:"
echo "======================="
echo "1. Add WebSocket proxy configuration to your Apache2 site config:"
echo ""
echo "   ProxyPass /be/ws/ ws://localhost:8001/ws/"
echo "   ProxyPassReverse /be/ws/ ws://localhost:8001/ws/"
echo ""
echo "   RewriteEngine On"
echo "   RewriteCond %{HTTP:Upgrade} websocket [NC]"
echo "   RewriteCond %{HTTP:Connection} upgrade [NC]"
echo "   RewriteRule ^/be/ws/(.*)$ ws://localhost:8001/ws/$1 [P,L]"
echo ""
echo "2. Restart Apache2: sudo systemctl restart apache2"
echo ""
echo "3. Test WebSocket: node test_websocket_connection.js"
