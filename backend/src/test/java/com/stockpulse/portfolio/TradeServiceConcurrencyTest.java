package com.stockpulse.portfolio;

import com.stockpulse.stock.PriceHistoryRepository;
import com.stockpulse.stock.Stock;
import com.stockpulse.stock.StockRepository;
import com.stockpulse.user.Role;
import com.stockpulse.user.User;
import com.stockpulse.user.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
    "stockpulse.market.impact-enabled=true",
    "stockpulse.market.drift.enabled=false"
})
class TradeServiceConcurrencyTest {

    @Autowired
    private TradeService tradeService;

    @Autowired
    private StockRepository stockRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PriceHistoryRepository priceHistoryRepository;

    @Test
    @DisplayName("Two users trading the same stock concurrently produce sequential price updates without lost updates")
    void testConcurrentTradesOnSameStock() throws Exception {
        // Setup stock
        Stock stock = new Stock();
        stock.setSymbol("CONC_TCS");
        stock.setCompanyName("Concurrent TCS Test");
        stock.setSector("IT");
        stock.setCurrentPrice(new BigDecimal("3400.00"));
        stock.setPreviousClose(new BigDecimal("3400.00"));
        stock.setBasePrice(new BigDecimal("3400.00"));
        stock = stockRepository.save(stock);

        // Setup User 1
        User user1 = new User();
        user1.setName("User One");
        user1.setEmail("user1_conc@test.com");
        user1.setPasswordHash("hash1");
        user1.setRole(Role.USER);
        user1.setCashBalance(new BigDecimal("1000000.00"));
        user1 = userRepository.save(user1);

        // Setup User 2
        User user2 = new User();
        user2.setName("User Two");
        user2.setEmail("user2_conc@test.com");
        user2.setPasswordHash("hash2");
        user2.setRole(Role.USER);
        user2.setCashBalance(new BigDecimal("1000000.00"));
        user2 = userRepository.save(user2);

        final Long u1Id = user1.getId();
        final Long u2Id = user2.getId();
        final String sym = stock.getSymbol();

        int threadCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);

        Future<?> f1 = executor.submit(() -> {
            readyLatch.countDown();
            try {
                startLatch.await();
                tradeService.buy(u1Id, sym, 10);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });

        Future<?> f2 = executor.submit(() -> {
            readyLatch.countDown();
            try {
                startLatch.await();
                tradeService.buy(u2Id, sym, 10);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });

        readyLatch.await(5, TimeUnit.SECONDS);
        // Release both threads simultaneously
        startLatch.countDown();

        f1.get(10, TimeUnit.SECONDS);
        f2.get(10, TimeUnit.SECONDS);
        executor.shutdown();

        // Verification:
        // Starting at 3400.00:
        // 1st buy of 10 shares: impact 0.34% -> 3411.56
        // 2nd buy of 10 shares: value = 34,115.60 -> impact 0.3412% -> 3411.56 * (1 + 0.3412/100) ≈ 3423.20
        Stock updatedStock = stockRepository.findBySymbol(sym).orElseThrow();
        assertThat(updatedStock.getCurrentPrice()).isGreaterThan(new BigDecimal("3411.56"));
        assertThat(updatedStock.getCurrentPrice()).isLessThan(new BigDecimal("3430.00"));

        // Confirm both user balances decreased
        User refreshedUser1 = userRepository.findById(u1Id).orElseThrow();
        User refreshedUser2 = userRepository.findById(u2Id).orElseThrow();
        assertThat(refreshedUser1.getCashBalance()).isLessThan(new BigDecimal("1000000.00"));
        assertThat(refreshedUser2.getCashBalance()).isLessThan(new BigDecimal("1000000.00"));
    }
}
