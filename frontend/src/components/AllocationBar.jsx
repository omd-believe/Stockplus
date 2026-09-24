import React, { useState, useEffect } from 'react';
import { formatPercent } from '../utils/format';

function interpolateShade(index, total) {
  if (total <= 1) return '#151515';
  const factor = index / (total - 1);
  // Interpolate between #151515 (21,21,21) and #BDBDBA (189,189,186)
  const r = Math.round(21 + (189 - 21) * factor);
  const g = Math.round(21 + (189 - 21) * factor);
  const b = Math.round(21 + (186 - 21) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

export function AllocationBar({ holdings = [], concentrationWarning = null }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!holdings || holdings.length === 0) {
    return (
      <div className="allocation-empty">
        <div className="allocation-bar-track allocation-bar-empty" />
        <p className="allocation-legend-text">No active holdings</p>
      </div>
    );
  }

  // Sort by allocationPct descending to ensure largest is darkest
  const sorted = [...holdings].sort((a, b) => (b.allocationPct || 0) - (a.allocationPct || 0));

  return (
    <div className="allocation-container">
      <div
        className="allocation-bar-track"
        role="progressbar"
        aria-label="Portfolio allocation"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        {sorted.map((holding, idx) => {
          const isTop = idx === 0;
          const bg = interpolateShade(idx, sorted.length);
          const width = mounted ? `${Math.max(holding.allocationPct || 0, 0)}%` : '0%';
          const hasOutline = isTop && !!concentrationWarning;

          return (
            <div
              key={holding.symbol}
              className={`allocation-bar-segment ${hasOutline ? 'allocation-bar-outline' : ''}`}
              style={{
                width,
                backgroundColor: bg,
              }}
              title={`${holding.symbol}: ${formatPercent(holding.allocationPct)}`}
            />
          );
        })}
      </div>

      {concentrationWarning && (
        <div className="allocation-warning" role="alert">
          <span className="warning-icon" aria-hidden="true">!</span>
          <span>{concentrationWarning}</span>
        </div>
      )}

      <div className="allocation-legend">
        {sorted.map((holding, idx) => (
          <div key={holding.symbol} className="allocation-legend-item">
            <span
              className="allocation-swatch"
              style={{ backgroundColor: interpolateShade(idx, sorted.length) }}
              aria-hidden="true"
            />
            <span className="allocation-symbol">{holding.symbol}</span>
            <span className="allocation-pct tabular-nums">
              {formatPercent(holding.allocationPct)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
