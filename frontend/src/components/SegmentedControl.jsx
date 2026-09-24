import React from 'react';

export function SegmentedControl({
  options = [],
  value,
  onChange,
  size = 'md',
  className = '',
  name = 'segmented-control',
  ariaLabel = 'Select option',
}) {
  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % options.length;
      onChange(options[nextIndex].value);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + options.length) % options.length;
      onChange(options[prevIndex].value);
    }
  };

  const isSmall = size === 'sm';

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`segmented-control ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: 3,
        background: 'var(--fill)',
        borderRadius: 'var(--radius-pill)',
        position: 'relative',
        userSelect: 'none',
        border: '1px solid var(--line)',
      }}
    >
      {options.map((opt, idx) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            style={{
              padding: isSmall ? '4px 10px' : '6px 14px',
              fontSize: isSmall ? 'var(--text-xs)' : 'var(--text-sm)',
              fontWeight: isSelected ? 500 : 400,
              color: isSelected ? 'var(--ink)' : 'var(--ink-2)',
              backgroundColor: isSelected ? 'var(--surface)' : 'transparent',
              borderRadius: 'var(--radius-pill)',
              boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'background-color var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast)',
              whiteSpace: 'nowrap',
              minHeight: isSmall ? 32 : 36,
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
