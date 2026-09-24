import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { endpoints } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { usePolling } from '../hooks/usePolling';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { PriceHeader } from '../components/PriceHeader';
import { OrderPanel } from '../components/OrderPanel';
import { OrderSheet } from '../components/OrderSheet';
import { Skeleton } from '../components/Skeleton';
import { formatCurrency, formatPercentage, formatDate } from '../utils/formatters';

// Lazy-load Recharts PriceChart
const PriceChart = lazy(() => import('../components/charts/PriceChart'));

export default function StockPage() {
  const { symbol } = useParams();
  const { user, refreshUser } = useAuth();
  const isMobile = useMediaQuery('(max-width: 767px)');

  const [stock, setStock] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [selectedRange, setSelectedRange] = useState('1D');
  const [portfolio, setPortfolio] = useState(null);
  const [recentTrades, setRecentTrades] = useState([]);
  const [marketStatus, setMarketStatus] = useState({ driftEnabled: true });
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mobile order sheet state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetSide, setSheetSide] = useState('BUY');

  // Fetch stock and market status
  const fetchStockAndStatus = useCallback(async () => {
    if (!symbol) return;
    try {
      const [stocksData, statusData] = await Promise.all([
        endpoints.getStocks(),
        endpoints.getMarketStatus().catch(() => ({ driftEnabled: true })),
      ]);
      const found = (stocksData || []).find(
        (s) => s.symbol.toUpperCase() === symbol.toUpperCase()
      );
      if (found) {
        setStock(found);
      }
      setMarketStatus(statusData);
    } catch (err) {
      // Ignored for polling resilience
    }
  }, [symbol]);

  // Fetch history for selected range
  const fetchHistory = useCallback(async () => {
    if (!symbol) return;
    try {
      const hist = await endpoints.getStockHistory(symbol, selectedRange);
      setHistoryData(hist);
    } catch (err) {
      // Ignored
    }
  }, [symbol, selectedRange]);

  // Combined poll function: updates price and chart
  const pollData = useCallback(async () => {
    await Promise.all([fetchStockAndStatus(), fetchHistory()]);
  }, [fetchStockAndStatus, fetchHistory]);

  const { isFailing, lastUpdated } = usePolling(pollData, 5000);

  // Fetch initial portfolio & recent trades
  const fetchUserContext = useCallback(async () => {
    if (!symbol) return;
    try {
      const [port, tradesRes] = await Promise.all([
        endpoints.getPortfolio().catch(() => null),
        endpoints.getTransactions(0, 5, symbol).catch(() => ({ content: [] })),
      ]);
      if (port) setPortfolio(port);
      if (tradesRes && tradesRes.content) {
        setRecentTrades(tradesRes.content.slice(0, 5));
      }
    } catch (err) {
      // Handled
    }
  }, [symbol]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchStockAndStatus(), fetchHistory(), fetchUserContext()])
      .then(() => setLoading(false))
      .catch((err) => {
        setError(err.message || 'Failed to load stock data');
        setLoading(false);
      });
  }, [symbol, fetchStockAndStatus, fetchHistory, fetchUserContext]);

  // Refetch history immediately when range changes
  const handleRangeChange = (range) => {
    setSelectedRange(range);
    setHistoryLoading(true);
    endpoints
      .getStockHistory(symbol, range)
      .then((data) => setHistoryData(data))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  };

  const handleTradeSuccess = () => {
    // Immediately refresh stock, history, user wallet, and portfolio
    fetchStockAndStatus();
    fetchHistory();
    fetchUserContext();
    if (refreshUser) refreshUser();
  };

  // Find user holding for this stock
  const currentHolding = portfolio?.holdings?.find(
    (h) => h.symbol.toUpperCase() === symbol.toUpperCase()
  );
  const heldQuantity = currentHolding ? currentHolding.quantity : 0;
  const cashBalance = user?.cashBalance ?? 0;

  if (loading && !stock) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton height={80} />
        <Skeleton height={320} />
        <Skeleton height={140} />
      </div>
    );
  }

  if (error && !stock) {
    return (
      <div
        style={{
          padding: 32,
          textAlign: 'center',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--line)',
        }}
      >
        <p style={{ color: 'var(--loss)', marginBottom: 16 }}>{error}</p>
        <Link
          to="/market"
          style={{
            fontSize: 'var(--text-sm)',
            textDecoration: 'underline',
            color: 'var(--ink)',
          }}
        >
          ← Return to Market
        </Link>
      </div>
    );
  }

  return (
    <div
      className="stock-detail-page"
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.8fr) minmax(320px, 1fr)',
        gap: 28,
        alignItems: 'start',
        paddingBottom: isMobile ? 80 : 0,
      }}
    >
      {/* Left Column: Price Header, Chart, Stats, Position, Trades */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
        {/* Back Link */}
        <Link
          to="/market"
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--ink-2)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            width: 'fit-content',
          }}
        >
          ← All Stocks
        </Link>

        {/* Price Header */}
        <PriceHeader
          symbol={stock?.symbol || symbol}
          companyName={stock?.companyName}
          currentPrice={stock?.currentPrice ?? 0}
          dayChangePct={stock?.dayChangePct ?? 0}
          dayChangeAbs={stock?.dayChangeAbs ?? 0}
          rangeChangePct={historyData?.changePct ?? null}
          rangeChangeAbs={historyData?.changeAbs ?? null}
          selectedRange={selectedRange}
          lastUpdatedTime={lastUpdated}
          driftEnabled={marketStatus.driftEnabled}
          isReconnecting={isFailing}
        />

        {/* Interactive Price Chart with Suspense */}
        <div
          style={{
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--line)',
            padding: '20px',
          }}
        >
          <Suspense fallback={<Skeleton height={280} />}>
            <PriceChart
              symbol={stock?.symbol || symbol}
              historyData={historyData}
              selectedRange={selectedRange}
              onRangeChange={handleRangeChange}
              loading={historyLoading}
              onRetry={fetchHistory}
            />
          </Suspense>
        </div>

        {/* Key Stats Row */}
        <div
          style={{
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--line)',
            padding: '16px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-3)' }}>Open</div>
            <div className="tabular-nums" style={{ fontWeight: 500, marginTop: 2 }}>
              {formatCurrency(historyData?.open ?? stock?.previousClose ?? 0)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-3)' }}>High</div>
            <div className="tabular-nums" style={{ fontWeight: 500, marginTop: 2 }}>
              {formatCurrency(historyData?.high ?? stock?.currentPrice ?? 0)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-3)' }}>Low</div>
            <div className="tabular-nums" style={{ fontWeight: 500, marginTop: 2 }}>
              {formatCurrency(historyData?.low ?? stock?.currentPrice ?? 0)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-3)' }}>Day Change</div>
            <div
              className="tabular-nums"
              style={{
                fontWeight: 500,
                marginTop: 2,
                color: (stock?.dayChangePct ?? 0) >= 0 ? 'var(--gain)' : 'var(--loss)',
              }}
            >
              {(stock?.dayChangePct ?? 0) >= 0 ? '+' : ''}
              {formatPercentage(stock?.dayChangePct ?? 0)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-3)' }}>Sector</div>
            <div style={{ fontWeight: 500, marginTop: 2, color: 'var(--ink)' }}>
              {stock?.sector || '—'}
            </div>
          </div>
        </div>

        {/* Your Position Card */}
        <div
          style={{
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--line)',
            padding: '20px',
          }}
        >
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, margin: '0 0 16px 0' }}>
            Your Position
          </h2>

          {heldQuantity > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-3)' }}>Shares Owned</div>
                <div className="tabular-nums" style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>
                  {heldQuantity}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-3)' }}>Avg Buy Price</div>
                <div className="tabular-nums" style={{ fontSize: 'var(--text-base)', fontWeight: 500, marginTop: 2 }}>
                  {formatCurrency(currentHolding?.averageBuyPrice ?? 0)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-3)' }}>Current Value</div>
                <div className="tabular-nums" style={{ fontSize: 'var(--text-base)', fontWeight: 500, marginTop: 2 }}>
                  {formatCurrency(currentHolding?.currentValue ?? (heldQuantity * (stock?.currentPrice || 0)))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-3)' }}>Unrealized P&amp;L</div>
                <div
                  className="tabular-nums"
                  style={{
                    fontSize: 'var(--text-base)',
                    fontWeight: 600,
                    marginTop: 2,
                    color: (currentHolding?.unrealizedPnl ?? 0) >= 0 ? 'var(--gain)' : 'var(--loss)',
                  }}
                >
                  {(currentHolding?.unrealizedPnl ?? 0) >= 0 ? '+' : ''}
                  {formatCurrency(currentHolding?.unrealizedPnl ?? 0)} (
                  {formatPercentage(currentHolding?.unrealizedPnlPct ?? 0)})
                </div>
              </div>

              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-3)' }}>Portfolio Allocation</div>
                <div className="tabular-nums" style={{ fontSize: 'var(--text-base)', fontWeight: 500, marginTop: 2 }}>
                  {formatPercentage(currentHolding?.allocationPct ?? 0)}
                </div>
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--ink-2)' }}>
              You don't hold this stock.
            </p>
          )}
        </div>

        {/* Recent Trades on this stock */}
        <div
          style={{
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--line)',
            padding: '20px',
          }}
        >
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, margin: '0 0 16px 0' }}>
            Recent Trades on {symbol}
          </h2>

          {recentTrades.length === 0 ? (
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--ink-2)' }}>
              No recent trades on {symbol}.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentTrades.map((tr) => (
                <div
                  key={tr.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--surface-2)',
                    fontSize: 'var(--text-xs)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-pill)',
                        fontWeight: 600,
                        backgroundColor: tr.type === 'BUY' ? 'var(--ink)' : 'var(--fill)',
                        color: tr.type === 'BUY' ? 'var(--ink-inverted)' : 'var(--ink)',
                        border: tr.type === 'BUY' ? 'none' : '1px solid var(--line-strong)',
                      }}
                    >
                      {tr.type}
                    </span>
                    <span style={{ fontWeight: 500, color: 'var(--ink)' }}>
                      {tr.quantity} @ {formatCurrency(tr.executionPrice || tr.price)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {tr.impactPct ? (
                      <span style={{ color: 'var(--ink-2)' }}>
                        Impact: {formatPercentage(tr.impactPct)}
                      </span>
                    ) : null}
                    <span style={{ color: 'var(--ink-3)' }}>{formatDate(tr.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column (Desktop): Sticky Order Panel */}
      {!isMobile && (
        <div style={{ position: 'sticky', top: 24 }}>
          <OrderPanel
            symbol={stock?.symbol || symbol}
            currentPrice={stock?.currentPrice ?? 0}
            cashBalance={cashBalance}
            heldQuantity={heldQuantity}
            onTradeSuccess={handleTradeSuccess}
          />
        </div>
      )}

      {/* Mobile Sticky Bottom Action Bar (< 768px) */}
      {isMobile && (
        <div
          className="mobile-sticky-action-bar"
          style={{
            position: 'fixed',
            bottom: 'calc(56px + env(safe-area-inset-bottom))',
            left: 0,
            right: 0,
            backgroundColor: 'var(--surface)',
            borderTop: '1px solid var(--line)',
            padding: '10px 16px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            zIndex: 90,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setSheetSide('BUY');
              setIsSheetOpen(true);
            }}
            style={{
              height: 44,
              backgroundColor: 'var(--ink)',
              color: 'var(--ink-inverted)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
            }}
          >
            Buy {symbol}
          </button>

          <button
            type="button"
            onClick={() => {
              setSheetSide('SELL');
              setIsSheetOpen(true);
            }}
            style={{
              height: 44,
              backgroundColor: 'transparent',
              color: 'var(--ink)',
              border: '1px solid var(--ink)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
            }}
          >
            Sell {symbol}
          </button>
        </div>
      )}

      {/* Mobile Order Sheet */}
      {isMobile && (
        <OrderSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          symbol={stock?.symbol || symbol}
          currentPrice={stock?.currentPrice ?? 0}
          cashBalance={cashBalance}
          heldQuantity={heldQuantity}
          initialSide={sheetSide}
          onTradeSuccess={handleTradeSuccess}
        />
      )}
    </div>
  );
}
