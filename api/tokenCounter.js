/**
 * Token Counter Module
 * Counts tokens in text using GPT tokenizer (ChatGPT-compatible)
 *
 * IMPORTANT: We count tokens in the FINAL REPORT only, not internal API calls
 * This ensures fair billing - user pays only for the output they receive
 */

const { encode, encodeChat } = require('gpt-tokenizer');

/**
 * Count tokens in text (ChatGPT-compatible counting)
 * Uses cl100k_base encoding (GPT-3.5-turbo, GPT-4, GPT-4o default)
 *
 * @param {string} text - The text to count tokens for
 * @returns {number} Number of tokens
 */
function countTokens(text) {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  try {
    // Encode text to tokens using cl100k_base (ChatGPT default)
    const tokens = encode(text);
    return tokens.length;
  } catch (error) {
    console.error('❌ Error counting tokens:', error);
    // Fallback to approximation: ~4 chars per token
    return Math.ceil(text.length / 4);
  }
}

/**
 * Count tokens in a chat message format (for future use)
 * This is more accurate for chat-style inputs with roles
 *
 * @param {Array} messages - Array of {role, content} objects
 * @returns {number} Number of tokens
 */
function countChatTokens(messages) {
  if (!messages || !Array.isArray(messages)) {
    return 0;
  }

  try {
    // Use encodeChat for accurate chat token counting
    const tokens = encodeChat(messages, 'gpt-4'); // gpt-4 model format
    return tokens.length;
  } catch (error) {
    console.error('❌ Error counting chat tokens:', error);
    // Fallback: sum all content lengths
    const totalChars = messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
    return Math.ceil(totalChars / 4);
  }
}

/**
 * Estimate cost based on token count
 *
 * @param {number} tokens - Number of tokens
 * @param {number} pricePerToken - Price per token (default from credits pricing)
 * @returns {number} Cost in USD
 */
function estimateCost(tokens, pricePerToken = 3 / 100000) {
  return tokens * pricePerToken;
}

/**
 * Get detailed token breakdown for a report
 * Useful for debugging and transparency
 *
 * @param {string} reportText - The report text
 * @returns {object} Token breakdown
 */
function getTokenBreakdown(reportText) {
  const tokens = countTokens(reportText);
  const chars = reportText.length;
  const words = reportText.split(/\s+/).length;
  const lines = reportText.split('\n').length;

  return {
    tokens,
    chars,
    words,
    lines,
    avgCharsPerToken: chars / tokens,
    avgTokensPerWord: tokens / words,
  };
}

/**
 * Validate token count against expected range
 * Helps detect anomalies in counting
 *
 * @param {number} tokens - Counted tokens
 * @param {number} textLength - Original text length
 * @returns {boolean} True if count seems reasonable
 */
function validateTokenCount(tokens, textLength) {
  // Typical ratio: 1 token ≈ 3-5 characters
  // If ratio is way off, something might be wrong
  const ratio = textLength / tokens;

  if (ratio < 2 || ratio > 6) {
    console.warn(`⚠️  Unusual token ratio: ${ratio.toFixed(2)} chars/token (expected 3-5)`);
    return false;
  }

  return true;
}

module.exports = {
  countTokens,
  countChatTokens,
  estimateCost,
  getTokenBreakdown,
  validateTokenCount,
};
