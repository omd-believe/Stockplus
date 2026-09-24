import React from 'react';

export function EmptyState({ message, action, className = '' }) {
  return (
    <div className={`empty-state ${className}`}>
      <p className="empty-state-message">{message}</p>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
