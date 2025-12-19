# Google Cloud Vision API Setup (Optional)

## Why Google Vision?

Google Cloud Vision provides **superior OCR accuracy** compared to Tesseract:

| Feature | Tesseract.js | Google Vision API |
|---------|-------------|-------------------|
| Accuracy | 85-95% | 95-99% |
| Speed | 5-15 sec/page | 1-3 sec/page |
| Handwriting | Poor | Good |
| Complex layouts | Fair | Excellent |
| Multiple languages | Good | Excellent |
| Cost | Free | $1.50 per 1000 images |

---

## Current Setup

**Status:** Google Vision is **OPTIONAL** and **DISABLED** by default

The system works with:
1. **Primary:** Tesseract.js (free, self-hosted)
2. **Fallback:** Google Vision API (if configured)

---

## How to Enable Google Vision

### Step 1: Get Google Cloud Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable "Cloud Vision API"
4. Create a Service Account:
   - Go to IAM & Admin → Service Accounts
   - Create Service Account
   - Grant role: "Cloud Vision API User"
5. Download JSON key file

### Step 2: Configure the API

Upload your service account JSON file:
```bash
# Upload to server
scp service-account-key.json user@server:/var/www/sol.inoutconnect.com/portai/api/
```

Edit `.env` file:
```bash
# Enable Google Vision
USE_GOOGLE_VISION=true
GOOGLE_APPLICATION_CREDENTIALS=/var/www/sol.inoutconnect.com/portai/api/service-account-key.json
```

### Step 3: Restart API
```bash
pm2 restart portai-api
```

---

## Cost Estimate

**Google Vision Pricing:**
- First 1,000 images/month: **FREE**
- Next 1,000 images: $1.50
- Beyond that: $1.50 per 1,000 images

**For Demo:** Stay within free tier (1,000 images)

**For Production:**
- 100 images/day = $4.50/month
- 1000 images/day = $45/month

---

## When to Use Google Vision

✅ **Use Google Vision when:**
- Poor quality scans
- Handwritten documents
- Complex layouts (tables, multi-column)
- Need highest accuracy
- Budget allows ($1.50 per 1000 images)

❌ **Stick with Tesseract when:**
- Good quality printed text
- Simple layouts
- Budget constrained (free)
- Offline processing needed

---

## Testing

Once enabled, the system automatically:
1. Tries Google Vision first
2. Falls back to Tesseract if Google fails
3. Shows which OCR was used in logs

Test it:
```bash
# Upload an image
# Check logs to see which OCR was used
pm2 logs portai-api
```

You'll see either:
- `📸 Using Google Cloud Vision API for OCR` (Google)
- `🔍 Running Tesseract OCR on:` (Tesseract)

---

## Current Status

- ✅ Google Cloud Vision package installed
- ✅ Configuration ready in `.env`
- ⏳ **Disabled by default** (USE_GOOGLE_VISION=false)
- ⏳ Needs service account key to enable

---

## For Tomorrow's Demo

**Recommendation:** Keep using Tesseract (current setup)
- Already working
- Free
- Good enough for demo
- No API key setup needed

**If you want better accuracy:** Set up Google Vision using steps above.

---

## Code Changes

I've updated `/api/ocr.js` to:
- Support Google Vision as primary OCR
- Fall back to Tesseract automatically
- Work without any config (Tesseract only)
- Easy to enable Google Vision later

---

**Questions?** Let me know if you want to enable Google Vision now or stick with Tesseract for the demo!
