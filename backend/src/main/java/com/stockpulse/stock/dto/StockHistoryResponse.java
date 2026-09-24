package com.stockpulse.stock.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record StockHistoryResponse(
        String symbol,
        String range,
        List<HistoryPoint> points,
        BigDecimal open,
        BigDecimal close,
        BigDecimal high,
        BigDecimal low,
        BigDecimal changeAbs,
        BigDecimal changePct,
        List<UserTradeMarker> trades
) {
    public record HistoryPoint(Instant t, BigDecimal price) {}
    public record UserTradeMarker(Instant t, String type, int quantity, BigDecimal price) {}
}
