import React from 'react';

export function Panel({ title, action, children, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <div className="panel-header">
          {title && <h2 className="panel-title">{title}</h2>}
          {action && <div className="panel-action">{action}</div>}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </section>
  );
}
