import React from 'react';

export function Badge({ children, variant = 'filled', className = '' }) {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {children}
    </span>
  );
}
