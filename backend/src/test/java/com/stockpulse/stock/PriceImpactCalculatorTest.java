package com.stockpulse.stock;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class PriceImpactCalculatorTest {

    private final PriceImpactCalculator calculator = new PriceImpactCalculator(
            true,
            new BigDecimal("10000000"), // 1 crore
            new BigDecimal("2.0"),       // 2% cap
            new BigDecimal("1.00")       // 1.00 min price
    );

    @Test
    @DisplayName("BUY 10 TCS at 3400 matches acceptance specification")
    void testAcceptanceWalkthroughStep2() {
        PriceImpactCalculator.Impact impact = calculator.calculate(Side.BUY, new BigDecimal("3400.00"), 10);

        assertThat(impact.impactPct()).isEqualByComparingTo("0.3400");
        assertThat(impact.executionPrice()).isEqualByComparingTo("3405.78");
        assertThat(impact.newPrice()).isEqualByComparingTo("3411.56");
        assertThat(impact.totalAmount()).isEqualByComparingTo("34057.80");
    }

    @Test
    @DisplayName("BUY 5 TCS at 3411.56 matches acceptance specification")
    void testAcceptanceWalkthroughStep3() {
        PriceImpactCalculator.Impact impact = calculator.calculate(Side.BUY, new BigDecimal("3411.56"), 5);

        assertThat(impact.impactPct()).isEqualByComparingTo("0.1706");
        assertThat(impact.executionPrice()).isEqualByComparingTo("3414.47");
        assertThat(impact.newPrice()).isEqualByComparingTo("3417.38");
        assertThat(impact.totalAmount()).isEqualByComparingTo("17072.35");
    }

    @Test
    @DisplayName("SELL 4 TCS at 3417.38 matches acceptance specification")
    void testAcceptanceWalkthroughStep4() {
        PriceImpactCalculator.Impact impact = calculator.calculate(Side.SELL, new BigDecimal("3417.38"), 4);

        assertThat(impact.impactPct()).isEqualByComparingTo("0.1367");
        assertThat(impact.executionPrice()).isEqualByComparingTo("3415.04");
        assertThat(impact.newPrice()).isEqualByComparingTo("3412.71");
        assertThat(impact.totalAmount()).isEqualByComparingTo("13660.16");
    }

    @Test
    @DisplayName("BUY 100 TCS caps impact at 2.00%")
    void testAcceptanceWalkthroughStep6Cap() {
        PriceImpactCalculator.Impact impact = calculator.calculate(Side.BUY, new BigDecimal("3412.71"), 100);

        // Trade value = 341,271 -> raw impact = 3.41271% -> capped at 2.0%
        assertThat(impact.impactPct()).isEqualByComparingTo("2.0000");
        // Execution price = 3412.71 * (1 + 2.0/200) = 3412.71 * 1.01 = 3446.8371 -> 3446.84
        assertThat(impact.executionPrice()).isEqualByComparingTo("3446.84");
        // New price = 3412.71 * (1 + 2.0/100) = 3412.71 * 1.02 = 3480.9642 -> 3480.96
        assertThat(impact.newPrice()).isEqualByComparingTo("3480.96");
    }

    @Test
    @DisplayName("Buy-then-sell round trip of same quantity never produces a profit (anti-arbitrage proof)")
    void testBuyThenSellNeverProfits() {
        BigDecimal initialPrice = new BigDecimal("1000.00");
        int quantity = 50;

        // Step 1: User Buys 50 shares
        PriceImpactCalculator.Impact buyImpact = calculator.calculate(Side.BUY, initialPrice, quantity);
        BigDecimal buyCost = buyImpact.totalAmount();
        BigDecimal priceAfterBuy = buyImpact.newPrice();

        // Price jumped to priceAfterBuy (> initialPrice)
        assertThat(priceAfterBuy).isGreaterThan(initialPrice);

        // Step 2: User immediately Sells the same 50 shares
        PriceImpactCalculator.Impact sellImpact = calculator.calculate(Side.SELL, priceAfterBuy, quantity);
        BigDecimal sellProceeds = sellImpact.totalAmount();

        // Round trip net profit = sellProceeds - buyCost
        BigDecimal netPnL = sellProceeds.subtract(buyCost);

        // Net P&L MUST be strictly negative (loss due to midpoint slippage)
        assertThat(netPnL).isLessThan(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("Impact disabled mode produces zero price movement and static execution")
    void testImpactDisabled() {
        PriceImpactCalculator disabledCalc = new PriceImpactCalculator(
                false,
                new BigDecimal("10000000"),
                new BigDecimal("2.0"),
                new BigDecimal("1.00")
        );

        PriceImpactCalculator.Impact buy = disabledCalc.calculate(Side.BUY, new BigDecimal("1500.00"), 20);
        assertThat(buy.impactPct()).isEqualByComparingTo("0.0000");
        assertThat(buy.executionPrice()).isEqualByComparingTo("1500.00");
        assertThat(buy.newPrice()).isEqualByComparingTo("1500.00");
        assertThat(buy.totalAmount()).isEqualByComparingTo("30000.00");
    }

    @Test
    @DisplayName("Minimum price floor is respected even under severe sell pressure")
    void testMinPriceFloor() {
        PriceImpactCalculator floorCalc = new PriceImpactCalculator(
                true,
                new BigDecimal("1000"), // artificially tiny depth
                new BigDecimal("99.0"),
                new BigDecimal("1.00")
        );

        PriceImpactCalculator.Impact sell = floorCalc.calculate(Side.SELL, new BigDecimal("1.50"), 1000);
        assertThat(sell.newPrice()).isGreaterThanOrEqualTo(new BigDecimal("1.00"));
        assertThat(sell.executionPrice()).isGreaterThanOrEqualTo(new BigDecimal("1.00"));
    }
}
