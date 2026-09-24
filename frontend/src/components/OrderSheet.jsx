import React, { useEffect, useRef } from 'react';
import { OrderPanel } from './OrderPanel';
import { CloseIcon } from './Icons';

export function OrderSheet({
  isOpen,
  onClose,
  symbol,
  currentPrice,
  cashBalance,
  heldQuantity,
  initialSide = 'BUY',
  onTradeSuccess,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  const handleBackdropClick = (e) => {
    // If clicked directly on the dialog backdrop (outside content)
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  const handleSuccess = (res) => {
    if (onTradeSuccess) onTradeSuccess(res);
    // After 2.5s close sheet
    setTimeout(() => {
      onClose();
    }, 2500);
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      onClick={handleBackdropClick}
      className="mobile-order-dialog"
      style={{
        margin: 'auto 0 0 0',
        width: '100%',
        maxWidth: '100%',
        border: 'none',
        borderRadius: '16px 16px 0 0',
        backgroundColor: 'var(--surface)',
        color: 'var(--ink)',
        padding: '0',
        boxShadow: 'var(--shadow)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90dvh',
          overflowY: 'auto',
          padding: '16px 20px 28px',
          paddingBottom: 'calc(28px + env(safe-area-inset-bottom))',
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            alignSelf: 'center',
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: 'var(--line-strong)',
            marginBottom: 12,
          }}
        />

        {/* Dialog Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, margin: 0 }}>
            Order {symbol}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close order sheet"
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-2)',
            }}
          >
            <CloseIcon width={18} height={18} />
          </button>
        </div>

        {/* Embedded OrderPanel */}
        <OrderPanel
          symbol={symbol}
          currentPrice={currentPrice}
          cashBalance={cashBalance}
          heldQuantity={heldQuantity}
          initialSide={initialSide}
          onTradeSuccess={handleSuccess}
        />
      </div>
    </dialog>
  );
}
