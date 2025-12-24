# Token Counting Implementation - Fair Billing System

## Overview
The system now counts tokens **ONLY in the final report text**, not internal API calls to financialdatasets.ai or system prompts. This ensures fair billing - users pay only for what they receive.

## How It Works

### Before (Unfair Billing)
```javascript
tokensUsed: responseData.usage.total_tokens  // Counts EVERYTHING:
// - System prompts (internal context)
// - Tool calls to financialdatasets.ai
// - Tool responses with market data
// - Final report text
```

**Example**: If OpenRouter reports 10,000 total tokens but the final report is only 2,000 tokens, the user would be charged for 10,000 tokens (unfair!).

### After (Fair Billing) ✅
```javascript
const reportTokens = tokenCounter.countTokens(finalResponse.content);
tokensUsed: reportTokens  // Counts ONLY final report
```

**Example**: Same scenario - user is charged for 2,000 tokens (the actual report they receive).

## Token Counting Method

We use the **gpt-tokenizer** library with **cl100k_base** encoding, which is the same method ChatGPT uses:

- **Encoding**: cl100k_base (GPT-3.5-turbo, GPT-4, GPT-4o default)
- **Library**: gpt-tokenizer (most feature-complete, actively maintained)
- **Accuracy**: ~3-5 characters per token (varies by language)
- **Fallback**: If encoding fails, approximates at 4 chars/token

## Files Modified

### `/portai/api/tokenCounter.js` (NEW)
Token counting module with ChatGPT-compatible counting:
- `countTokens(text)` - Count tokens in text
- `getTokenBreakdown(reportText)` - Detailed analysis
- `validateTokenCount()` - Sanity checking
- `estimateCost()` - Cost calculation

### `/portai/api/ai.js` (UPDATED)
Integrated token counter into report generation:
- Line 9: Import tokenCounter module
- Line 135-140: Count tokens in final report (with tool calls)
- Line 152-157: Count tokens in final report (no tool calls)
- Added detailed logging to show comparison

## Server Logs Example

When generating a report, you'll now see:

```
🤖 Generating AI report using xiaomi/mimo-v2-flash:free...
📊 Detected 5 tickers: AAPL, MSFT, GOOGL, AMZN, TSLA
🔧 AI requesting 3 tool calls...

📊 Token breakdown: 2,345 tokens (9,123 chars, 1,234 words)
⚠️  OpenRouter reported 8,587 total tokens (includes tool calls)
✅ Billing user for: 2,345 tokens (final report only)

💳 Deducted 2,345 credits from user. New balance: 97,655
```

**Key Insight**: OpenRouter reports 8,587 total tokens (all API activity), but we only charge 2,345 tokens (final report) = **Fair billing**

## Pricing

- **Rate**: 100,000 tokens = $3.00 USD
- **Average Report**: 2,000-5,000 tokens = $0.06 - $0.15
- **What User Pays For**: Only the final markdown report text
- **What User Doesn't Pay For**:
  - Internal system prompts
  - API calls to financialdatasets.ai
  - Tool responses with market data
  - OCR processing context

## Benefits

1. **Transparency**: Clear logging shows exactly what user is charged for
2. **Fairness**: Pay only for output received, not internal processing
3. **Trust**: Industry-standard ChatGPT token counting
4. **Accuracy**: Real token counting, not approximation
5. **Audit Trail**: Every transaction logged with exact token count

## Testing

To verify accurate counting:

1. Generate a report
2. Check server logs for token breakdown
3. Compare OpenRouter's total vs. our final report count
4. Verify `credits_transactions` table shows correct deduction

## Future Enhancements

- Add token estimation BEFORE generation (preview cost)
- Show token breakdown in UI (transparency)
- Add alerts for unusually large reports
- Implement token limits per report (cost control)
