import React, { useState, useEffect, useRef, useMemo } from 'react';
import { endpoints } from '../api/endpoints';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { PlusIcon, MinusIcon } from './Icons';

export function OrderPanel({
  symbol,
  currentPrice = 0,
  cashBalance = 0,
  heldQuantity = 0,
  onTradeSuccess,
}) {
  const { addToast } = useToast();
  const [side, setSide] = useState('BUY');
  const [quantity, setQuantity] = useState(1);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [inlineError, setInlineError] = useState('');
  const debounceTimerRef = useRef(null);

  // Quick chips
  const maxBuyQty = currentPrice > 0 ? Math.max(0, Math.floor(cashBalance / currentPrice)) : 0;
  const maxSellQty = heldQuantity;
  const maxQty = side === 'BUY' ? maxBuyQty : maxSellQty;

  // Debounced impact preview
  useEffect(() => {
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0 || !symbol) {
      setPreview(null);
      setInlineError('');
      return;
    }

    // Client-side quick validation check
    if (side === 'BUY' && currentPrice * qty > cashBalance) {
      setInlineError(`Insufficient cash (need ~${formatCurrency(currentPrice * qty)}, have ${formatCurrency(cashBalance)})`);
    } else if (side === 'SELL' && qty > heldQuantity) {
      setInlineError(`Insufficient holdings (you own ${heldQuantity} shares)`);
    } else {
      setInlineError('');
    }

    setLoadingPreview(true);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const previewData = await endpoints.getImpactPreview(symbol, side, qty);
        setPreview(previewData);
      } catch (err) {
        // Ignored or handled gracefully
      } finally {
        setLoadingPreview(false);
      }
    }, 250);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [symbol, side, quantity, currentPrice, cashBalance, heldQuantity]);

  const handleQtyChange = (newVal) => {
    const val = Math.max(0, parseInt(newVal, 10) || 0);
    setQuantity(val);
  };

  const handleQuickAdd = (delta) => {
    setQuantity((prev) => Math.max(1, (parseInt(prev, 10) || 0) + delta));
  };

  const handleSetMax = () => {
    setQuantity(Math.max(1, maxQty));
  };

  const isFormValid = useMemo(() => {
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) return false;
    if (side === 'BUY') {
      const estimatedCost = preview ? preview.totalAmount : currentPrice * qty;
      return estimatedCost <= cashBalance;
    } else {
      return qty <= heldQuantity;
    }
  }, [quantity, side, preview, currentPrice, cashBalance, heldQuantity]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0 || !isFormValid || submitting) return;

    setSubmitting(true);
    try {
      const result =
        side === 'BUY'
          ? await endpoints.buyStock(symbol, qty)
          : await endpoints.sellStock(symbol, qty);

      setReceipt(result);
      addToast(
        `${side === 'BUY' ? 'Bought' : 'Sold'} ${qty} ${symbol} at ${formatCurrency(result.executionPrice || result.price)}`,
        'success'
      );

      if (onTradeSuccess) {
        onTradeSuccess(result);
      }

      // Hide receipt after 3 seconds
      setTimeout(() => {
        setReceipt(null);
      }, 3000);
    } catch (err) {
      addToast(err.message || 'Failed to place order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="order-panel"
      style={{
        backgroundColor: 'var(--surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--line)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Side toggle */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          backgroundColor: 'var(--fill)',
          borderRadius: 'var(--radius-pill)',
          padding: 3,
          border: '1px solid var(--line)',
        }}
      >
        <button
          type="button"
          onClick={() => setSide('BUY')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-pill)',
            fontWeight: side === 'BUY' ? 600 : 400,
            fontSize: 'var(--text-sm)',
            color: side === 'BUY' ? 'var(--ink-inverted)' : 'var(--ink-2)',
            backgroundColor: side === 'BUY' ? 'var(--ink)' : 'transparent',
            boxShadow: side === 'BUY' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            minHeight: 38,
          }}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => setSide('SELL')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-pill)',
            fontWeight: side === 'SELL' ? 600 : 400,
            fontSize: 'var(--text-sm)',
            color: 'var(--ink)',
            backgroundColor: side === 'SELL' ? 'var(--surface)' : 'transparent',
            boxShadow: side === 'SELL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            minHeight: 38,
          }}
        >
          Sell
        </button>
      </div>

      {/* Available cash or holdings indicator */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 'var(--text-xs)',
          color: 'var(--ink-2)',
        }}
      >
        <span>{side === 'BUY' ? 'Available Cash' : 'Held Shares'}</span>
        <span className="tabular-nums" style={{ fontWeight: 500, color: 'var(--ink)' }}>
          {side === 'BUY' ? formatCurrency(cashBalance) : `${heldQuantity} shares`}
        </span>
      </div>

      {/* Quantity input & Stepper */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label
          htmlFor="order-qty-input"
          style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-2)', fontWeight: 500 }}
        >
          Quantity
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => handleQtyChange(quantity - 1)}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink)',
              backgroundColor: 'var(--surface-2)',
              opacity: quantity <= 1 ? 0.4 : 1,
            }}
          >
            <MinusIcon width={16} height={16} />
          </button>

          <input
            id="order-qty-input"
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min="1"
            value={quantity}
            onChange={(e) => handleQtyChange(e.target.value)}
            className="tabular-nums"
            style={{
              flex: 1,
              height: 44,
              textAlign: 'center',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line-strong)',
              backgroundColor: 'var(--surface)',
              color: 'var(--ink)',
              fontSize: '16px',
              fontWeight: 600,
            }}
          />

          <button
            type="button"
            onClick={() => handleQtyChange(quantity + 1)}
            aria-label="Increase quantity"
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink)',
              backgroundColor: 'var(--surface-2)',
            }}
          >
            <PlusIcon width={16} height={16} />
          </button>
        </div>

        {/* Quick chips */}
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          {[1, 5, 10].map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => handleQuickAdd(step)}
              style={{
                flex: 1,
                minHeight: 32,
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--fill)',
                fontSize: 'var(--text-xs)',
                fontWeight: 500,
                color: 'var(--ink)',
                border: '1px solid var(--line)',
              }}
            >
              +{step}
            </button>
          ))}
          <button
            type="button"
            onClick={handleSetMax}
            disabled={maxQty <= 0}
            style={{
              flex: 1.2,
              minHeight: 32,
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--fill)',
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
              color: 'var(--ink)',
              border: '1px solid var(--line)',
              opacity: maxQty <= 0 ? 0.4 : 1,
            }}
          >
            Max ({maxQty})
          </button>
        </div>
      </div>

      {/* Live impact preview section */}
      {preview && (
        <div
          style={{
            backgroundColor: 'var(--surface-2)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
            border: '1px solid var(--line)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            fontSize: 'var(--text-xs)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-2)' }}>
            <span>Estimated fill price</span>
            <span className="tabular-nums" style={{ fontWeight: 500, color: 'var(--ink)' }}>
              {formatCurrency(preview.executionPrice)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-2)' }}>
            <span>Total amount</span>
            <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--ink)' }}>
              {formatCurrency(preview.totalAmount)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-2)' }}>
            <span>{side === 'BUY' ? 'Cash after order' : 'Shares after order'}</span>
            <span className="tabular-nums" style={{ fontWeight: 500, color: 'var(--ink)' }}>
              {side === 'BUY'
                ? formatCurrency(Math.max(0, cashBalance - preview.totalAmount))
                : `${Math.max(0, heldQuantity - quantity)} shares`}
            </span>
          </div>

          <div
            style={{
              marginTop: 4,
              paddingTop: 8,
              borderTop: '1px solid var(--line)',
              color: 'var(--ink-2)',
              fontSize: '11px',
              lineHeight: 1.4,
            }}
          >
            This order moves {symbol} by about{' '}
            <strong style={{ color: side === 'BUY' ? 'var(--gain)' : 'var(--loss)' }}>
              {side === 'BUY' ? '+' : '−'}
              {formatPercentage(preview.impactPct)}
            </strong>
            .
            {preview.impactPct >= 2.0 && (
              <span style={{ display: 'block', color: 'var(--ink-3)', marginTop: 2 }}>
                Large order, price moves the maximum 2%.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Inline error note */}
      {inlineError && (
        <div
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--loss)',
            lineHeight: 1.3,
          }}
        >
          {inlineError}
        </div>
      )}

      {/* Receipt summary (shows for 3s on success) */}
      {receipt && (
        <div
          style={{
            backgroundColor: 'var(--fill)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
            border: '1px solid var(--gain)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            fontSize: 'var(--text-xs)',
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--gain)' }}>Order Filled!</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Fill price:</span>
            <span className="tabular-nums">{formatCurrency(receipt.executionPrice || receipt.price)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total:</span>
            <span className="tabular-nums">{formatCurrency(receipt.totalAmount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>New market price:</span>
            <span className="tabular-nums">{formatCurrency(receipt.priceAfter)}</span>
          </div>
          {receipt.realizedPnl !== null && receipt.realizedPnl !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Realized P&amp;L:</span>
              <span
                className="tabular-nums"
                style={{
                  fontWeight: 600,
                  color: receipt.realizedPnl >= 0 ? 'var(--gain)' : 'var(--loss)',
                }}
              >
                {receipt.realizedPnl >= 0 ? '+' : ''}
                {formatCurrency(receipt.realizedPnl)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Action submit button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isFormValid || submitting}
        style={{
          width: '100%',
          minHeight: 48,
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--text-base)',
          fontWeight: 600,
          cursor: isFormValid && !submitting ? 'pointer' : 'not-allowed',
          opacity: isFormValid && !submitting ? 1 : 0.5,
          backgroundColor: side === 'BUY' ? 'var(--ink)' : 'transparent',
          color: side === 'BUY' ? 'var(--ink-inverted)' : 'var(--ink)',
          border: side === 'BUY' ? 'none' : '1px solid var(--ink)',
          boxShadow: side === 'BUY' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
        }}
      >
        {submitting
          ? 'Placing order…'
          : `${side === 'BUY' ? 'Buy' : 'Sell'} ${quantity || 0} ${symbol}`}
      </button>
    </div>
  );
}
