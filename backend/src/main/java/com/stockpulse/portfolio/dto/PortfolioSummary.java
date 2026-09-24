package com.stockpulse.portfolio.dto;

import java.math.BigDecimal;
import java.util.List;

public record PortfolioSummary(
        BigDecimal cashBalance,
        BigDecimal totalInvested,
        BigDecimal holdingsValue,
        BigDecimal totalUnrealizedPnl,
        BigDecimal totalUnrealizedPnlPct,
        BigDecimal totalRealizedPnl,
        BigDecimal netWorth,
        BigDecimal dayChange,
        List<HoldingDto> holdings
) {}
