import React from 'react';

export function DataTable({
  columns = [],
  rows = [],
  rowKey = 'id',
  onRowClick,
  emptyState = null,
  caption,
  className = '',
}) {
  if (!rows || rows.length === 0) {
    return emptyState || <div className="table-empty">No data available</div>;
  }

  const handleKeyDown = (e, row) => {
    if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onRowClick(row);
    }
  };

  return (
    <div className={`table-container ${className}`}>
      <table className="data-table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`th-${col.align || 'left'}`}
                style={{ textAlign: col.align || 'left' }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = typeof rowKey === 'function' ? rowKey(row) : row[rowKey];
            const isClickable = typeof onRowClick === 'function';

            return (
              <tr
                key={key}
                className={isClickable ? 'tr-clickable' : ''}
                onClick={isClickable ? () => onRowClick(row) : undefined}
                onKeyDown={isClickable ? (e) => handleKeyDown(e, row) : undefined}
                tabIndex={isClickable ? 0 : undefined}
                role={isClickable ? 'button' : undefined}
              >
                {columns.map((col) => {
                  const val = row[col.key];
                  const content = col.render ? col.render(val, row) : val;

                  return (
                    <td
                      key={col.key}
                      data-label={typeof col.header === 'string' ? col.header : col.key}
                      className={`td-${col.align || 'left'} ${col.align === 'right' ? 'tabular-nums' : ''}`}
                      style={{ textAlign: col.align || 'left' }}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
