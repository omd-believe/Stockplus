package com.stockpulse.portfolio.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Trade execution receipt.
 * Contains execution fill price, trade value, market impact attribution, and updated balances.
 */
public record TradeReceipt(
        Long transactionId,
        String type,
        String symbol,
        int quantity,
        BigDecimal executionPrice,
        BigDecimal totalAmount,
        BigDecimal priceBefore,
        BigDecimal priceAfter,
        BigDecimal impactPct,
        BigDecimal realizedPnl,        // null for BUY
        BigDecimal cashBalance,
        BigDecimal newAverageBuyPrice,  // null after full sell-out
        int newQuantity,               // 0 if holding deleted
        Instant timestamp
) {
    // Expose newCashBalance in JSON and Java for backwards compatibility
    @JsonProperty("newCashBalance")
    public BigDecimal getNewCashBalance() {
        return cashBalance;
    }

    public BigDecimal newCashBalance() {
        return cashBalance;
    }
}
