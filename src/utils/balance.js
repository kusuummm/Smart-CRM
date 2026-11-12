/**
 * Utility functions for parsing and formatting currency and balance amounts.
 * Prevents NaN display caused by leading currency symbols (e.g. '₹0.0').
 */

/**
 * Safely parse any balance representation (number, string with currency symbol, null, undefined)
 * into a valid JavaScript floating point number.
 *
 * @param {any} val - Input balance value (e.g. 500, '500', '₹500.0', '₹ 1,500.00', null, NaN)
 * @returns {number} Clean numeric balance (guaranteed to never return NaN)
 */
export function parseCleanBalance(val) {
  if (typeof val === 'number') {
    return isNaN(val) ? 0.0 : val;
  }
  if (!val) return 0.0;
  const str = String(val).trim();
  // Strip currency symbols, commas, and all non-numeric characters except '.' and '-'
  const cleaned = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0.0 : parsed;
}

/**
 * Format balance as an Indian Rupee string with single '₹' prefix and fixed decimals
 *
 * @param {any} val - Input balance
 * @param {number} decimals - Number of decimal digits (default 1)
 * @returns {string} e.g. "₹500.0"
 */
export function formatCurrency(val, decimals = 1) {
  const num = parseCleanBalance(val);
  return `₹${num.toFixed(decimals)}`;
}
