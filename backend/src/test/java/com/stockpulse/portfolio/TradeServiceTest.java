package com.stockpulse.portfolio;

import com.stockpulse.exception.InsufficientFundsException;
import com.stockpulse.exception.InsufficientHoldingsException;
import com.stockpulse.portfolio.dto.TradeReceipt;
import com.stockpulse.stock.PriceHistoryRepository;
import com.stockpulse.stock.PriceImpactCalculator;
import com.stockpulse.stock.Stock;
import com.stockpulse.stock.StockRepository;
import com.stockpulse.transaction.Transaction;
import com.stockpulse.transaction.TransactionRepository;
import com.stockpulse.user.User;
import com.stockpulse.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TradeServiceTest {

    @Mock UserRepository userRepository;
    @Mock StockRepository stockRepository;
    @Mock HoldingRepository holdingRepository;
    @Mock TransactionRepository transactionRepository;
    @Mock PriceHistoryRepository priceHistoryRepository;

    TradeService tradeService;

    User user;
    Stock stock;

    @BeforeEach
    void setUp() {
        PriceImpactCalculator calculator = new PriceImpactCalculator(
                true,
                new BigDecimal("10000000"), // ₹1 crore depth
                new BigDecimal("2.0"),       // 2% cap
                new BigDecimal("1.00")
        );

        tradeService = new TradeService(userRepository, stockRepository,
                holdingRepository, transactionRepository, priceHistoryRepository, calculator);

        user = new User();
        user.setId(1L);
        user.setCashBalance(new BigDecimal("1000000.00"));

        stock = new Stock();
        stock.setId(10L);
        stock.setSymbol("TCS");
        stock.setCompanyName("Tata Consultancy Services");
        stock.setSector("IT");
        stock.setCurrentPrice(new BigDecimal("3400.00"));
        stock.setPreviousClose(new BigDecimal("3380.00"));
        stock.setBasePrice(new BigDecimal("3400.00"));

        lenient().when(userRepository.findByIdWithLock(1L)).thenReturn(Optional.of(user));
        lenient().when(stockRepository.findBySymbolForUpdate("TCS")).thenReturn(Optional.of(stock));
        lenient().when(transactionRepository.save(any())).thenAnswer(inv -> {
            var tx = inv.getArgument(0, Transaction.class);
            tx.setId(100L);
            return tx;
        });
    }

    // ── Acceptance walk-through step 2: BUY 10 TCS at 3400 ─────────────────────

    @Test
    void buy_firstPurchase_acceptanceStep2() {
        when(holdingRepository.findByUserIdAndStockSymbol(1L, "TCS")).thenReturn(Optional.empty());
        when(holdingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        TradeReceipt receipt = tradeService.buy(1L, "TCS", 10);

        // Fill price = 3405.78, cost = 34057.80, cash = 965942.20
        assertThat(receipt.executionPrice()).isEqualByComparingTo("3405.78");
        assertThat(receipt.totalAmount()).isEqualByComparingTo("34057.80");
        assertThat(receipt.cashBalance()).isEqualByComparingTo("965942.20");
        assertThat(receipt.newAverageBuyPrice()).isEqualByComparingTo("3405.7800");
        assertThat(receipt.newQuantity()).isEqualTo(10);
        assertThat(receipt.impactPct()).isEqualByComparingTo("0.3400");
        assertThat(receipt.priceBefore()).isEqualByComparingTo("3400.00");
        assertThat(receipt.priceAfter()).isEqualByComparingTo("3411.56");

        // Verify stock current price updated to 3411.56
        assertThat(stock.getCurrentPrice()).isEqualByComparingTo("3411.56");
        verify(priceHistoryRepository).save(any());
    }

    // ── Acceptance walk-through step 3: BUY 5 TCS at 3411.56 ───────────────────

    @Test
    void buy_secondPurchase_acceptanceStep3() {
        // User already has 10 @ 3405.78, cash 965,942.20, stock price 3411.56
        Holding holding = new Holding();
        holding.setUser(user);
        holding.setStock(stock);
        holding.setQuantity(10);
        holding.setAverageBuyPrice(new BigDecimal("3405.7800"));

        user.setCashBalance(new BigDecimal("965942.20"));
        stock.setCurrentPrice(new BigDecimal("3411.56"));

        when(holdingRepository.findByUserIdAndStockSymbol(1L, "TCS")).thenReturn(Optional.of(holding));
        when(holdingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        TradeReceipt receipt = tradeService.buy(1L, "TCS", 5);

        // Fill price = 3414.47, cost = 17072.35, cash = 948869.85, avg = 3408.6767, price = 3417.38
        assertThat(receipt.executionPrice()).isEqualByComparingTo("3414.47");
        assertThat(receipt.totalAmount()).isEqualByComparingTo("17072.35");
        assertThat(receipt.cashBalance()).isEqualByComparingTo("948869.85");
        assertThat(receipt.newAverageBuyPrice()).isEqualByComparingTo("3408.6767");
        assertThat(receipt.newQuantity()).isEqualTo(15);
        assertThat(receipt.priceAfter()).isEqualByComparingTo("3417.38");
        assertThat(stock.getCurrentPrice()).isEqualByComparingTo("3417.38");
    }

    // ── Acceptance walk-through step 4: SELL 4 TCS at 3417.38 ──────────────────

    @Test
    void sell_partialSell_acceptanceStep4() {
        // User has 15 @ 3408.6767, cash 948,869.85, stock price 3417.38
        Holding holding = new Holding();
        holding.setUser(user);
        holding.setStock(stock);
        holding.setQuantity(15);
        holding.setAverageBuyPrice(new BigDecimal("3408.6767"));

        user.setCashBalance(new BigDecimal("948869.85"));
        stock.setCurrentPrice(new BigDecimal("3417.38"));

        when(holdingRepository.findByUserIdAndStockSymbol(1L, "TCS")).thenReturn(Optional.of(holding));
        when(holdingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        TradeReceipt receipt = tradeService.sell(1L, "TCS", 4);

        // Fill 3415.04, proceeds 13660.16, realizedPnl 25.45, cash 962530.01, avg unchanged, price 3412.71
        assertThat(receipt.executionPrice()).isEqualByComparingTo("3415.04");
        assertThat(receipt.totalAmount()).isEqualByComparingTo("13660.16");
        assertThat(receipt.realizedPnl()).isEqualByComparingTo("25.45");
        assertThat(receipt.cashBalance()).isEqualByComparingTo("962530.01");
        assertThat(receipt.newAverageBuyPrice()).isEqualByComparingTo("3408.6767");
        assertThat(receipt.newQuantity()).isEqualTo(11);
        assertThat(receipt.priceAfter()).isEqualByComparingTo("3412.71");
        assertThat(stock.getCurrentPrice()).isEqualByComparingTo("3412.71");
    }

    // ── Insufficient funds rollback ───────────────────────────────────────────

    @Test
    void buy_insufficientFunds_throwsAndNoSideEffects() {
        user.setCashBalance(new BigDecimal("100.00")); // only ₹100

        assertThatThrownBy(() -> tradeService.buy(1L, "TCS", 10))
                .isInstanceOf(InsufficientFundsException.class);

        // Cash and price must remain unchanged
        assertThat(user.getCashBalance()).isEqualByComparingTo("100.00");
        assertThat(stock.getCurrentPrice()).isEqualByComparingTo("3400.00");
        verify(holdingRepository, never()).save(any());
        verify(stockRepository, never()).save(any());
        verify(priceHistoryRepository, never()).save(any());
    }

    // ── Acceptance walk-through step 5: SELL 20 TCS (over-sell) ───────────────

    @Test
    void sell_moreSharesThanOwned_acceptanceStep5() {
        Holding holding = new Holding();
        holding.setUser(user);
        holding.setStock(stock);
        holding.setQuantity(11);
        holding.setAverageBuyPrice(new BigDecimal("3408.6767"));

        when(holdingRepository.findByUserIdAndStockSymbol(1L, "TCS")).thenReturn(Optional.of(holding));

        assertThatThrownBy(() -> tradeService.sell(1L, "TCS", 20))
                .isInstanceOf(InsufficientHoldingsException.class)
                .hasMessageContaining("11")
                .hasMessageContaining("20");

        // Price, cash, and holdings remain unchanged
        assertThat(stock.getCurrentPrice()).isEqualByComparingTo("3400.00");
        verify(userRepository, never()).save(any());
        verify(holdingRepository, never()).save(any());
        verify(stockRepository, never()).save(any());
    }

    // ── Full sell deletes holding ─────────────────────────────────────────────

    @Test
    void sell_allShares_holdingDeleted() {
        Holding holding = new Holding();
        holding.setUser(user);
        holding.setStock(stock);
        holding.setQuantity(10);
        holding.setAverageBuyPrice(new BigDecimal("3400.00"));

        when(holdingRepository.findByUserIdAndStockSymbol(1L, "TCS")).thenReturn(Optional.of(holding));

        TradeReceipt receipt = tradeService.sell(1L, "TCS", 10);

        assertThat(receipt.newQuantity()).isEqualTo(0);
        assertThat(receipt.newAverageBuyPrice()).isNull();
        verify(holdingRepository).delete(holding);
        verify(holdingRepository, never()).save(any());
    }

    // ── Deterministic test with impact disabled ───────────────────────────────

    @Test
    void deterministicMode_impactDisabled_preservesStaticPrices() {
        PriceImpactCalculator disabledCalc = new PriceImpactCalculator(
                false,
                new BigDecimal("10000000"),
                new BigDecimal("2.0"),
                new BigDecimal("1.00")
        );

        TradeService deterministicTradeService = new TradeService(userRepository, stockRepository,
                holdingRepository, transactionRepository, priceHistoryRepository, disabledCalc);

        when(holdingRepository.findByUserIdAndStockSymbol(1L, "TCS")).thenReturn(Optional.empty());
        when(holdingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        TradeReceipt receipt = deterministicTradeService.buy(1L, "TCS", 10);

        assertThat(receipt.executionPrice()).isEqualByComparingTo("3400.00");
        assertThat(receipt.priceAfter()).isEqualByComparingTo("3400.00");
        assertThat(stock.getCurrentPrice()).isEqualByComparingTo("3400.00");
    }
}
