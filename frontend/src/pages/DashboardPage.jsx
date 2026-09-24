import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { endpoints } from '../api/endpoints';
import { usePolling } from '../hooks/usePolling';
import { useCountUp } from '../hooks/useCountUp';
import { formatCurrency, formatPercent, formatSignedMoney } from '../utils/format';
import { Panel } from '../components/Panel';
import { Button } from '../components/Button';
import { Pnl } from '../components/Pnl';
import { AllocationBar } from '../components/AllocationBar';
import { RiskMeter } from '../components/RiskMeter';
import { DataTable } from '../components/DataTable';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { Sparkline } from '../components/charts/Sparkline';
import { StatChip } from '../components/StatChip';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [risk, setRisk] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [portData, riskData, stocksData] = await Promise.all([
        endpoints.getPortfolio(),
        endpoints.getRisk(),
        endpoints.getStocks().catch(() => []),
      ]);
      setPortfolio(portData);
      setRisk(riskData);
      setStocks(stocksData || []);
      setError(null);
    } catch (err) {
      if (!portfolio) {
        setError(err.message || 'Unable to load portfolio details.');
      }
    } finally {
      setLoading(false);
    }
  }, [portfolio]);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Poll /stocks every 5 seconds for live dashboard updates
  usePolling(fetchDashboardData, 5000);

  // Animated net worth
  const { value: animatedNetWorth } = useCountUp(portfolio?.netWorth ?? 0, 400);

  // Map stocks by symbol for quick sparkline lookup
  const stockMap = useMemo(() => {
    const map = {};
    (stocks || []).forEach((s) => {
      map[s.symbol.toUpperCase()] = s;
    });
    return map;
  }, [stocks]);

  // Compute top gainer and top loser today for "Market Movers"
  const { topGainer, topLoser } = useMemo(() => {
    if (!stocks || stocks.length === 0) return { topGainer: null, topLoser: null };
    const sorted = [...stocks].sort(
      (a, b) => (b.dayChangePct ?? 0) - (a.dayChangePct ?? 0)
    );
    const gainer = sorted[0];
    const loser = sorted[sorted.length - 1];
    return { topGainer: gainer, topLoser: loser };
  }, [stocks]);

  if (loading && !portfolio) {
    return (
      <div className="dashboard-layout" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <Panel className="summary-strip">
          <Skeleton height="72px" />
        </Panel>
        <div className="dashboard-grid">
          <Panel title="Allocation & risk">
            <Skeleton height="140px" />
          </Panel>
          <Panel title="Sector breakdown">
            <Skeleton height="140px" />
          </Panel>
        </div>
        <Panel title="Holdings">
          <Skeleton count={5} height="44px" />
        </Panel>
      </div>
    );
  }

  if (error && !portfolio) {
    return (
      <Panel>
        <EmptyState
          message={error}
          action={<Button onClick={fetchDashboardData}>Try again</Button>}
        />
      </Panel>
    );
  }

  const holdings = portfolio?.holdings || [];
  const sectorEntries = Object.entries(risk?.sectorAllocation || {});
  const concentrationWarning =
    risk?.warnings && risk.warnings.length > 0 ? risk.warnings[0].message : null;

  // Columns for DataTable with sparklines
  const columns = [
    {
      key: 'stock',
      header: 'Stock',
      render: (_, row) => (
        <div>
          <div className="stock-cell-symbol">{row.symbol}</div>
          <div className="stock-cell-name">{row.companyName}</div>
        </div>
      ),
    },
    {
      key: 'sparkline',
      header: 'Trend',
      align: 'center',
      render: (_, row) => {
        const s = stockMap[row.symbol.toUpperCase()];
        return s?.sparkline && s.sparkline.length > 1 ? (
          <Sparkline data={s.sparkline} width={70} height={22} />
        ) : (
          <span style={{ color: 'var(--ink-3)', fontSize: 'var(--text-xs)' }}>—</span>
        );
      },
    },
    {
      key: 'quantity',
      header: 'Qty',
      align: 'right',
      render: (v) => <span className="tabular-nums">{v}</span>,
    },
    {
      key: 'averageBuyPrice',
      header: 'Avg price',
      align: 'right',
      render: (v) => <span className="tabular-nums">{formatCurrency(v)}</span>,
    },
    {
      key: 'currentPrice',
      header: 'Price',
      align: 'right',
      render: (v) => <span className="tabular-nums">{formatCurrency(v)}</span>,
    },
    {
      key: 'currentValue',
      header: 'Value',
      align: 'right',
      render: (v) => <span className="tabular-nums">{formatCurrency(v)}</span>,
    },
    {
      key: 'unrealizedPnl',
      header: 'P&L',
      align: 'right',
      render: (v, row) => (
        <Pnl value={v} percent={row.unrealizedPnlPct} showArrow={true} />
      ),
    },
    {
      key: 'allocationPct',
      header: 'Weight',
      align: 'right',
      render: (v) => <span className="tabular-nums">{formatPercent(v)}</span>,
    },
  ];

  // Sort holdings by currentValue descending
  const sortedHoldings = [...holdings].sort(
    (a, b) => (b.currentValue || 0) - (a.currentValue || 0)
  );

  return (
    <div className="dashboard-layout" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 1. Summary strip: Net worth with useCountUp */}
      <Panel className="summary-strip">
        <div className="summary-strip-inner">
          <div className="summary-headline">
            <span className="summary-label">Net worth</span>
            <div className="display-number tabular-nums" style={{ fontSize: 'var(--text-display)', marginTop: 4 }}>
              {formatCurrency(animatedNetWorth, { whole: true })}
            </div>
            <div className="summary-day-change tabular-nums" style={{ marginTop: 6 }}>
              {portfolio?.dayChange !== 0 ? (
                <>
                  <Pnl value={portfolio?.dayChange} showArrow={true} />
                  <span className="summary-day-text" style={{ color: 'var(--ink-2)' }}> today</span>
                </>
              ) : (
                <span className="summary-day-neutral" style={{ color: 'var(--ink-3)' }}>₹0.00 today</span>
              )}
            </div>
          </div>

          <div className="summary-metrics">
            <div className="summary-metric-col">
              <span className="metric-label">Cash</span>
              <span className="metric-value tabular-nums">
                {formatCurrency(portfolio?.cashBalance)}
              </span>
            </div>

            <div className="summary-divider" aria-hidden="true" />

            <div className="summary-metric-col">
              <span className="metric-label">Holdings value</span>
              <span className="metric-value tabular-nums">
                {formatCurrency(portfolio?.holdingsValue)}
              </span>
            </div>

            <div className="summary-divider" aria-hidden="true" />

            <div className="summary-metric-col">
              <span className="metric-label">Unrealized P&amp;L</span>
              <span className="metric-value">
                <Pnl
                  value={portfolio?.totalUnrealizedPnl}
                  percent={portfolio?.totalUnrealizedPnlPct}
                  showArrow={false}
                />
              </span>
            </div>

            <div className="summary-divider" aria-hidden="true" />

            <div className="summary-metric-col">
              <span className="metric-label">Realized P&amp;L</span>
              <span className="metric-value">
                <Pnl
                  value={portfolio?.totalRealizedPnl}
                  showArrow={false}
                />
              </span>
            </div>
          </div>
        </div>
      </Panel>

      {/* Market Movers Panel */}
      {(topGainer || topLoser) && (
        <Panel title="Market movers today">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
            }}
          >
            {topGainer && (
              <Link
                to={`/stock/${topGainer.symbol}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  transition: 'background-color var(--transition-fast)',
                }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-3)', fontWeight: 500 }}>
                    Top Gainer
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--ink)', marginTop: 2 }}>
                    {topGainer.symbol}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-2)' }}>
                    {topGainer.companyName}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="tabular-nums" style={{ fontWeight: 500 }}>
                    {formatCurrency(topGainer.currentPrice)}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <StatChip
                      changePct={topGainer.dayChangePct ?? 0}
                      changeAbs={topGainer.dayChangeAbs ?? 0}
                      size="sm"
                    />
                  </div>
                </div>
              </Link>
            )}

            {topLoser && topLoser.symbol !== topGainer?.symbol && (
              <Link
                to={`/stock/${topLoser.symbol}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  transition: 'background-color var(--transition-fast)',
                }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-3)', fontWeight: 500 }}>
                    Top Loser
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--ink)', marginTop: 2 }}>
                    {topLoser.symbol}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-2)' }}>
                    {topLoser.companyName}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="tabular-nums" style={{ fontWeight: 500 }}>
                    {formatCurrency(topLoser.currentPrice)}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <StatChip
                      changePct={topLoser.dayChangePct ?? 0}
                      changeAbs={topLoser.dayChangeAbs ?? 0}
                      size="sm"
                    />
                  </div>
                </div>
              </Link>
            )}
          </div>
        </Panel>
      )}

      {/* 2 & 3. Allocation & Risk + Sector Split */}
      <div className="dashboard-grid">
        <Panel
          title="Allocation & risk"
          action={risk ? <RiskMeter level={risk.riskLevel} /> : null}
        >
          <AllocationBar
            holdings={sortedHoldings}
            concentrationWarning={concentrationWarning}
          />

          <div className="risk-warnings-section" style={{ marginTop: 16 }}>
            <h3 className="risk-warnings-header" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--ink)' }}>
              Concentration status
            </h3>
            {risk?.warnings && risk.warnings.length > 0 ? (
              <ul className="risk-warning-list" style={{ listStyle: 'none', padding: 0, marginTop: 8 }}>
                {risk.warnings.map((w, idx) => (
                  <li key={idx} className="risk-warning-item" style={{ display: 'flex', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--loss)' }}>
                    <span className="warning-icon" aria-hidden="true">!</span>
                    <span>{w.message}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="risk-clear-message" style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-2)', marginTop: 4 }}>
                No concentration issues found.
              </p>
            )}
          </div>
        </Panel>

        <Panel title="Sector breakdown">
          {sectorEntries.length === 0 ? (
            <p className="sector-empty" style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-3)' }}>
              No sector allocation yet.
            </p>
          ) : (
            <div className="sector-bars" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sectorEntries.map(([sector, pct]) => (
                <div key={sector} className="sector-bar-row">
                  <div
                    className="sector-bar-header"
                    style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 4 }}
                  >
                    <span className="sector-name">{sector}</span>
                    <span className="sector-pct tabular-nums">{formatPercent(pct)}</span>
                  </div>
                  <div
                    className="sector-track"
                    style={{ height: 6, backgroundColor: 'var(--fill)', borderRadius: 3, overflow: 'hidden' }}
                  >
                    <div
                      className="sector-fill"
                      style={{
                        height: '100%',
                        backgroundColor: 'var(--ink)',
                        width: `${Math.min(Math.max(pct, 0), 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* 4. Holdings Table */}
      <Panel title="Holdings">
        <DataTable
          columns={columns}
          rows={sortedHoldings}
          rowKey="symbol"
          onRowClick={(row) => navigate(`/stock/${encodeURIComponent(row.symbol)}`)}
          emptyState={
            <EmptyState
              message="You don't own any stocks yet."
              action={
                <Button onClick={() => navigate('/market')}>
                  Explore market
                </Button>
              }
            />
          }
        />
      </Panel>
    </div>
  );
}
