package com.stockpulse.stock;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class MarketDriftScheduler {

    private final MarketDriftService marketDriftService;

    public MarketDriftScheduler(MarketDriftService marketDriftService) {
        this.marketDriftService = marketDriftService;
    }

    /**
     * Ticks stock prices according to drift settings (default every 10 seconds).
     */
    @Scheduled(fixedDelayString = "${stockpulse.market.drift.interval-seconds:10}000")
    public void runDriftTick() {
        marketDriftService.tick();
    }

    /**
     * Daily at midnight IST: Roll previous_close to current_price.
     */
    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Kolkata")
    public void rollMidnightPreviousClose() {
        marketDriftService.rollPreviousClose();
    }

    /**
     * Daily at 00:30 IST: Clean up price history older than 7 days.
     */
    @Scheduled(cron = "0 30 0 * * *", zone = "Asia/Kolkata")
    public void runDailyRetentionCleanup() {
        marketDriftService.cleanupOldHistory();
    }
}
