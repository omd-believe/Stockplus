package com.stockpulse.stock;

import java.math.BigDecimal;

/**
 * Abstraction over price data.
 * Today: SimulatedPriceProvider reads from the DB.
 * Tomorrow: swap in a real market-data adapter without touching business logic.
 */
public interface PriceProvider {
    BigDecimal getPrice(String symbol);
}
