import React from 'react';

export function Skeleton({ width, height = '1.25rem', count = 1, className = '' }) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <div className={`skeleton-group ${className}`}>
      {items.map((key) => (
        <div
          key={key}
          className="skeleton-block"
          style={{ width: width || '100%', height }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
