package com.stockpulse.stock;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

public record StockDto(
        Long id,
        String symbol,
        String companyName,
        String sector,
        BigDecimal currentPrice,
        BigDecimal previousClose,
        BigDecimal dayChangeAbs,
        BigDecimal dayChangePct,
        List<BigDecimal> sparkline
) {
    public static StockDto from(Stock s) {
        return from(s, List.of());
    }

    public static StockDto from(Stock s, List<BigDecimal> sparkline) {
        BigDecimal changeAbs = BigDecimal.ZERO;
        BigDecimal changePct = BigDecimal.ZERO;
        if (s.getPreviousClose() != null && s.getPreviousClose().compareTo(BigDecimal.ZERO) != 0) {
            changeAbs = s.getCurrentPrice().subtract(s.getPreviousClose())
                    .setScale(2, RoundingMode.HALF_UP);
            changePct = s.getCurrentPrice()
                    .subtract(s.getPreviousClose())
                    .divide(s.getPreviousClose(), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
        }
        return new StockDto(
                s.getId(),
                s.getSymbol(),
                s.getCompanyName(),
                s.getSector(),
                s.getCurrentPrice(),
                s.getPreviousClose(),
                changeAbs,
                changePct,
                sparkline != null ? sparkline : List.of()
        );
    }
}
