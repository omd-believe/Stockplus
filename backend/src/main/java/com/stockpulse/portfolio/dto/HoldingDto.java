package com.stockpulse.portfolio.dto;

import java.math.BigDecimal;

public record HoldingDto(
        String symbol,
        String companyName,
        String sector,
        int quantity,
        BigDecimal averageBuyPrice,
        BigDecimal currentPrice,
        BigDecimal invested,
        BigDecimal currentValue,
        BigDecimal unrealizedPnl,
        BigDecimal unrealizedPnlPct,
        BigDecimal dayChange,
        BigDecimal allocationPct
) {}
