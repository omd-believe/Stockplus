package com.stockpulse.transaction;

import java.math.BigDecimal;
import java.time.Instant;

public record TransactionDto(
        Long id,
        String symbol,
        String companyName,
        String type,
        int quantity,
        BigDecimal price,
        BigDecimal totalAmount,
        BigDecimal realizedPnl,
        BigDecimal priceBefore,
        BigDecimal priceAfter,
        BigDecimal impactPct,
        Instant createdAt
) {
    public static TransactionDto from(Transaction t) {
        return new TransactionDto(
                t.getId(),
                t.getStock().getSymbol(),
                t.getStock().getCompanyName(),
                t.getType().name(),
                t.getQuantity(),
                t.getPrice(),
                t.getTotalAmount(),
                t.getRealizedPnl(),
                t.getPriceBefore(),
                t.getPriceAfter(),
                t.getImpactPct(),
                t.getCreatedAt()
        );
    }
}
