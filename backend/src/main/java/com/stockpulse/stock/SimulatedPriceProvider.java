package com.stockpulse.stock;

import com.stockpulse.exception.StockNotFoundException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Reads prices from the stocks table in the DB.
 * Prices are changed via the admin endpoint — no live market feed.
 */
@Component
public class SimulatedPriceProvider implements PriceProvider {

    private final StockRepository stockRepository;

    public SimulatedPriceProvider(StockRepository stockRepository) {
        this.stockRepository = stockRepository;
    }

    @Override
    public BigDecimal getPrice(String symbol) {
        return stockRepository.findBySymbol(symbol.toUpperCase())
                .map(Stock::getCurrentPrice)
                .orElseThrow(() -> new StockNotFoundException(symbol));
    }
}
