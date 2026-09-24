package com.stockpulse.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "stockpulse")
public record AppProperties(
        Jwt jwt,
        Admin admin,
        Risk risk,
        Market market
) {
    public record Jwt(String secret, int expiryMinutes) {}
    public record Admin(String email, String password) {}
    public record Risk(
            double singleStockLimitPct,
            double sectorLimitPct,
            double mediumRiskTopHoldingPct,
            double highRiskTopHoldingPct
    ) {}
    public record Market(
            boolean impactEnabled,
            java.math.BigDecimal depthInr,
            java.math.BigDecimal maxImpactPct,
            java.math.BigDecimal minPrice,
            Drift drift
    ) {}
    public record Drift(
            boolean enabled,
            int intervalSeconds,
            java.math.BigDecimal volatilityPct,
            java.math.BigDecimal meanReversion
    ) {}
}
