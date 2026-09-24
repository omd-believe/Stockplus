import React from 'react';

export function Button({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  ...props
}) {
  const isActionDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={`btn btn-${variant} ${loading ? 'btn-loading' : ''} ${className}`}
      disabled={isActionDisabled}
      onClick={onClick}
      {...props}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}
