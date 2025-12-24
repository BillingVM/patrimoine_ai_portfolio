# 📄 Config.json Configuration Guide

## Overview

The Portfolio AI system uses a flexible JSON-based configuration file instead of environment variables. This provides better control over AI models with features like:

- ✅ Per-model enable/disable toggles
- ✅ Individual API keys for specific models
- ✅ Pricing tracking (inPrice/outPrice per 1M tokens)
- ✅ Easy model management without server restart for config changes
- ✅ Support for multiple providers (OpenRouter, DeepSeek, Qwen)

---

## 📁 File Location

**Configuration File:** `/var/www/sol.inoutconnect.com/portai/api/config.json`

**Template File:** `/var/www/sol.inoutconnect.com/portai/api/config.example.json`

---

## 🏗️ Configuration Structure

```json
{
    "ai": {
        "openrouter": { /* OpenRouter models config */ },
        "deepseek": { /* DeepSeek direct API config */ },
        "qwen": { /* Qwen direct API config */ }
    },
    "financial": {
        "financialDatasetsApiKey": "your-api-key"
    }
}
```

---

## 🤖 OpenRouter Configuration

OpenRouter provides access to multiple AI models through a single API key.

### Basic Structure

```json
{
    "ai": {
        "openrouter": {
            "apiKey": "sk-or-v1-your-api-key-here",
            "models": [
                {
                    "name": "xiaomi/mimo-v2-flash:free",
                    "displayName": "Xiaomi Mimo v2 Flash",
                    "enabled": true,
                    "price": {
                        "inPrice": 0,
                        "outPrice": 0
                    },
                    "apiKey": null
                }
            ]
        }
    }
}
```

### Model Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Official model identifier (from OpenRouter) |
| `displayName` | string | Human-readable name shown in logs |
| `enabled` | boolean | Enable/disable this model in rotation |
| `price.inPrice` | number | Input price per 1M tokens (USD) |
| `price.outPrice` | number | Output price per 1M tokens (USD) |
| `apiKey` | string/null | Override API key for this specific model (optional) |

### Free Models via OpenRouter

```json
{
    "name": "xiaomi/mimo-v2-flash:free",
    "displayName": "Xiaomi Mimo v2 Flash",
    "enabled": true,
    "price": { "inPrice": 0, "outPrice": 0 },
    "apiKey": null
}
```

### Paid Models via OpenRouter

```json
{
    "name": "deepseek/deepseek-chat",
    "displayName": "DeepSeek Chat",
    "enabled": true,
    "price": { "inPrice": 0.27, "outPrice": 1.1 },
    "apiKey": null
}
```

### Per-Model API Keys

You can use different API keys for specific models:

```json
{
    "openrouter": {
        "apiKey": "sk-or-v1-default-key",
        "models": [
            {
                "name": "deepseek/deepseek-chat",
                "displayName": "DeepSeek Chat",
                "enabled": true,
                "price": { "inPrice": 0.27, "outPrice": 1.1 },
                "apiKey": "sk-or-v1-special-key-for-deepseek"
            }
        ]
    }
}
```

---

## 🚀 DeepSeek Direct API Configuration

Use DeepSeek's direct API for lower costs compared to OpenRouter.

```json
{
    "ai": {
        "deepseek": {
            "enabled": true,
            "apiKey": "sk-your-deepseek-api-key",
            "models": [
                {
                    "name": "deepseek-chat",
                    "displayName": "DeepSeek Chat (Direct API)",
                    "enabled": true,
                    "price": {
                        "inPrice": 0.14,
                        "outPrice": 0.28
                    }
                }
            ]
        }
    }
}
```

**Benefits:**
- Lower cost: $0.14/$0.28 vs $0.27/$1.1 via OpenRouter
- Direct connection to DeepSeek API
- Better rate limits

**Get API Key:** https://platform.deepseek.com/

---

## 🌟 Qwen Direct API Configuration

Use Alibaba's Qwen API directly.

```json
{
    "ai": {
        "qwen": {
            "enabled": true,
            "apiKey": "sk-your-qwen-api-key",
            "models": [
                {
                    "name": "qwen-turbo",
                    "displayName": "Qwen Turbo (Direct API)",
                    "enabled": true,
                    "price": {
                        "inPrice": 0.3,
                        "outPrice": 0.6
                    }
                }
            ]
        }
    }
}
```

**Get API Key:** https://dashscope.aliyun.com/

---

## 💰 Financial API Configuration

```json
{
    "financial": {
        "financialDatasetsApiKey": "your-financial-datasets-api-key"
    }
}
```

This API provides stock data, financial metrics, and company information for the AI chat tools.

**Get API Key:** https://financialdatasets.ai/

---

## 📋 Complete Example Configuration

```json
{
    "ai": {
        "openrouter": {
            "apiKey": "sk-or-v1-your-openrouter-key",
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
                },
                {
                    "name": "deepseek/deepseek-chat",
                    "displayName": "DeepSeek Chat",
                    "enabled": false,
                    "price": { "inPrice": 0.27, "outPrice": 1.1 },
                    "apiKey": null
                }
            ]
        },
        "deepseek": {
            "enabled": true,
            "apiKey": "sk-your-deepseek-key",
            "models": [
                {
                    "name": "deepseek-chat",
                    "displayName": "DeepSeek Chat (Direct API)",
                    "enabled": true,
                    "price": { "inPrice": 0.14, "outPrice": 0.28 }
                }
            ]
        },
        "qwen": {
            "enabled": false,
            "apiKey": "",
            "models": [
                {
                    "name": "qwen-turbo",
                    "displayName": "Qwen Turbo (Direct API)",
                    "enabled": false,
                    "price": { "inPrice": 0.3, "outPrice": 0.6 }
                }
            ]
        }
    },
    "financial": {
        "financialDatasetsApiKey": "b2fc1001-ebc6-4740-8968-a22092058880"
    }
}
```

---

## 🎯 Common Use Cases

### 1. Free Models Only (Testing/Development)

```json
{
    "ai": {
        "openrouter": {
            "apiKey": "sk-or-v1-your-key",
            "models": [
                {
                    "name": "xiaomi/mimo-v2-flash:free",
                    "displayName": "Xiaomi Mimo v2 Flash",
                    "enabled": true,
                    "price": { "inPrice": 0, "outPrice": 0 },
                    "apiKey": null
                }
            ]
        }
    }
}
```

**Cost:** $0 - Perfect for testing

---

### 2. Mixed Free + Paid (Balanced)

Enable free models for general queries, with paid models as fallback for better quality.

```json
{
    "ai": {
        "openrouter": {
            "apiKey": "sk-or-v1-your-key",
            "models": [
                // 3 free models enabled
                // 1 paid model disabled (used via direct API instead)
            ]
        },
        "deepseek": {
            "enabled": true,
            "apiKey": "sk-deepseek-key",
            "models": [
                {
                    "name": "deepseek-chat",
                    "enabled": true,
                    // Lower cost via direct API
                }
            ]
        }
    }
}
```

**Cost:** Minimal - Free models handle most requests

---

### 3. Premium Models Only (Production)

```json
{
    "ai": {
        "openrouter": {
            "models": [ /* all free models disabled */ ]
        },
        "deepseek": {
            "enabled": true,
            "models": [ { "enabled": true } ]
        },
        "qwen": {
            "enabled": true,
            "models": [ { "enabled": true } ]
        }
    }
}
```

**Cost:** Higher - Best quality responses

---

## 🔧 Enabling/Disabling Models

### Temporarily Disable a Model

Simply change `"enabled": true` to `"enabled": false`:

```json
{
    "name": "xiaomi/mimo-v2-flash:free",
    "displayName": "Xiaomi Mimo v2 Flash",
    "enabled": false,  // ← Model will not be loaded
    "price": { "inPrice": 0, "outPrice": 0 },
    "apiKey": null
}
```

**Restart required:** Yes

### Disable All Free Models

```json
{
    "openrouter": {
        "models": [
            { "enabled": false },  // Mimo
            { "enabled": false },  // Llama
            { "enabled": false }   // Gemma
        ]
    }
}
```

---

## 🔍 Monitoring Configuration

### Check Active Models

```bash
curl -k https://localhost:11130/api/ai/health | python3 -m json.tool
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
            "id": "openrouter-xiaomi-mimo-v2-flash-free",
            "name": "Xiaomi Mimo v2 Flash",
            "provider": "openrouter",
            "free": true,
            "pricing": { "inPrice": 0, "outPrice": 0 },
            "active": true,
            "failCount": 0
        }
    ]
}
```

### Check Server Logs

```bash
tail -f /var/tmp/portai.log
```

**Expected Output:**
```
✅ Initialized 4 AI models
   - Xiaomi Mimo v2 Flash (openrouter - FREE)
   - Meta Llama 3.1 8B (openrouter - FREE)
   - Google Gemma 2 9B (openrouter - FREE)
   - DeepSeek Chat (Direct API) (deepseek ($0.14/$0.28 per 1M tokens))
```

---

## ⚙️ Applying Configuration Changes

1. Edit `api/config.json`
2. Restart the server:
   ```bash
   pkill -f "node.*server.js"
   cd /var/www/sol.inoutconnect.com/portai/api
   node server.js > /var/tmp/portai.log 2>&1 &
   ```
3. Verify changes:
   ```bash
   curl -k https://localhost:11130/api/ai/health
   ```

---

## 🚨 Common Issues

### Issue: Server Won't Start

**Error:** `Configuration file not found or invalid`

**Solution:**
1. Ensure `api/config.json` exists
2. Validate JSON syntax: `python3 -m json.tool api/config.json`
3. Check file permissions: `chmod 644 api/config.json`

---

### Issue: No Models Initialized

**Error:** `⚠️ No AI models configured!`

**Solution:**
1. Ensure at least one model has `"enabled": true`
2. Check API key is valid in config.json
3. Review server logs: `tail -30 /var/tmp/portai.log`

---

### Issue: Maintenance Mode Always Shows

**Cause:** All models failed to initialize or became inactive

**Solution:**
1. Check `/api/ai/health` endpoint
2. Verify API keys are valid
3. Enable at least one model in config.json
4. Restart server

---

## 💡 Best Practices

1. **Start Small:** Begin with free models only
2. **Test Thoroughly:** Verify each model before enabling in production
3. **Monitor Costs:** Use pricing fields to track expenses
4. **Keep Backups:** Save a copy of working config.json
5. **Use Direct APIs:** DeepSeek direct API is cheaper than via OpenRouter
6. **Enable Gradually:** Add paid models only when needed

---

## 📊 Pricing Comparison

| Provider | Model | Input (per 1M) | Output (per 1M) | Quality |
|----------|-------|----------------|-----------------|---------|
| OpenRouter | Xiaomi Mimo | $0 | $0 | Good |
| OpenRouter | Llama 3.1 8B | $0 | $0 | Good |
| OpenRouter | Gemma 2 9B | $0 | $0 | Good |
| DeepSeek Direct | deepseek-chat | $0.14 | $0.28 | Excellent |
| DeepSeek via OR | deepseek-chat | $0.27 | $1.1 | Excellent |
| Qwen Direct | qwen-turbo | $0.3 | $0.6 | Excellent |

**Recommendation:** Use DeepSeek Direct API for best cost/quality ratio

---

## 🔗 Useful Links

- **OpenRouter Dashboard:** https://openrouter.ai/keys
- **DeepSeek Platform:** https://platform.deepseek.com/
- **Qwen Dashboard:** https://dashscope.aliyun.com/
- **Financial Datasets:** https://financialdatasets.ai/

---

**Last Updated:** December 23, 2025
**Version:** 2.0.0
