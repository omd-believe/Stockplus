import React, { useState, useEffect } from 'react';
import { StatChip } from './StatChip';
import { useCountUp } from '../hooks/useCountUp';
import { formatCurrency } from '../utils/formatters';

export function PriceHeader({
  symbol,
  companyName,
  currentPrice = 0,
  dayChangePct = 0,
  dayChangeAbs = 0,
  rangeChangePct = null,
  rangeChangeAbs = null,
  selectedRange = '1D',
  lastUpdatedTime = null,
  driftEnabled = true,
  isReconnecting = false,
}) {
  const { value: displayPrice, flashDirection } = useCountUp(currentPrice, 300);
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    setSecondsAgo(0);
    const interval = setInterval(() => {
      if (lastUpdatedTime) {
        const diff = Math.max(0, Math.floor((Date.now() - lastUpdatedTime) / 1000));
        setSecondsAgo(diff);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdatedTime]);

  const changePct = rangeChangePct !== null ? rangeChangePct : dayChangePct;
  const changeAbs = rangeChangeAbs !== null ? rangeChangeAbs : dayChangeAbs;

  let flashColorStyle = {};
  if (flashDirection === 'gain') {
    flashColorStyle = { color: 'var(--gain)', transition: 'color 100ms ease' };
  } else if (flashDirection === 'loss') {
    flashColorStyle = { color: 'var(--loss)', transition: 'color 100ms ease' };
  } else {
    flashColorStyle = { color: 'var(--ink)', transition: 'color 600ms ease' };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
      {/* Top row: Symbol, company, and live/paused dot */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, margin: 0 }}>
            {symbol}
          </h1>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
            {companyName}
          </span>
        </div>

        {/* Live status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isReconnecting ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 'var(--text-xs)',
                color: 'var(--ink-3)',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: 'var(--ink-3)',
                }}
              />
              Reconnecting…
            </span>
          ) : !driftEnabled ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 'var(--text-xs)',
                color: 'var(--ink-3)',
                backgroundColor: 'var(--fill)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill)',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: 'var(--ink-3)',
                }}
              />
              Paused
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 'var(--text-xs)',
                color: 'var(--ink-2)',
              }}
            >
              <span
                className="live-pulse-dot"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: 'var(--gain)',
                }}
              />
              Updated {secondsAgo === 0 ? 'just now' : `${secondsAgo}s ago`}
            </span>
          )}
        </div>
      </div>

      {/* Big price and change chip */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <span
          className="display-number"
          style={{
            ...flashColorStyle,
          }}
        >
          {formatCurrency(displayPrice)}
        </span>

        <StatChip
          changePct={changePct}
          changeAbs={changeAbs}
          suffix={selectedRange}
          size="md"
        />
      </div>
    </div>
  );
}
