package com.stockpulse.stock;

import java.math.BigDecimal;
import java.time.Instant;

public record PriceHistoryDto(
        BigDecimal price,
        Instant recordedAt
) {
    public static PriceHistoryDto from(PriceHistory ph) {
        return new PriceHistoryDto(ph.getPrice(), ph.getRecordedAt());
    }
}
