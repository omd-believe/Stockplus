import React, { useState } from 'react';
import { endpoints } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { formatCurrency, formatDate } from '../utils/format';
import { Panel } from '../components/Panel';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Pnl } from '../components/Pnl';
import { DataTable } from '../components/DataTable';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { formatPercentage } from '../utils/formatters';

export default function HistoryPage() {
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const fetchHistory = () => endpoints.getTransactions(page, pageSize);
  const { data, loading, error, reload } = useAsync(fetchHistory, [page]);

  const columns = [
    {
      key: 'createdAt',
      header: 'Date',
      render: (v) => formatDate(v),
    },
    {
      key: 'type',
      header: 'Type',
      render: (v) => {
        const isBuy = v === 'BUY';
        return (
          <Badge variant={isBuy ? 'filled' : 'outlined'}>
            {isBuy ? 'Buy' : 'Sell'}
          </Badge>
        );
      },
    },
    {
      key: 'symbol',
      header: 'Stock',
      render: (_, row) => (
        <div>
          <span className="stock-symbol-bold">{row.symbol}</span>
          {row.companyName && (
            <span className="stock-cell-sub"> · {row.companyName}</span>
          )}
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Qty',
      align: 'right',
      render: (v) => <span className="tabular-nums">{v}</span>,
    },
    {
      key: 'executionPrice',
      header: 'Fill price',
      align: 'right',
      render: (v, row) => (
        <span className="tabular-nums">
          {formatCurrency(v ?? row.price)}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total',
      align: 'right',
      render: (v) => <span className="tabular-nums">{formatCurrency(v)}</span>,
    },
    {
      key: 'impactPct',
      header: 'Market impact',
      align: 'center',
      render: (v, row) => {
        if (!v) return <span className="text-muted" style={{ color: 'var(--ink-3)' }}>—</span>;
        const isBuy = row.type === 'BUY';
        return (
          <span
            style={{
              display: 'inline-flex',
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--fill)',
              fontSize: 'var(--text-xs)',
              color: isBuy ? 'var(--gain)' : 'var(--loss)',
              fontWeight: 500,
            }}
          >
            Moved {row.symbol} {isBuy ? '+' : '−'}{formatPercentage(v)}
          </span>
        );
      },
    },
    {
      key: 'realizedPnl',
      header: 'Realized P&L',
      align: 'right',
      render: (v, row) =>
        row.type === 'SELL' ? (
          <Pnl value={v} showArrow={true} />
        ) : (
          <span className="text-muted">–</span>
        ),
    },
  ];

  if (loading) {
    return (
      <Panel title="Order history">
        <Skeleton count={6} height="48px" />
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel title="Order history">
        <EmptyState
          message={error.message || 'Unable to load transaction history.'}
          action={<Button onClick={reload}>Try again</Button>}
        />
      </Panel>
    );
  }

  const { content = [], totalPages = 0 } = data || {};

  return (
    <Panel title="Order history">
      <DataTable
        columns={columns}
        rows={content}
        rowKey="id"
        emptyState={<EmptyState message="No trades yet." />}
      />

      {totalPages > 1 && (
        <div className="pagination-bar">
          <Button
            variant="secondary"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>

          <span className="pagination-status tabular-nums">
            Page {page + 1} of {totalPages}
          </span>

          <Button
            variant="secondary"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </Panel>
  );
}
