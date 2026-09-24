import React, { useState, useCallback } from 'react';
import { endpoints } from '../api/endpoints';
import { usePolling } from '../hooks/usePolling';
import { StockRow } from '../components/StockRow';
import { Skeleton } from '../components/Skeleton';
import { useMediaQuery } from '../hooks/useMediaQuery';

export default function MarketPage() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMobile = useMediaQuery('(max-width: 767px)');

  const fetchStocks = useCallback(async () => {
    try {
      const data = await endpoints.getStocks();
      setStocks(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load market data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll /stocks every 5 seconds
  const { isFailing } = usePolling(fetchStocks, 5000);

  return (
    <div className="market-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, margin: 0 }}>
            Market Overview
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-2)', margin: '4px 0 0' }}>
            Live virtual market quotes with trade impact simulation.
          </p>
        </div>

        {isFailing && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-3)' }}>
            Reconnecting…
          </span>
        )}
      </div>

      {loading && !stocks.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Skeleton height={52} />
          <Skeleton height={52} />
          <Skeleton height={52} />
          <Skeleton height={52} />
        </div>
      ) : error && !stocks.length ? (
        <div
          style={{
            padding: 32,
            textAlign: 'center',
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--line)',
          }}
        >
          <p style={{ color: 'var(--loss)', marginBottom: 12 }}>{error}</p>
          <button
            type="button"
            onClick={fetchStocks}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line-strong)',
              fontSize: 'var(--text-sm)',
            }}
          >
            Retry
          </button>
        </div>
      ) : isMobile ? (
        /* Mobile stacked cards */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {stocks.map((stock) => (
            <StockRow key={stock.symbol} stock={stock} mode="card" />
          ))}
        </div>
      ) : (
        /* Desktop / tablet table */
        <div
          style={{
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--line)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--line)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--ink-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Symbol &amp; Company</th>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Sector</th>
                <th style={{ padding: '12px 16px', fontWeight: 500, textAlign: 'right' }}>
                  Current Price
                </th>
                <th style={{ padding: '12px 16px', fontWeight: 500, textAlign: 'right' }}>
                  Day Change
                </th>
                <th style={{ padding: '12px 16px', fontWeight: 500, textAlign: 'right' }}>
                  Trend
                </th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((stock) => (
                <StockRow key={stock.symbol} stock={stock} mode="table" />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
