/**
 * Format large numbers with alphabetical suffixes (K, M, B, T, etc.)
 * @param {number} num - The number to format
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted number with suffix
 * 
 * Examples:
 * formatNumber(1500) => "1.5K"
 * formatNumber(2000000) => "2M"
 * formatNumber(5000000000) => "5B"
 * formatNumber(1200000000000) => "1.2T"
 */
export function formatNumber(num, decimals = 1) {
  if (num == null || num === 0) return '0';
  
  // Handle negative numbers
  const sign = num < 0 ? '-' : '';
  const absNum = Math.abs(num);

  const abbreviations = [
    { value: 1e33, suffix: 'Dc' },  // Decillion
    { value: 1e30, suffix: 'No' },  // Nonillion
    { value: 1e27, suffix: 'Oc' },  // Octillion
    { value: 1e24, suffix: 'Sp' },  // Septillion
    { value: 1e21, suffix: 'Sx' },  // Sextillion
    { value: 1e18, suffix: 'Qi' },  // Quintillion
    { value: 1e15, suffix: 'Qa' },  // Quadrillion
    { value: 1e12, suffix: 'T' },   // Trillion
    { value: 1e9, suffix: 'B' },    // Billion
    { value: 1e6, suffix: 'M' },    // Million
    { value: 1e3, suffix: 'K' },    // Thousand
  ];

  for (const { value, suffix } of abbreviations) {
    if (absNum >= value) {
      const formatted = (absNum / value).toFixed(decimals);
      // Remove trailing zeros and decimal point if not needed
      const trimmed = parseFloat(formatted).toString();
      return `${sign}${trimmed}${suffix}`;
    }
  }

  // For numbers less than 1000, return as-is with commas
  return sign + absNum.toLocaleString();
}

/**
 * Format currency with number abbreviations
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency symbol (default: '₹')
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted currency with suffix
 * 
 * Examples:
 * formatCurrency(1500) => "₹1.5K"
 * formatCurrency(2000000) => "₹2M"
 */
export function formatCurrency(amount, currency = '₹', decimals = 1) {
  return `${currency}${formatNumber(amount, decimals)}`;
}
