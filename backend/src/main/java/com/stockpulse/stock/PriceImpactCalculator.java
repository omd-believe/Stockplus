package com.stockpulse.stock;

import com.stockpulse.config.AppProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Pure calculator for trade market impact and midpoint slippage execution.
 *
 * tradeValue   = P × qty
 * impactPct    = min(max-impact-pct, tradeValue / depth-inr × 100)  (0 if impact-enabled is false)
 * BUY : executionPrice = P × (1 + impactPct/200), newPrice = P × (1 + impactPct/100)
 * SELL: executionPrice = P × (1 − impactPct/200), newPrice = P × (1 − impactPct/100)
 *
 * Fill price is the midpoint between old and new price, which guarantees round-trip anti-arbitrage.
 */
@Component
public class PriceImpactCalculator {

    private final boolean impactEnabled;
    private final BigDecimal depthInr;
    private final BigDecimal maxImpactPct;
    private final BigDecimal minPrice;

    public record Impact(
            BigDecimal impactPct,
            BigDecimal executionPrice,
            BigDecimal newPrice,
            BigDecimal totalAmount
    ) {}

    @org.springframework.beans.factory.annotation.Autowired
    public PriceImpactCalculator(AppProperties props) {
        if (props != null && props.market() != null) {
            AppProperties.Market market = props.market();
            this.impactEnabled = market.impactEnabled();
            this.depthInr = market.depthInr() != null ? market.depthInr() : new BigDecimal("10000000");
            this.maxImpactPct = market.maxImpactPct() != null ? market.maxImpactPct() : new BigDecimal("2.0");
            this.minPrice = market.minPrice() != null ? market.minPrice() : new BigDecimal("1.00");
        } else {
            this.impactEnabled = true;
            this.depthInr = new BigDecimal("10000000");
            this.maxImpactPct = new BigDecimal("2.0");
            this.minPrice = new BigDecimal("1.00");
        }
    }

    /**
     * Pure constructor for direct unit testing without Spring context.
     */
    public PriceImpactCalculator(boolean impactEnabled, BigDecimal depthInr, BigDecimal maxImpactPct, BigDecimal minPrice) {
        this.impactEnabled = impactEnabled;
        this.depthInr = depthInr;
        this.maxImpactPct = maxImpactPct;
        this.minPrice = minPrice;
    }

    public Impact calculate(Side side, BigDecimal currentPrice, int quantity) {
        if (currentPrice == null || currentPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Current price must be positive");
        }
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be positive");
        }

        BigDecimal tradeValue = currentPrice.multiply(BigDecimal.valueOf(quantity));

        BigDecimal impactPct = BigDecimal.ZERO;
        if (impactEnabled && depthInr.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal rawPct = tradeValue
                    .divide(depthInr, 10, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            impactPct = rawPct.min(maxImpactPct);
        }

        BigDecimal factorExecution;
        BigDecimal factorNew;

        if (side == Side.BUY) {
            factorExecution = BigDecimal.ONE.add(
                    impactPct.divide(BigDecimal.valueOf(200), 10, RoundingMode.HALF_UP));
            factorNew = BigDecimal.ONE.add(
                    impactPct.divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP));
        } else {
            factorExecution = BigDecimal.ONE.subtract(
                    impactPct.divide(BigDecimal.valueOf(200), 10, RoundingMode.HALF_UP));
            factorNew = BigDecimal.ONE.subtract(
                    impactPct.divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP));
        }

        BigDecimal executionPrice = currentPrice.multiply(factorExecution)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal newPrice = currentPrice.multiply(factorNew)
                .setScale(2, RoundingMode.HALF_UP);

        // Enforce min-price floor
        if (newPrice.compareTo(minPrice) < 0) {
            newPrice = minPrice;
        }
        if (executionPrice.compareTo(minPrice) < 0) {
            executionPrice = minPrice;
        }

        BigDecimal totalAmount = executionPrice.multiply(BigDecimal.valueOf(quantity))
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal roundedImpactPct = impactPct.setScale(4, RoundingMode.HALF_UP);

        return new Impact(roundedImpactPct, executionPrice, newPrice, totalAmount);
    }
}
