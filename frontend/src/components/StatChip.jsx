import React from 'react';
import { formatCurrency, formatPercentage } from '../utils/formatters';

export function StatChip({
  changePct = 0,
  changeAbs = null,
  suffix = '',
  size = 'md',
  showIcon = true,
  className = '',
}) {
  const isPositive = changePct >= 0;
  const isZero = Math.abs(changePct) < 0.0001;

  const color = isZero ? 'var(--ink-2)' : isPositive ? 'var(--gain)' : 'var(--loss)';
  const bg = isZero
    ? 'var(--fill)'
    : isPositive
    ? 'rgba(31, 122, 77, 0.12)'
    : 'rgba(180, 35, 24, 0.12)';

  let text = '';
  if (changeAbs !== null && changeAbs !== undefined) {
    const sign = isPositive ? '+' : '';
    text = `${sign}${formatCurrency(changeAbs)} (${Math.abs(changePct).toFixed(2)}%)`;
  } else {
    text = `${isPositive ? '+' : ''}${formatPercentage(changePct)}`;
  }

  if (suffix) {
    text += ` · ${suffix}`;
  }

  const isSmall = size === 'sm';

  return (
    <span
      className={`stat-chip tabular-nums ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: isSmall ? '2px 8px' : '4px 10px',
        borderRadius: 'var(--radius-pill)',
        fontSize: isSmall ? 'var(--text-xs)' : 'var(--text-sm)',
        fontWeight: 500,
        color: color,
        backgroundColor: bg,
        lineHeight: 1.2,
      }}
    >
      {showIcon && !isZero && (
        <span aria-hidden="true" style={{ fontSize: isSmall ? 9 : 11 }}>
          {isPositive ? '▲' : '▼'}
        </span>
      )}
      {text}
    </span>
  );
}
