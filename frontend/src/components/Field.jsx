import React from 'react';

export function Field({
  id,
  label,
  error,
  hint,
  children,
  className = '',
}) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  // Clone single input element if passed as children, injecting id and aria-describedby
  const renderedChild =
    React.isValidElement(children) && children.type !== 'div'
      ? React.cloneElement(children, {
          id: children.props.id || id,
          'aria-describedby': children.props['aria-describedby'] || describedBy,
          'aria-invalid': !!error,
        })
      : children;

  return (
    <div className={`field-group ${error ? 'has-error' : ''} ${className}`}>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
        </label>
      )}
      <div className="field-control">{renderedChild}</div>
      {hint && !error && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
