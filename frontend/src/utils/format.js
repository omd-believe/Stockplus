/**
 * Formatters for currency, percentage, signed money, and dates.
 * Strict en-IN locale, null-safe, using real typographical minus (−) and en-dash (–).
 */

const DASH = '\u2013'; // –
const MINUS = '\u2212'; // −

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrWholeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatCurrency(value, { whole = false } = {}) {
  if (value === null || value === undefined || isNaN(value)) return DASH;
  const num = Number(value);
  const formatter = whole ? inrWholeFormatter : inrFormatter;
  const absFormatted = formatter.format(Math.abs(num));
  if (num < 0) {
    return `${MINUS}${absFormatted}`;
  }
  return absFormatted;
}

export function formatSignedMoney(value, { whole = false } = {}) {
  if (value === null || value === undefined || isNaN(value)) return DASH;
  const num = Number(value);
  const formatter = whole ? inrWholeFormatter : inrFormatter;
  const absFormatted = formatter.format(Math.abs(num));
  if (num > 0) return `+${absFormatted}`;
  if (num < 0) return `${MINUS}${absFormatted}`;
  return absFormatted;
}

export function formatPercent(value, { signed = false } = {}) {
  if (value === null || value === undefined || isNaN(value)) return DASH;
  const num = Number(value);
  const formatted = Math.abs(num).toFixed(2) + '%';
  if (signed) {
    if (num > 0) return `+${formatted}`;
    if (num < 0) return `${MINUS}${formatted}`;
    return `0.00%`;
  }
  return num < 0 ? `${MINUS}${formatted}` : `${num.toFixed(2)}%`;
}

export const formatPercentage = (value, options) => formatPercent(value, options);

export function formatDate(value) {
  if (!value) return DASH;
  const date = new Date(value);
  if (isNaN(date.getTime())) return DASH;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}
