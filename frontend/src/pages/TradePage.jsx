import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { endpoints } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAsync } from '../hooks/useAsync';
import { formatCurrency, formatSignedMoney } from '../utils/format';
import { Panel } from '../components/Panel';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Pnl } from '../components/Pnl';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';

export function TradePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [selectedSymbol, setSelectedSymbol] = useState(searchParams.get('symbol') || '');
  const [quantity, setQuantity] = useState(1);
  const [submittingAction, setSubmittingAction] = useState(null); // 'buy' | 'sell' | null

  // Fetch stocks and current portfolio holdings
  const fetchData = async () => {
    const [stocks, portfolio] = await Promise.all([
      endpoints.getStocks(),
      endpoints.getPortfolio(),
    ]);
    return { stocks, portfolio };
  };

  const { data, loading, error, reload } = useAsync(fetchData, []);

  // Update selected symbol if param changes or initial load
  useEffect(() => {
    if (data?.stocks?.length) {
      const urlSymbol = searchParams.get('symbol');
      if (urlSymbol && data.stocks.some((s) => s.symbol.toUpperCase() === urlSymbol.toUpperCase())) {
        setSelectedSymbol(urlSymbol.toUpperCase());
      } else if (!selectedSymbol) {
        setSelectedSymbol(data.stocks[0].symbol);
      }
    }
  }, [data, searchParams, selectedSymbol]);

  if (loading) {
    return (
      <div className="trade-layout">
        <Panel title="Order">
          <Skeleton count={4} height="40px" />
        </Panel>
        <Panel title="Current position">
          <Skeleton count={3} height="36px" />
        </Panel>
      </div>
    );
  }

  if (error) {
    return (
      <Panel>
        <EmptyState
          message={error.message || 'Unable to load trade data.'}
          action={<Button onClick={reload}>Try again</Button>}
        />
      </Panel>
    );
  }

  const { stocks, portfolio } = data;
  const currentStock = stocks.find((s) => s.symbol === selectedSymbol) || stocks[0];
  const userHolding = (portfolio.holdings || []).find((h) => h.symbol === currentStock?.symbol);

  const price = currentStock?.currentPrice || 0;
  const totalCost = price * quantity;
  const cashAvailable = user?.cashBalance ?? portfolio.cashBalance ?? 0;
  const sharesOwned = userHolding?.quantity || 0;

  // Validation reasons
  let buyReason = null;
  if (totalCost > cashAvailable) {
    buyReason = `Not enough cash. This order costs ${formatCurrency(totalCost)} and you have ${formatCurrency(cashAvailable)}.`;
  } else if (quantity < 1) {
    buyReason = 'Quantity must be at least 1.';
  }

  let sellReason = null;
  if (sharesOwned === 0) {
    sellReason = "You don't own any shares of this stock.";
  } else if (quantity > sharesOwned) {
    sellReason = `You own ${sharesOwned} ${sharesOwned === 1 ? 'share' : 'shares'} of ${currentStock.symbol}, so you can't sell ${quantity}.`;
  } else if (quantity < 1) {
    sellReason = 'Quantity must be at least 1.';
  }

  const isPlacingOrder = submittingAction !== null;
  const canBuy = !isPlacingOrder && !buyReason && quantity >= 1;
  const canSell = !isPlacingOrder && !sellReason && quantity >= 1;

  const handleStockChange = (symbol) => {
    setSelectedSymbol(symbol);
    setSearchParams({ symbol });
  };

  const handleExecute = async (type) => {
    setSubmittingAction(type);
    try {
      if (type === 'buy') {
        const receipt = await endpoints.buyStock(currentStock.symbol, quantity);
        showToast(`Bought ${quantity} ${currentStock.symbol} at ${formatCurrency(receipt.price)}`);
      } else {
        const receipt = await endpoints.sellStock(currentStock.symbol, quantity);
        const pnlMsg = receipt.realizedPnl !== null && receipt.realizedPnl !== undefined
          ? ` Realized ${formatSignedMoney(receipt.realizedPnl)}.`
          : '';
        showToast(`Sold ${quantity} ${currentStock.symbol} at ${formatCurrency(receipt.price)}.${pnlMsg}`);
      }
      await Promise.all([reload(), refreshUser()]);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <div className="trade-layout">
      {/* Column 1: Order Panel */}
      <Panel title="Place an order">
        <Field id="trade-stock" label="Stock">
          <select
            value={currentStock?.symbol || ''}
            onChange={(e) => handleStockChange(e.target.value)}
            disabled={isPlacingOrder}
          >
            {stocks.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.symbol} · {formatCurrency(s.currentPrice)} ({s.companyName})
              </option>
            ))}
          </select>
        </Field>

        {currentStock && (
          <div className="stock-quick-info">
            <span className="stock-info-price tabular-nums">{formatCurrency(currentStock.currentPrice)}</span>
            <span className="stock-info-change">
              <Pnl value={currentStock.dayChangePct} percent={currentStock.dayChangePct} showArrow={true} />
              <span className="stock-info-day"> today</span>
            </span>
          </div>
        )}

        <Field id="trade-quantity" label="Quantity" hint="Whole shares only">
          <div className="stepper-group">
            <button
              type="button"
              className="stepper-btn"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={isPlacingOrder || quantity <= 1}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              disabled={isPlacingOrder}
              className="stepper-input tabular-nums"
            />
            <button
              type="button"
              className="stepper-btn"
              onClick={() => setQuantity((q) => q + 1)}
              disabled={isPlacingOrder}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </Field>

        {/* Live summary lines */}
        <div className="order-summary-box">
          <div className="order-summary-line">
            <span className="summary-line-label">Execution price</span>
            <span className="summary-line-val tabular-nums">{formatCurrency(price)}</span>
          </div>
          <div className="order-summary-line">
            <span className="summary-line-label">Estimated total</span>
            <span className="summary-line-val summary-line-bold tabular-nums">
              {formatCurrency(totalCost)}
            </span>
          </div>
          <div className="order-summary-line order-summary-sub">
            <span className="summary-line-label">Cash available</span>
            <span className="summary-line-val tabular-nums">{formatCurrency(cashAvailable)}</span>
          </div>
          <div className="order-summary-line order-summary-sub">
            <span className="summary-line-label">Shares you own</span>
            <span className="summary-line-val tabular-nums">{sharesOwned}</span>
          </div>
        </div>

        {/* Validation hint / error if disabled */}
        {buyReason && <p className="trade-reason-text" role="status">{buyReason}</p>}
        {sellReason && !buyReason && <p className="trade-reason-text" role="status">{sellReason}</p>}

        <div className="trade-actions">
          <Button
            variant="primary"
            disabled={!canBuy}
            loading={submittingAction === 'buy'}
            onClick={() => handleExecute('buy')}
            className="trade-btn-buy"
          >
            {submittingAction === 'buy' ? 'Placing order…' : 'Buy'}
          </Button>

          <Button
            variant="secondary"
            disabled={!canSell}
            loading={submittingAction === 'sell'}
            onClick={() => handleExecute('sell')}
            className="trade-btn-sell"
          >
            {submittingAction === 'sell' ? 'Placing order…' : 'Sell'}
          </Button>
        </div>
      </Panel>

      {/* Column 2: Position Panel */}
      <Panel title="Your position">
        {userHolding ? (
          <div className="position-details">
            <div className="position-item">
              <span className="position-label">Shares held</span>
              <span className="position-val tabular-nums">{userHolding.quantity}</span>
            </div>
            <div className="position-item">
              <span className="position-label">Average buy price</span>
              <span className="position-val tabular-nums">{formatCurrency(userHolding.averageBuyPrice)}</span>
            </div>
            <div className="position-item">
              <span className="position-label">Total invested</span>
              <span className="position-val tabular-nums">{formatCurrency(userHolding.invested)}</span>
            </div>
            <div className="position-item">
              <span className="position-label">Current value</span>
              <span className="position-val tabular-nums">{formatCurrency(userHolding.currentValue)}</span>
            </div>
            <div className="position-item">
              <span className="position-label">Unrealized P&L</span>
              <span className="position-val">
                <Pnl
                  value={userHolding.unrealizedPnl}
                  percent={userHolding.unrealizedPnlPct}
                  showArrow={true}
                />
              </span>
            </div>
            <div className="position-item">
              <span className="position-label">Portfolio weight</span>
              <span className="position-val tabular-nums">{formatCurrency(userHolding.allocationPct, { whole: true })}%</span>
            </div>
          </div>
        ) : (
          <div className="position-empty">
            <p className="position-empty-text">You don't hold this stock.</p>
          </div>
        )}
      </Panel>
    </div>
  );
}
