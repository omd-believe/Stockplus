package com.stockpulse.portfolio;

import com.stockpulse.exception.InsufficientFundsException;
import com.stockpulse.exception.InsufficientHoldingsException;
import com.stockpulse.exception.StockNotFoundException;
import com.stockpulse.portfolio.dto.TradeReceipt;
import com.stockpulse.stock.*;
import com.stockpulse.transaction.Transaction;
import com.stockpulse.transaction.TransactionRepository;
import com.stockpulse.transaction.TxType;
import com.stockpulse.user.User;
import com.stockpulse.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Trade execution service implementing market impact and slippage-adjusted fills.
 *
 * Concurrency & Locking:
 * To eliminate deadlocks, the lock order is strictly enforced:
 *   1. User row (PESSIMISTIC_WRITE)
 *   2. Stock row (PESSIMISTIC_WRITE)
 */
@Service
public class TradeService {

    private static final Logger log = LoggerFactory.getLogger(TradeService.class);

    private final UserRepository userRepository;
    private final StockRepository stockRepository;
    private final HoldingRepository holdingRepository;
    private final TransactionRepository transactionRepository;
    private final PriceHistoryRepository priceHistoryRepository;
    private final PriceImpactCalculator priceImpactCalculator;

    public TradeService(UserRepository userRepository,
                        StockRepository stockRepository,
                        HoldingRepository holdingRepository,
                        TransactionRepository transactionRepository,
                        PriceHistoryRepository priceHistoryRepository,
                        PriceImpactCalculator priceImpactCalculator) {
        this.userRepository = userRepository;
        this.stockRepository = stockRepository;
        this.holdingRepository = holdingRepository;
        this.transactionRepository = transactionRepository;
        this.priceHistoryRepository = priceHistoryRepository;
        this.priceImpactCalculator = priceImpactCalculator;
    }

    /**
     * BUY flow:
     * 1. Lock user row
     * 2. Lock stock row
     * 3. Calculate market impact and midpoint fill price
     * 4. Verify funds, deduct cash, update holding average
     * 5. Record transaction, update stock price, insert price history
     */
    @Transactional
    public TradeReceipt buy(Long userId, String symbol, int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than 0");
        }

        // 1. Lock user row first
        User user = userRepository.findByIdWithLock(userId)
                .orElseThrow(() -> new IllegalStateException("User not found: " + userId));

        // 2. Lock stock row second (fixed order prevents deadlocks)
        Stock stock = stockRepository.findBySymbolForUpdate(symbol.toUpperCase())
                .orElseThrow(() -> new StockNotFoundException(symbol));

        BigDecimal priceBefore = stock.getCurrentPrice();
        PriceImpactCalculator.Impact impact = priceImpactCalculator.calculate(Side.BUY, priceBefore, quantity);

        BigDecimal fillPrice = impact.executionPrice();
        BigDecimal totalCost = impact.totalAmount();
        BigDecimal newMarketPrice = impact.newPrice();

        if (user.getCashBalance().compareTo(totalCost) < 0) {
            throw new InsufficientFundsException(totalCost, user.getCashBalance());
        }

        // Deduct cash balance
        user.setCashBalance(user.getCashBalance().subtract(totalCost));
        userRepository.save(user);

        // Update or create user holding
        Holding holding = holdingRepository.findByUserIdAndStockSymbol(userId, stock.getSymbol())
                .orElseGet(() -> {
                    Holding h = new Holding();
                    h.setUser(user);
                    h.setStock(stock);
                    h.setQuantity(0);
                    h.setAverageBuyPrice(BigDecimal.ZERO);
                    return h;
                });

        BigDecimal newAvg = computeNewAverage(
                holding.getQuantity(), holding.getAverageBuyPrice(),
                quantity, fillPrice);
        holding.setQuantity(holding.getQuantity() + quantity);
        holding.setAverageBuyPrice(newAvg);
        holdingRepository.save(holding);

        // Record transaction ledger with market impact attribution
        Transaction tx = new Transaction();
        tx.setUser(user);
        tx.setStock(stock);
        tx.setType(TxType.BUY);
        tx.setQuantity(quantity);
        tx.setPrice(fillPrice);
        tx.setTotalAmount(totalCost);
        tx.setPriceBefore(priceBefore);
        tx.setPriceAfter(newMarketPrice);
        tx.setImpactPct(impact.impactPct());
        transactionRepository.save(tx);

        // Update stock current price
        stock.setCurrentPrice(newMarketPrice);
        stockRepository.save(stock);

        // Append to price history
        PriceHistory history = new PriceHistory();
        history.setStock(stock);
        history.setPrice(newMarketPrice);
        history.setSource(PriceSource.TRADE_BUY);
        priceHistoryRepository.save(history);

        log.info("TRADE BUY: user={} symbol={} qty={} fillPrice={} newPrice={} impact={}%",
                userId, symbol, quantity, fillPrice, newMarketPrice, impact.impactPct());

        return new TradeReceipt(
                tx.getId(), "BUY", stock.getSymbol(), quantity, fillPrice, totalCost,
                priceBefore, newMarketPrice, impact.impactPct(), null, user.getCashBalance(),
                holding.getAverageBuyPrice(), holding.getQuantity(), tx.getCreatedAt()
        );
    }

    /**
     * SELL flow:
     * 1. Lock user row
     * 2. Lock stock row
     * 3. Verify holding quantity
     * 4. Calculate market impact and fill price (pushes price downward)
     * 5. Credit cash, record realized P&L, update holding, update stock & price history
     */
    @Transactional
    public TradeReceipt sell(Long userId, String symbol, int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than 0");
        }

        // 1. Lock user row first
        User user = userRepository.findByIdWithLock(userId)
                .orElseThrow(() -> new IllegalStateException("User not found: " + userId));

        // 2. Lock stock row second
        Stock stock = stockRepository.findBySymbolForUpdate(symbol.toUpperCase())
                .orElseThrow(() -> new StockNotFoundException(symbol));

        Holding holding = holdingRepository.findByUserIdAndStockSymbol(userId, stock.getSymbol())
                .orElseThrow(() -> new InsufficientHoldingsException(symbol, 0, quantity));

        if (holding.getQuantity() < quantity) {
            throw new InsufficientHoldingsException(symbol, holding.getQuantity(), quantity);
        }

        BigDecimal priceBefore = stock.getCurrentPrice();
        PriceImpactCalculator.Impact impact = priceImpactCalculator.calculate(Side.SELL, priceBefore, quantity);

        BigDecimal fillPrice = impact.executionPrice();
        BigDecimal proceeds = impact.totalAmount();
        BigDecimal newMarketPrice = impact.newPrice();

        // realizedPnl = (fillPrice - avgBuyPrice) * qty
        BigDecimal realizedPnl = fillPrice.subtract(holding.getAverageBuyPrice())
                .multiply(BigDecimal.valueOf(quantity))
                .setScale(2, RoundingMode.HALF_UP);

        // Credit cash
        user.setCashBalance(user.getCashBalance().add(proceeds));
        userRepository.save(user);

        // Reduce quantity or delete holding
        int newQty = holding.getQuantity() - quantity;
        BigDecimal avgAfter = holding.getAverageBuyPrice(); // unchanged on sell
        if (newQty == 0) {
            holdingRepository.delete(holding);
            avgAfter = null;
        } else {
            holding.setQuantity(newQty);
            holdingRepository.save(holding);
        }

        // Record transaction
        Transaction tx = new Transaction();
        tx.setUser(user);
        tx.setStock(stock);
        tx.setType(TxType.SELL);
        tx.setQuantity(quantity);
        tx.setPrice(fillPrice);
        tx.setTotalAmount(proceeds);
        tx.setRealizedPnl(realizedPnl);
        tx.setPriceBefore(priceBefore);
        tx.setPriceAfter(newMarketPrice);
        tx.setImpactPct(impact.impactPct());
        transactionRepository.save(tx);

        // Update stock current price
        stock.setCurrentPrice(newMarketPrice);
        stockRepository.save(stock);

        // Append to price history
        PriceHistory history = new PriceHistory();
        history.setStock(stock);
        history.setPrice(newMarketPrice);
        history.setSource(PriceSource.TRADE_SELL);
        priceHistoryRepository.save(history);

        log.info("TRADE SELL: user={} symbol={} qty={} fillPrice={} newPrice={} realizedPnl={}",
                userId, symbol, quantity, fillPrice, newMarketPrice, realizedPnl);

        return new TradeReceipt(
                tx.getId(), "SELL", stock.getSymbol(), quantity, fillPrice, proceeds,
                priceBefore, newMarketPrice, impact.impactPct(), realizedPnl, user.getCashBalance(),
                avgAfter, newQty, tx.getCreatedAt()
        );
    }

    /**
     * Average cost method:
     * newAvg = (oldQty × oldAvg + newQty × fillPrice) / (oldQty + newQty)
     * Scaled to 4 decimal places with HALF_UP rounding.
     */
    private BigDecimal computeNewAverage(int oldQty, BigDecimal oldAvg, int newQty, BigDecimal newPrice) {
        BigDecimal oldTotal = oldAvg.multiply(BigDecimal.valueOf(oldQty));
        BigDecimal newTotal = newPrice.multiply(BigDecimal.valueOf(newQty));
        return oldTotal.add(newTotal)
                .divide(BigDecimal.valueOf((long) oldQty + newQty), 4, RoundingMode.HALF_UP);
    }
}
