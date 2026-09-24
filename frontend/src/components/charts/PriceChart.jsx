import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import { SegmentedControl } from '../SegmentedControl';
import { formatCurrency } from '../../utils/formatters';

const RANGE_OPTIONS = [
  { label: '1H', value: '1H' },
  { label: '1D', value: '1D' },
  { label: '1W', value: '1W' },
  { label: 'ALL', value: 'ALL' },
];

function formatTimeTick(timestamp, range) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (range === '1H' || range === '1D') {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function formatFullTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return `${date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}`;
}

// Custom tooltip card
function CustomTooltip({ active, payload, range }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        style={{
          background: 'var(--surface)',
          color: 'var(--ink)',
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow)',
          border: '1px solid var(--line)',
          fontSize: 'var(--text-xs)',
          pointerEvents: 'none',
        }}
      >
        <div style={{ color: 'var(--ink-2)', marginBottom: 2 }}>
          {formatFullTime(data.timestamp)}
        </div>
        <div className="tabular-nums" style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
          {formatCurrency(data.price)}
        </div>
      </div>
    );
  }
  return null;
}

// Custom dot for trades
function TradeDot(props) {
  const { cx, cy, trade } = props;
  if (!cx || !cy || !trade) return null;
  const isBuy = trade.type === 'BUY';

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={isBuy ? 'var(--ink)' : 'var(--surface)'}
        stroke="var(--ink)"
        strokeWidth={1.5}
      />
      <title>{`You ${isBuy ? 'bought' : 'sold'} ${trade.quantity} at ${formatCurrency(trade.price)}`}</title>
    </g>
  );
}

export default function PriceChart({
  symbol,
  historyData,
  selectedRange,
  onRangeChange,
  loading = false,
  error = null,
  onRetry = null,
}) {
  const isFirstRender = useRef(true);
  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const checkWidth = () => {
      setIsNarrow(window.innerWidth < 480);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Process chart points
  const points = useMemo(() => {
    if (!historyData || !historyData.points) return [];
    return historyData.points.map((p) => ({
      ...p,
      timestamp: new Date(p.t).getTime(),
    }));
  }, [historyData]);

  // Process trades with numeric timestamps
  const tradesWithTime = useMemo(() => {
    if (!historyData || !historyData.trades) return [];
    return historyData.trades.map((tr) => ({
      ...tr,
      timestamp: new Date(tr.t).getTime(),
    }));
  }, [historyData]);

  const changePct = historyData?.changePct ?? 0;
  const isGain = changePct >= 0;
  const strokeColor = isGain ? 'var(--gain)' : 'var(--loss)';
  const gradientId = `area-gradient-${symbol}-${selectedRange}`;

  // Domain computation with 0.5% padding
  const yDomain = useMemo(() => {
    if (!points || points.length === 0) return ['auto', 'auto'];
    const prices = points.map((p) => p.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const pad = (maxP - minP) * 0.05 || maxP * 0.005 || 1;
    return [Math.max(0, minP - pad), maxP + pad];
  }, [points]);

  const ariaDescription = historyData
    ? `${symbol} price, ${selectedRange} range, from ${historyData.open ?? 0} to ${historyData.close ?? 0}, ${isGain ? 'up' : 'down'} ${Math.abs(changePct).toFixed(2)}%`
    : `${symbol} price chart`;

  return (
    <figure
      aria-label={ariaDescription}
      style={{
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        width: '100%',
      }}
    >
      {/* Range controls row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <SegmentedControl
          options={RANGE_OPTIONS}
          value={selectedRange}
          onChange={onRangeChange}
          size="sm"
          ariaLabel="Chart range selector"
        />

        {historyData && (
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--ink-3)',
              display: 'flex',
              gap: 12,
            }}
          >
            <span>H: {formatCurrency(historyData.high)}</span>
            <span>L: {formatCurrency(historyData.low)}</span>
          </div>
        )}
      </div>

      {/* Chart container with clamp height */}
      <div
        style={{
          height: 'clamp(220px, 40vw, 380px)',
          width: '100%',
          position: 'relative',
          touchAction: 'pan-y',
        }}
      >
        {loading && !points.length && (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--surface-2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--line)',
            }}
          >
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-3)' }}>
              Loading chart data…
            </span>
          </div>
        )}

        {error && (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: 'var(--surface-2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--line)',
            }}
          >
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--loss)' }}>
              Failed to load chart
            </span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                style={{
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--line-strong)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--ink)',
                }}
              >
                Retry
              </button>
            )}
          </div>
        )}

        {!loading && !error && points.length < 2 && (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--surface-2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--line)',
            }}
          >
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-3)' }}>
              Not enough data yet
            </span>
          </div>
        )}

        {points.length >= 2 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={points}
              margin={{ top: 10, right: isNarrow ? 0 : 20, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="var(--line)"
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(t) => formatTimeTick(t, selectedRange)}
                stroke="var(--ink-3)"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: 'var(--ink-3)' }}
                minTickGap={40}
              />

              {!isNarrow && (
                <YAxis
                  orientation="right"
                  domain={yDomain}
                  tickFormatter={(p) => `₹${p.toFixed(0)}`}
                  stroke="var(--ink-3)"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'var(--ink-3)' }}
                  width={60}
                />
              )}

              <Tooltip
                content={<CustomTooltip range={selectedRange} />}
                cursor={{ stroke: 'var(--ink-3)', strokeWidth: 1, strokeDasharray: '3 3' }}
              />

              {historyData?.open && (
                <ReferenceLine
                  y={historyData.open}
                  stroke="var(--ink-3)"
                  strokeDasharray="2 2"
                  strokeWidth={1}
                  label={{
                    value: 'Open',
                    position: 'insideLeft',
                    fill: 'var(--ink-3)',
                    fontSize: 10,
                  }}
                />
              )}

              {/* Trade markers */}
              {tradesWithTime.map((tr, idx) => (
                <ReferenceDot
                  key={`trade-${idx}`}
                  x={tr.timestamp}
                  y={tr.price}
                  r={5}
                  shape={(dotProps) => <TradeDot {...dotProps} trade={tr} />}
                />
              ))}

              <Area
                type="monotone"
                dataKey="price"
                stroke={strokeColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                isAnimationActive={isFirstRender.current}
                animationDuration={600}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Visually hidden table for screen readers */}
      {historyData && (
        <table className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
          <caption>{symbol} price summary for {selectedRange}</caption>
          <thead>
            <tr>
              <th scope="col">Open</th>
              <th scope="col">High</th>
              <th scope="col">Low</th>
              <th scope="col">Close</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{historyData.open}</td>
              <td>{historyData.high}</td>
              <td>{historyData.low}</td>
              <td>{historyData.close}</td>
            </tr>
          </tbody>
        </table>
      )}
    </figure>
  );
}
