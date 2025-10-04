#!/bin/bash

echo "🔍 APACHE2 WEBSOCKET CONFIGURATION CHECKER"
echo "=========================================="

echo "📋 Step 1: Checking Apache2 modules..."
echo "Enabled proxy modules:"
apache2ctl -M | grep proxy || echo "❌ No proxy modules found"

echo ""
echo "📋 Step 2: Checking site configurations..."
echo "Available sites:"
ls -la /etc/apache2/sites-available/ | grep -E "\.(conf|conf\.disabled)$"

echo ""
echo "📋 Step 3: Checking active site..."
echo "Active site configuration:"
apache2ctl -S 2>/dev/null || echo "❌ Could not get active site info"

echo ""
echo "📋 Step 4: Looking for kar.bar configuration..."
if [ -f "/etc/apache2/sites-available/kar.bar.conf" ]; then
    echo "✅ Found kar.bar.conf"
    echo "Current WebSocket configuration:"
    grep -A 3 -B 3 "ws://" /etc/apache2/sites-available/kar.bar.conf || echo "❌ No WebSocket configuration found"
elif [ -f "/etc/apache2/sites-available/000-default.conf" ]; then
    echo "✅ Found default configuration"
    echo "Current WebSocket configuration:"
    grep -A 3 -B 3 "ws://" /etc/apache2/sites-available/000-default.conf || echo "❌ No WebSocket configuration found"
else
    echo "❌ No configuration files found"
fi

echo ""
echo "📋 Step 5: Checking for WebSocket-related configuration..."
echo "Searching for WebSocket configs in all site files:"
find /etc/apache2/sites-available/ -name "*.conf" -exec grep -l "ws://\|websocket\|Upgrade" {} \; 2>/dev/null || echo "❌ No WebSocket configurations found"

echo ""
echo "📋 Step 6: Testing backend server..."
if curl -s -I http://localhost:8001/ws/test > /dev/null 2>&1; then
    echo "✅ Backend server is accessible on port 8001"
else
    echo "❌ Backend server is NOT accessible on port 8001"
    echo "Check if backend is running: ps aux | grep uvicorn"
fi

echo ""
echo "📋 Step 7: Testing WebSocket endpoint..."
echo "Testing WebSocket endpoint:"
curl -I -H "Upgrade: websocket" -H "Connection: Upgrade" https://kar.bar/be/ws/test 2>/dev/null || echo "❌ WebSocket endpoint test failed"

echo ""
echo "🔧 NEXT STEPS:"
echo "=============="
echo "1. If no WebSocket configuration found, add it to your Apache2 site config"
echo "2. Enable required modules: sudo a2enmod proxy proxy_http proxy_wstunnel rewrite"
echo "3. Restart Apache2: sudo systemctl restart apache2"
echo "4. Test WebSocket: node test_websocket_connection.js"
echo ""
echo "📖 See APACHE2_WEBSOCKET_FIX_GUIDE.md for detailed instructions"
