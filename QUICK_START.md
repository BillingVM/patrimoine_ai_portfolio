# 🚀 Portfolio AI - Quick Start (2 Minutes)

## Current Status
✅ All code is ready
✅ Database tables created
⏳ Need to apply nginx config
⏳ Need to start API server

---

## Step 1: Apply Nginx Config (30 seconds)

```bash
sudo cp /var/www/sol.inoutconnect.com/portai/nginx-complete-config.conf /etc/nginx/sites-available/sol.inoutconnect.com
sudo nginx -t
sudo systemctl reload nginx
```

✅ **Done!** Nginx is now routing requests to your app.

---

## Step 2: Start API Server (30 seconds)

### Option A: Using PM2 (Recommended for Production)
```bash
cd /var/www/sol.inoutconnect.com/portai
pm2 start ecosystem.config.js
pm2 save
```

### Option B: Using the Start Script
```bash
cd /var/www/sol.inoutconnect.com/portai
./start.sh
```

### Option C: Direct Node (for Testing)
```bash
cd /var/www/sol.inoutconnect.com/portai/api
node server.js
```

✅ **Done!** API is running on port 3001.

---

## Step 3: Test It! (30 seconds)

### Open in Browser
🌐 **https://sol.inoutconnect.com/portai/**

### Quick Test
1. Upload `test-samples/portfolio-sample.csv`
2. Click "Generate Report"
3. Watch the AI magic happen! ✨

---

## Verify Everything Works

```bash
# Check API
curl http://localhost:3001/api/health

# Should return: {"status":"ok","message":"Portfolio AI API is running"}

# Check PM2 (if using PM2)
pm2 list

# Should show: portai-api | online
```

---

## That's It!

Your demo-ready portfolio AI system is live.

**No complicated setup. No build steps. Just works.**

---

## If Something Goes Wrong

### API Won't Start
```bash
# Check logs
pm2 logs portai-api

# Or if running directly, check terminal output
```

### Can't Access in Browser
```bash
# Check nginx
sudo nginx -t
sudo systemctl status nginx

# Check if port 3001 is listening
sudo netstat -tlnp | grep 3001
```

### Database Errors
```bash
# Test connection
PGPASSWORD='apzosldkcAO91561ssa6@gasy' psql -h localhost -U portfolio_user -d portfolio_ai -c "SELECT 1"
```

---

## Useful Commands

```bash
# View logs
pm2 logs portai-api

# Restart
pm2 restart portai-api

# Stop
pm2 stop portai-api

# Status
pm2 status
```

---

**Ready for your demo tomorrow!** 🎉
