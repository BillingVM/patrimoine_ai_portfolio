# 🤖 Multi-AI Model Round-Robin System

## ✨ Features

✅ **Round-Robin Load Balancing** - Automatically rotates between multiple AI models
✅ **Automatic Failover** - Switches to backup models when one fails
✅ **Quota Management** - Removes models that hit rate limits or quotas
✅ **Dead Model Detection** - Marks permanently failed models as inactive
✅ **Maintenance Mode** - Beautiful UI when all models are unavailable
✅ **Multiple Providers** - Supports OpenRouter, DeepSeek, and Qwen APIs
✅ **Free & Paid Models** - Mix free and paid models in rotation
✅ **Health Monitoring** - Real-time status tracking for all models

---

## 🔧 How It Works

### 1. Model Pool Initialization
When the server starts, it loads all available models based on your `.env` configuration:

```javascript
// Free models via OpenRouter
- Xiaomi Mimo v2 Flash
- Meta Llama 3.1 8B
- Google Gemma 2 9B

// Paid models (if API keys provided)
- DeepSeek Chat (direct API)
- Qwen Turbo (direct API)
- DeepSeek via OpenRouter
- Qwen via OpenRouter
```

### 2. Round-Robin Selection
Each chat request uses the next available model in rotation:

```
Request 1 → Xiaomi Mimo
Request 2 → Llama 3.1
Request 3 → Gemma 2
Request 4 → DeepSeek
Request 5 → Xiaomi Mimo (cycles back)
```

### 3. Automatic Failover
If a model fails, the system automatically retries with the next model:

```
User: "What's Tesla's stock price?"
  ↓
Try: Xiaomi Mimo ❌ (quota exceeded)
  ↓
Try: Llama 3.1 ✅ (success!)
  ↓
Response delivered
```

### 4. Dead Model Removal
Models are marked inactive when they encounter permanent failures:

**Permanent Failures:**
- 401 Unauthorized (invalid API key)
- 403 Forbidden
- 404 Model not found
- 503 Service unavailable
- Quota/rate limit errors

**Temporary Failures:**
- Network timeouts
- Connection refused
- 500 Internal server errors

### 5. Maintenance Mode
When ALL models are down, users see a professional maintenance page:

```
┌─────────────────────────────────┐
│      🔧                         │
│   Under Maintenance             │
│                                 │
│  Our AI assistant is currently │
│  undergoing maintenance.        │
│                                 │
│  [🔄 Refresh Page]             │
└─────────────────────────────────┘
```

---

## 📝 Configuration Guide

Configuration is managed via `api/config.json` file. This provides more flexibility than environment variables, allowing per-model settings and easy enable/disable toggles.

### Basic Setup (Free Models Only)

**`api/config.json` Configuration:**
```json
{
    "ai": {
        "openrouter": {
            "apiKey": "sk-or-v1-xxxxxxxxxxxxx",
            "models": [
                {
                    "name": "xiaomi/mimo-v2-flash:free",
                    "displayName": "Xiaomi Mimo v2 Flash",
                    "enabled": true,
                    "price": { "inPrice": 0, "outPrice": 0 },
                    "apiKey": null
                },
                {
                    "name": "meta-llama/llama-3.1-8b-instruct:free",
                    "displayName": "Meta Llama 3.1 8B",
                    "enabled": true,
                    "price": { "inPrice": 0, "outPrice": 0 },
                    "apiKey": null
                },
                {
                    "name": "google/gemma-2-9b-it:free",
                    "displayName": "Google Gemma 2 9B",
                    "enabled": true,
                    "price": { "inPrice": 0, "outPrice": 0 },
                    "apiKey": null
                }
            ]
        }
    },
    "financial": {
        "financialDatasetsApiKey": "your-key-here"
    }
}
```

**Result:**
- 3 free models available
- No additional costs
- Good for testing and development

---

### Advanced Setup (Free + Paid Models)

**Option 1: Direct DeepSeek API**
```json
{
    "ai": {
        "openrouter": { /* ... free models ... */ },
        "deepseek": {
            "enabled": true,
            "apiKey": "sk-xxxxxxxxxxxxx",
            "models": [
                {
                    "name": "deepseek-chat",
                    "displayName": "DeepSeek Chat (Direct API)",
                    "enabled": true,
                    "price": { "inPrice": 0.14, "outPrice": 0.28 }
                }
            ]
        }
    }
}
```

**Option 2: Paid Models via OpenRouter**
```json
{
    "ai": {
        "openrouter": {
            "apiKey": "sk-or-v1-xxxxxxxxxxxxx",
            "models": [
                /* ... free models ... */
                {
                    "name": "deepseek/deepseek-chat",
                    "displayName": "DeepSeek Chat",
                    "enabled": true,
                    "price": { "inPrice": 0.27, "outPrice": 1.1 },
                    "apiKey": null
                }
            ]
        }
    }
}
```

**Option 3: Per-Model API Keys**
```json
{
    "ai": {
        "openrouter": {
            "apiKey": "sk-or-v1-default-key",
            "models": [
                {
                    "name": "deepseek/deepseek-chat",
                    "displayName": "DeepSeek Chat",
                    "enabled": true,
                    "price": { "inPrice": 0.27, "outPrice": 1.1 },
                    "apiKey": "sk-or-v1-specific-key-for-this-model"
                }
            ]
        }
    }
}
```

**Result:**
- Multiple models available
- Better reliability
- Higher quality responses from paid models
- Cost distributed across providers
- Flexible per-model configuration

---

## 🔍 Monitoring & Health Checks

### Check Model Health

**API Endpoint:**
```bash
GET /api/ai/health
```

**Response:**
```json
{
  "success": true,
  "totalModels": 4,
  "activeModels": 4,
  "maintenanceMode": false,
  "models": [
    {
      "id": "openrouter-mimo",
      "name": "Xiaomi Mimo v2 Flash",
      "provider": "openrouter",
      "free": true,
      "active": true,
      "failCount": 0,
      "lastFail": null,
      "lastSuccess": "2025-12-19T15:30:00.000Z"
    },
    // ... more models
  ]
}
```

### Monitor Server Logs

```bash
tail -f /var/tmp/portai.log
```

**Example Output:**
```
✅ Initialized 4 AI models
   - Xiaomi Mimo v2 Flash (openrouter - FREE)
   - Meta Llama 3.1 8B (openrouter - FREE)
   - Google Gemma 2 9B (openrouter - FREE)
   - DeepSeek Chat (deepseek)

🤖 Selected model: Xiaomi Mimo v2 Flash (openrouter-mimo)
🔄 Attempt 1/3 with Xiaomi Mimo v2 Flash
✅ Chat response generated (2 rounds, 4 tools used)
```

---

## 💡 Best Practices

### 1. Start with Free Models
```json
// Minimal config.json for testing
{
    "ai": {
        "openrouter": {
            "apiKey": "your_key_here",
            "models": [
                // Only enable free models initially
            ]
        }
    },
    "financial": {
        "financialDatasetsApiKey": "your_key_here"
    }
}
```

### 2. Add Paid Models Gradually
```json
// Enable paid models when you need better quality
{
    "ai": {
        "deepseek": {
            "enabled": true,
            "apiKey": "your_key_here",
            "models": [
                { "enabled": true, /* ... */ }
            ]
        }
    }
}
```

### 3. Monitor Model Performance
- Check `/api/ai/health` regularly
- Review server logs for fail patterns
- Adjust model pool in config.json based on usage
- Enable/disable models easily with the `enabled` flag

### 4. Cost Optimization
- Use free models for general queries
- Paid models kick in when free models fail
- Round-robin distributes load evenly
- Track costs with per-model pricing information

---

## 🚨 Troubleshooting

### Problem: All Models Show Inactive

**Cause:** API keys are invalid or expired

**Solution:**
1. Check `api/config.json` file has correct API keys
2. Verify keys at provider websites:
   - OpenRouter: https://openrouter.ai/keys
   - DeepSeek: https://platform.deepseek.com/
   - Qwen: https://dashscope.aliyun.com/
3. Update config.json with correct keys
4. Restart server: `pkill -f "node.*server.js" && node server.js`

---

### Problem: Maintenance Page Appears Immediately

**Cause:** No models initialized or all failed on startup

**Solution:**
1. Check server logs: `tail -30 /var/tmp/portai.log`
2. Ensure `api/config.json` exists and has valid OpenRouter API key
3. Verify at least one model is enabled in config.json
4. Check network connectivity

---

### Problem: One Model Always Failing

**Cause:** Model quota exceeded or API key issue

**Solution:**
1. Check health endpoint: `curl -k https://localhost:11130/api/ai/health`
2. Review `lastFail` timestamp and error
3. Wait for quota reset (usually 24 hours)
4. Add more models to rotation

---

## 📊 Model Comparison

| Model | Provider | Cost | Speed | Quality | Tools Support |
|-------|----------|------|-------|---------|---------------|
| Xiaomi Mimo v2 Flash | OpenRouter | Free | Fast | Good | ✅ |
| Meta Llama 3.1 8B | OpenRouter | Free | Fast | Good | ✅ |
| Google Gemma 2 9B | OpenRouter | Free | Fast | Good | ✅ |
| DeepSeek Chat | DeepSeek | Paid | Medium | Excellent | ✅ |
| Qwen Turbo | Qwen | Paid | Fast | Excellent | ⚠️ Limited |

---

## 🔐 API Keys Setup

### OpenRouter
1. Sign up: https://openrouter.ai/
2. Go to Keys: https://openrouter.ai/keys
3. Create new key
4. Add to `.env`: `OPENROUTER_API_KEY=sk-or-v1-...`

### DeepSeek
1. Sign up: https://platform.deepseek.com/
2. Go to API Keys section
3. Create new key
4. Add to `.env`: `DEEPSEEK_API_KEY=sk-...`

### Qwen (Alibaba Cloud)
1. Sign up: https://dashscope.aliyun.com/
2. Get API key
3. Add to `.env`: `QWEN_API_KEY=sk-...`

---

## 📁 Files Modified

| File | Purpose |
|------|---------|
| `/api/modelManager.js` | Core model management logic with config.json support |
| `/api/server.js` | Integrated model manager, added health endpoint |
| `/api/config.json` | Main configuration file (replaces .env for AI models) |
| `/api/config.example.json` | Configuration template with examples |
| `/public/js/chat.js` | Added maintenance page UI handling |
| `/public/css/chat.css` | Styled maintenance page |

---

## 🎯 Testing

### Test Round-Robin
```bash
# Send multiple requests, watch logs to see rotation
for i in {1..5}; do
  curl -k -X POST https://localhost:11130/api/chat \
    -H "Content-Type: application/json" \
    -d '{"message":"Hello"}' | jq '.modelUsed'
done
```

### Test Failover
1. Use invalid API key for one provider
2. Send chat request
3. Watch logs - should automatically try next model

### Test Maintenance Mode
1. Use invalid API keys for all providers
2. Open chat page
3. Should see maintenance page

---

## 🚀 Future Enhancements

- [ ] Model performance metrics (latency, token usage)
- [ ] Automatic model re-enablement after cooldown
- [ ] User-configurable model preferences
- [ ] Cost tracking per model
- [ ] A/B testing different models
- [ ] Custom model weighting (prefer certain models)

---

## 📞 Support

If you encounter issues:
1. Check server logs: `tail -f /var/tmp/portai.log`
2. Verify API keys in `api/config.json`
3. Ensure at least one model is enabled in config.json
4. Test health endpoint: `curl -k https://localhost:11130/api/ai/health`
5. Restart server if needed

---

**Last Updated:** December 23, 2025
**Version:** 2.0.0 (Config.json-based)
