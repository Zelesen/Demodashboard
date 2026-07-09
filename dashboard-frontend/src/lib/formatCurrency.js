/**
 * Format a number as UK currency with comma separators
 * @param {number} amount - The amount to format (in pounds)
 * @param {number} [decimals=0] - Number of decimal places (default 0)
 * @returns {string} Formatted currency string (e.g., "£1,234" or "£1,234.56")
 */
export function formatUKCurrency(amount, decimals = 0) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '£0';
  }
  
  const numAmount = Number(amount);
  const formatted = numAmount.toFixed(decimals);
  
  // Split into integer and decimal parts
  const parts = formatted.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1] || '';
  
  // Add comma separators to integer part (UK format)
  const withCommas = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Combine parts
  return decimalPart ? `£${withCommas}.${decimalPart}` : `£${withCommas}`;
}

/**
 * Format a number in thousands as UK currency (without K suffix)
 * @param {number} amountInThousands - The amount in thousands (e.g., 15.5 means £15,500)
 * @param {number} [decimals=0] - Number of decimal places (default 0)
 * @returns {string} Formatted currency string (e.g., "£15,500")
 */
export function formatUKCurrencyFromThousands(amountInThousands, decimals = 0) {
  if (amountInThousands === null || amountInThousands === undefined || isNaN(amountInThousands)) {
    return '£0';
  }
  
  const actualAmount = Number(amountInThousands) * 1000;
  return formatUKCurrency(actualAmount, decimals);
}