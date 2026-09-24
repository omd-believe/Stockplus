import React from 'react';
import { formatSignedMoney, formatPercent } from '../utils/format';

/**
 * Pnl renders signed, coloured P&L values with ▲/▼ arrows.
 * The ONLY place where green (#1F7A4D) or red (#B42318) are used in the application.
 */
export function Pnl({
  value,
  percent,
  showArrow = true,
  className = '',
}) {
  if (value === null || value === undefined || isNaN(value)) {
    return <span className={`pnl pnl-zero ${className}`}>–</span>;
  }

  const numVal = Number(value);
  const isPositive = numVal > 0;
  const isNegative = numVal < 0;

  const colorClass = isPositive ? 'pnl-gain' : isNegative ? 'pnl-loss' : 'pnl-zero';
  const arrow = isPositive ? '▲' : isNegative ? '▼' : null;

  return (
    <span className={`pnl ${colorClass} ${className} tabular-nums`}>
      {showArrow && arrow && <span className="pnl-arrow" aria-hidden="true">{arrow} </span>}
      <span className="pnl-value">{formatSignedMoney(numVal)}</span>
      {percent !== undefined && percent !== null && (
        <span className="pnl-pct"> ({formatPercent(percent, { signed: true })})</span>
      )}
    </span>
  );
}
