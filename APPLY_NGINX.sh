#!/bin/bash
# Run this script with sudo to apply the nginx config

echo "Applying simple nginx configuration..."

# Backup current config
cp /etc/nginx/sites-available/sol.inoutconnect.com /etc/nginx/sites-available/sol.inoutconnect.com.backup-$(date +%Y%m%d-%H%M%S)

# Apply new config
cp /var/www/sol.inoutconnect.com/portai/nginx-FINAL-SIMPLE.conf /etc/nginx/sites-available/sol.inoutconnect.com

# Test config
echo "Testing nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Config is valid"
    echo "Reloading nginx..."
    systemctl reload nginx
    echo "✅ Nginx reloaded"
    echo ""
    echo "Try now: https://sol.inoutconnect.com/portai/public/index.php"
else
    echo "❌ Config test failed!"
    echo "Restoring backup..."
    cp /etc/nginx/sites-available/sol.inoutconnect.com.backup-* /etc/nginx/sites-available/sol.inoutconnect.com
fi
