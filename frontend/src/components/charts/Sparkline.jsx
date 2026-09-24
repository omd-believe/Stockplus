import React from 'react';

export function Sparkline({
  data = [],
  width = 84,
  height = 28,
  strokeWidth = 1.5,
  className = '',
}) {
  if (!data || data.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={`sparkline-empty ${className}`}
        style={{ display: 'block', overflow: 'visible' }}
        aria-hidden="true"
      >
        <line
          x1={2}
          y1={height / 2}
          x2={width - 2}
          y2={height / 2}
          stroke="var(--line-strong)"
          strokeWidth={strokeWidth}
          strokeDasharray="2 2"
        />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Add padding so stroke isn't clipped
  const padY = 4;
  const usableHeight = height - padY * 2;
  const padX = 2;
  const usableWidth = width - padX * 2;

  const points = data
    .map((val, idx) => {
      const x = padX + (idx / (data.length - 1)) * usableWidth;
      const y = padY + usableHeight - ((val - min) / range) * usableHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const isGain = data[data.length - 1] >= data[0];
  const strokeColor = isGain ? 'var(--gain)' : 'var(--loss)';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`sparkline ${className}`}
      style={{ display: 'block', overflow: 'visible' }}
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
