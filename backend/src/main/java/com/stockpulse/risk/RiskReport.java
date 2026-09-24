package com.stockpulse.risk;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Risk analysis result.
 *
 * diversificationScore = 100 - topHoldingPct  (simple, documented formula)
 */
public record RiskReport(
        String largestHoldingSymbol,
        BigDecimal largestHoldingPct,
        Map<String, BigDecimal> sectorAllocation,
        List<String> warnings,
        RiskLevel riskLevel,
        BigDecimal diversificationScore
) {
    public enum RiskLevel { LOW, MEDIUM, HIGH }
}
