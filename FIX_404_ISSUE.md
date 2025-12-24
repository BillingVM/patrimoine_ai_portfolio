# 🔧 Fix 404 Error - Simple Steps

## What's Wrong?

**Problem 1:** File permissions were wrong (FIXED ✅)
**Problem 2:** Nginx config has complex location blocks that interfere with PHP (NEEDS FIX)

---

## ✅ Files Permissions - Already Fixed

I've already fixed these:
```bash
chmod 644 /var/www/sol.inoutconnect.com/portai/public/index.php
chmod 644 /var/www/sol.inoutconnect.com/portai/public/css/style.css
chmod 644 /var/www/sol.inoutconnect.com/portai/public/js/app.js
chmod 755 /var/www/sol.inoutconnect.com/portai/uploads
```

---

## ⏳ Nginx Config - YOU Need to Apply

### The Issue

Your current nginx config has these problematic blocks:
```nginx
location /portai/ {
    alias /var/www/sol.inoutconnect.com/portai/public/;
    index index.php;
    # This interferes with PHP processing!
}

location ~ ^/portai/.*\.php$ {
    # Custom PHP handler that doesn't work right
}
```

These blocks are causing the 404 because they use `alias` which breaks PHP file resolution.

### The Fix

Run this ONE command:

```bash
sudo /var/www/sol.inoutconnect.com/portai/APPLY_NGINX.sh
```

This script will:
1. ✅ Backup your current nginx config
2. ✅ Apply the simple config (ONLY proxies /portai/api/, nothing else)
3. ✅ Test the config
4. ✅ Reload nginx

### What the Simple Config Does

**Before (Complex - BROKEN):**
- Has `location /portai/` with alias
- Has custom PHP handler for `/portai/*.php`
- Has static asset handler for CSS/JS
- **Result:** 404 errors

**After (Simple - WORKS):**
```nginx
# Only this one block:
location /portai/api/ {
    proxy_pass http://localhost:3001/api/;
    # ... proxy settings
}

# That's it! The existing PHP handler processes ALL .php files
```

---

## After Applying the Fix

Access your app at:
**https://sol.inoutconnect.com/portai/public/index.php**

Just like your ChatOAI project works at:
**https://sol.inoutconnect.com/ChatOAI/public/index.php**

---

## Quick Verification

After running the script, test:

```bash
# Check nginx is OK
sudo nginx -t

# Check it loads
curl -I https://sol.inoutconnect.com/portai/public/index.php

# Should see: HTTP/1.1 200 OK (not 404!)
```

---

## Why This Approach?

Your ChatOAI project works perfectly because:
1. No custom location blocks for ChatOAI
2. Standard PHP handler processes all .php files
3. Simple and clean

We're doing the SAME thing for portai:
1. ONLY proxy the API calls to Node.js
2. Let standard PHP handler process .php files
3. Simple and clean

---

**Ready?** Run this command:
```bash
sudo /var/www/sol.inoutconnect.com/portai/APPLY_NGINX.sh
```

Then open: **https://sol.inoutconnect.com/portai/public/index.php** 🚀
