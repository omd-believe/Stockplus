import React, { useState, useEffect, useCallback } from 'react';
import { endpoints } from '../api/endpoints';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/format';
import { Panel } from '../components/Panel';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Pnl } from '../components/Pnl';
import { DataTable } from '../components/DataTable';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';

export default function AdminPage() {
  const { addToast } = useToast();

  const [stocks, setStocks] = useState([]);
  const [marketStatus, setMarketStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [ticking, setTicking] = useState(false);
  const [tickResults, setTickResults] = useState(null);
  const [togglingDrift, setTogglingDrift] = useState(false);

  const [targetSymbol, setTargetSymbol] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [settingPrice, setSettingPrice] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [stocksData, statusData] = await Promise.all([
        endpoints.getStocks(),
        endpoints.getMarketStatus().catch(() => null),
      ]);
      setStocks(stocksData || []);
      setMarketStatus(statusData);
      if (stocksData?.length && !targetSymbol) {
        setTargetSymbol(stocksData[0].symbol);
      }
      setError(null);
    } catch (err) {
      setError(err.message || 'Unable to load admin panel data');
    } finally {
      setLoading(false);
    }
  }, [targetSymbol]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleDrift = async () => {
    if (!marketStatus || togglingDrift) return;
    const nextState = !marketStatus.driftEnabled;
    setTogglingDrift(true);
    try {
      const updated = await endpoints.toggleDrift(nextState);
      setMarketStatus(updated);
      addToast(
        `Market drift ${nextState ? 'resumed' : 'paused'}`,
        'success'
      );
    } catch (err) {
      addToast(err.message || 'Failed to toggle market drift', 'error');
    } finally {
      setTogglingDrift(false);
    }
  };

  const handleSimulateTick = async () => {
    setTicking(true);
    try {
      const updated = await endpoints.simulateTick();
      addToast('Simulated manual market tick', 'success');
      setTickResults(updated);
      loadData();
    } catch (err) {
      addToast(err.message || 'Simulation failed', 'error');
    } finally {
      setTicking(false);
    }
  };

  const handleSetPrice = async (e) => {
    e.preventDefault();
    if (!targetSymbol || !customPrice || isNaN(customPrice) || Number(customPrice) <= 0) {
      addToast('Please enter a valid price greater than 0', 'error');
      return;
    }

    setSettingPrice(true);
    try {
      await endpoints.setStockPrice(targetSymbol, Number(customPrice));
      addToast(`Updated price for ${targetSymbol} to ₹${Number(customPrice).toFixed(2)}`, 'success');
      setCustomPrice('');
      loadData();
    } catch (err) {
      addToast(err.message || 'Failed to set stock price', 'error');
    } finally {
      setSettingPrice(false);
    }
  };

  if (loading && !stocks.length) {
    return (
      <div className="admin-layout" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <Panel title="Market engine controls">
          <Skeleton count={3} height="40px" />
        </Panel>
      </div>
    );
  }

  if (error && !stocks.length) {
    return (
      <Panel title="Admin simulation">
        <EmptyState
          message={error}
          action={<Button onClick={loadData}>Try again</Button>}
        />
      </Panel>
    );
  }

  const tickColumns = [
    {
      key: 'symbol',
      header: 'Stock',
      render: (_, row) => (
        <div>
          <span className="stock-symbol-bold">{row.symbol}</span>
          <span className="stock-cell-sub"> · {row.companyName}</span>
        </div>
      ),
    },
    {
      key: 'previousClose',
      header: 'Old price',
      align: 'right',
      render: (v) => <span className="tabular-nums">{formatCurrency(v)}</span>,
    },
    {
      key: 'currentPrice',
      header: 'New price',
      align: 'right',
      render: (v) => <span className="tabular-nums">{formatCurrency(v)}</span>,
    },
    {
      key: 'dayChangePct',
      header: 'Change',
      align: 'right',
      render: (v) => <Pnl value={v} percent={v} showArrow={true} />,
    },
  ];

  return (
    <div className="admin-layout" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Market Engine & Drift Control */}
      <Panel title="Market engine controls">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px',
              backgroundColor: 'var(--surface-2)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line)',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--ink)' }}>
                Autonomous Market Drift
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-2)', marginTop: 4 }}>
                {marketStatus?.driftEnabled
                  ? 'Drift is active: prices take random Gaussian steps with mean-reversion every 10s.'
                  : 'Drift is paused: prices move only on user trades or admin interventions.'}
              </div>
            </div>

            <Button
              variant={marketStatus?.driftEnabled ? 'secondary' : 'primary'}
              onClick={handleToggleDrift}
              loading={togglingDrift}
            >
              {marketStatus?.driftEnabled ? 'Pause market drift' : 'Resume market drift'}
            </Button>
          </div>

          {/* Engine Parameters in Plain Words */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line)',
              backgroundColor: 'var(--fill)',
              fontSize: 'var(--text-xs)',
            }}
          >
            <div>
              <span style={{ color: 'var(--ink-3)' }}>Virtual Depth:</span>
              <div style={{ fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>₹1,00,00,000 (₹1 Cr)</div>
            </div>
            <div>
              <span style={{ color: 'var(--ink-3)' }}>Max Trade Impact:</span>
              <div style={{ fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>2.0% per trade</div>
            </div>
            <div>
              <span style={{ color: 'var(--ink-3)' }}>Fill Price Model:</span>
              <div style={{ fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>Midpoint execution (zero-exploit)</div>
            </div>
            <div>
              <span style={{ color: 'var(--ink-3)' }}>Midnight Rollover:</span>
              <div style={{ fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>00:00 IST (Asia/Kolkata)</div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Manual Market Move Simulation */}
      <Panel title="Simulate a manual market move">
        <p className="admin-help-text" style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-2)', marginBottom: 16 }}>
          Trigger a discrete random step across all stocks to test portfolio sensitivity.
        </p>

        <div className="admin-tick-action">
          <Button
            variant="primary"
            loading={ticking}
            onClick={handleSimulateTick}
          >
            {ticking ? 'Updating prices…' : 'Simulate manual tick (±2%)'}
          </Button>
        </div>

        {tickResults && (
          <div className="admin-results-table" style={{ marginTop: 20 }}>
            <h3 className="admin-subheading" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 12 }}>
              Latest price shifts
            </h3>
            <DataTable
              columns={tickColumns}
              rows={tickResults}
              rowKey="symbol"
            />
          </div>
        )}
      </Panel>

      {/* Set Specific Price */}
      <Panel title="Set a stock price">
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-2)', marginBottom: 16 }}>
          Directly set a stock's current price. This inserts an ADMIN price history record and does not alter previous close.
        </p>

        <form onSubmit={handleSetPrice} className="admin-set-price-form">
          <div className="admin-form-row" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Field id="admin-stock-select" label="Stock">
                <select
                  value={targetSymbol}
                  onChange={(e) => setTargetSymbol(e.target.value)}
                  disabled={settingPrice}
                  style={{
                    width: '100%',
                    height: 44,
                    padding: '0 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--line-strong)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--ink)',
                  }}
                >
                  {(stocks || []).map((s) => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.symbol} — {s.companyName} ({formatCurrency(s.currentPrice)})
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <Field id="admin-custom-price" label="New price (₹)">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 3400.00"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  disabled={settingPrice}
                  style={{
                    width: '100%',
                    height: 44,
                    padding: '0 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--line-strong)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--ink)',
                  }}
                />
              </Field>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <Button
              type="submit"
              variant="primary"
              loading={settingPrice}
            >
              {settingPrice ? 'Setting price…' : 'Set price'}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
