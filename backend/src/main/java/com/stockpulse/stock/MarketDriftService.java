package com.stockpulse.stock;

import com.stockpulse.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Random;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Service simulating random market drift with mean-reversion toward base_price.
 * Runs in individual transactions per stock under a pessimistic lock.
 */
@Service
public class MarketDriftService {

    private static final Logger log = LoggerFactory.getLogger(MarketDriftService.class);

    private final StockRepository stockRepository;
    private final PriceHistoryRepository priceHistoryRepository;

    private final AtomicBoolean driftEnabled = new AtomicBoolean(true);
    private final double volatilityPct;
    private final double meanReversion;
    private final BigDecimal minPrice;
    private final Random random = new Random();

    public MarketDriftService(StockRepository stockRepository,
                              PriceHistoryRepository priceHistoryRepository,
                              AppProperties props) {
        this.stockRepository = stockRepository;
        this.priceHistoryRepository = priceHistoryRepository;

        if (props != null && props.market() != null) {
            AppProperties.Market market = props.market();
            this.minPrice = market.minPrice() != null ? market.minPrice() : new BigDecimal("1.00");
            if (market.drift() != null) {
                AppProperties.Drift drift = market.drift();
                this.driftEnabled.set(drift.enabled());
                this.volatilityPct = drift.volatilityPct() != null ? drift.volatilityPct().doubleValue() : 0.10;
                this.meanReversion = drift.meanReversion() != null ? drift.meanReversion().doubleValue() : 0.02;
            } else {
                this.volatilityPct = 0.10;
                this.meanReversion = 0.02;
            }
        } else {
            this.minPrice = new BigDecimal("1.00");
            this.volatilityPct = 0.10;
            this.meanReversion = 0.02;
        }
    }

    public boolean isDriftEnabled() {
        return driftEnabled.get();
    }

    public void setDriftEnabled(boolean enabled) {
        this.driftEnabled.set(enabled);
        log.info("Market drift enabled set to: {}", enabled);
    }

    public void tick() {
        if (!driftEnabled.get()) {
            return;
        }

        List<Long> stockIds = stockRepository.findAll().stream().map(Stock::getId).toList();
        for (Long stockId : stockIds) {
            try {
                tickSingleStock(stockId);
            } catch (Exception e) {
                log.warn("Drift tick failed for stockId {}: {}", stockId, e.getMessage());
            }
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void tickSingleStock(Long stockId) {
        Stock stock = stockRepository.findByIdForUpdate(stockId).orElse(null);
        if (stock == null) return;

        BigDecimal price = stock.getCurrentPrice();
        BigDecimal basePrice = stock.getBasePrice() != null ? stock.getBasePrice() : price;

        // step = Normal(0, volatility-pct/100)
        double step = random.nextGaussian() * (volatilityPct / 100.0);

        // pull = mean-reversion × (basePrice − price) / basePrice
        double pull = 0.0;
        if (basePrice.compareTo(BigDecimal.ZERO) > 0) {
            pull = meanReversion * (basePrice.subtract(price).doubleValue() / basePrice.doubleValue());
        }

        // newPrice = price × (1 + step + pull)
        double factor = 1.0 + step + pull;
        BigDecimal newPrice = price.multiply(BigDecimal.valueOf(factor))
                .setScale(2, RoundingMode.HALF_UP);

        if (newPrice.compareTo(minPrice) < 0) {
            newPrice = minPrice;
        }

        // Skip if price rounded to 2 decimals is unchanged
        if (newPrice.compareTo(price) == 0) {
            return;
        }

        stock.setCurrentPrice(newPrice);
        stockRepository.save(stock);

        PriceHistory ph = new PriceHistory();
        ph.setStock(stock);
        ph.setPrice(newPrice);
        ph.setSource(PriceSource.DRIFT);
        priceHistoryRepository.save(ph);
    }

    /**
     * Daily midnight IST job:
     * Sets previous_close = current_price for every stock so daily changes reflect the trading day.
     */
    @Transactional
    public void rollPreviousClose() {
        List<Stock> stocks = stockRepository.findAll();
        for (Stock stock : stocks) {
            stock.setPreviousClose(stock.getCurrentPrice());
        }
        stockRepository.saveAll(stocks);
        log.info("Rolled previous_close for {} stocks at midnight IST", stocks.size());
    }

    /**
     * Retention job: Deletes price history older than 7 days.
     */
    @Transactional
    public int cleanupOldHistory() {
        Instant cutoff = Instant.now().minus(7, ChronoUnit.DAYS);
        int deleted = priceHistoryRepository.deleteOlderThan(cutoff);
        log.info("Cleaned up {} old price_history rows older than 7 days", deleted);
        return deleted;
    }
}
