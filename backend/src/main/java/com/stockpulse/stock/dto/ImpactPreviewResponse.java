package com.stockpulse.stock.dto;

import java.math.BigDecimal;

public record ImpactPreviewResponse(
        BigDecimal executionPrice,
        BigDecimal estimatedPriceAfter,
        BigDecimal impactPct,
        BigDecimal totalAmount
) {}
