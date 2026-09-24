import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkline } from './charts/Sparkline';
import { StatChip } from './StatChip';
import { formatCurrency } from '../utils/formatters';

export function StockRow({ stock, mode = 'table' }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/stock/${stock.symbol}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  if (mode === 'card') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="stock-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: '16px',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--line)',
          cursor: 'pointer',
          transition: 'background-color var(--transition-fast), border-color var(--transition-fast)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--ink)' }}>
                {stock.symbol}
              </span>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--ink-3)',
                  backgroundColor: 'var(--fill)',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {stock.sector}
              </span>
            </div>
            <div
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--ink-2)',
                marginTop: 2,
                maxWidth: 180,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {stock.companyName}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div className="tabular-nums" style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>
              {formatCurrency(stock.currentPrice)}
            </div>
            <div style={{ marginTop: 4 }}>
              <StatChip
                changePct={stock.dayChangePct ?? 0}
                changeAbs={stock.dayChangeAbs ?? 0}
                size="sm"
              />
            </div>
          </div>
        </div>

        {stock.sparkline && stock.sparkline.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
            <Sparkline data={stock.sparkline} width={120} height={32} />
          </div>
        )}
      </div>
    );
  }

  // Table row mode (desktop)
  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="stock-table-row"
      style={{
        cursor: 'pointer',
        borderBottom: '1px solid var(--line)',
        transition: 'background-color var(--transition-fast)',
      }}
    >
      <td style={{ padding: '14px 16px' }}>
        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{stock.symbol}</div>
        <div
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--ink-2)',
            maxWidth: 220,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {stock.companyName}
        </div>
      </td>
      <td style={{ padding: '14px 16px', color: 'var(--ink-2)', fontSize: 'var(--text-sm)' }}>
        {stock.sector}
      </td>
      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 500 }} className="tabular-nums">
        {formatCurrency(stock.currentPrice)}
      </td>
      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
        <StatChip
          changePct={stock.dayChangePct ?? 0}
          changeAbs={stock.dayChangeAbs ?? 0}
          size="sm"
        />
      </td>
      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
        {stock.sparkline && stock.sparkline.length > 1 ? (
          <div style={{ display: 'inline-block' }}>
            <Sparkline data={stock.sparkline} width={90} height={28} />
          </div>
        ) : (
          <span style={{ color: 'var(--ink-3)', fontSize: 'var(--text-xs)' }}>—</span>
        )}
      </td>
    </tr>
  );
}
