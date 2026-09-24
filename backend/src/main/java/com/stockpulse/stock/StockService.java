package com.stockpulse.stock;

import com.stockpulse.exception.StockNotFoundException;
import com.stockpulse.stock.dto.ImpactPreviewResponse;
import com.stockpulse.stock.dto.StockHistoryResponse;
import com.stockpulse.transaction.Transaction;
import com.stockpulse.transaction.TransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class StockService {

    private static final Logger log = LoggerFactory.getLogger(StockService.class);

    private final StockRepository stockRepository;
    private final PriceHistoryRepository priceHistoryRepository;
    private final TransactionRepository transactionRepository;
    private final PriceImpactCalculator priceImpactCalculator;
    private final Random random = new Random();

    public StockService(StockRepository stockRepository,
                        PriceHistoryRepository priceHistoryRepository,
                        TransactionRepository transactionRepository,
                        PriceImpactCalculator priceImpactCalculator) {
        this.stockRepository = stockRepository;
        this.priceHistoryRepository = priceHistoryRepository;
        this.transactionRepository = transactionRepository;
        this.priceImpactCalculator = priceImpactCalculator;
    }

    /**
     * Lists all stocks with dayChangeAbs, dayChangePct, and the last 30 sparkline price points.
     */
    public List<StockDto> getAllStocks() {
        List<Stock> stocks = stockRepository.findAll();
        List<StockDto> result = new ArrayList<>();

        for (Stock stock : stocks) {
            // Fetch up to 30 recent prices in descending order
            List<PriceHistory> recent = priceHistoryRepository.findByStockSymbolOrderByRecordedAtDesc(
                    stock.getSymbol(), PageRequest.of(0, 30));

            List<BigDecimal> sparkline = new ArrayList<>();
            for (int i = recent.size() - 1; i >= 0; i--) {
                sparkline.add(recent.get(i).getPrice());
            }

            // Ensure sparkline has at least the current price if empty
            if (sparkline.isEmpty()) {
                if (stock.getPreviousClose() != null) {
                    sparkline.add(stock.getPreviousClose());
                }
                sparkline.add(stock.getCurrentPrice());
            }

            result.add(StockDto.from(stock, sparkline));
        }

        return result;
    }

    public StockDto getBySymbol(String symbol) {
        Stock stock = stockRepository.findBySymbol(symbol.toUpperCase())
                .orElseThrow(() -> new StockNotFoundException(symbol));

        List<PriceHistory> recent = priceHistoryRepository.findByStockSymbolOrderByRecordedAtDesc(
                stock.getSymbol(), PageRequest.of(0, 30));

        List<BigDecimal> sparkline = new ArrayList<>();
        for (int i = recent.size() - 1; i >= 0; i--) {
            sparkline.add(recent.get(i).getPrice());
        }
        if (sparkline.isEmpty()) {
            if (stock.getPreviousClose() != null) sparkline.add(stock.getPreviousClose());
            sparkline.add(stock.getCurrentPrice());
        }

        return StockDto.from(stock, sparkline);
    }

    /**
     * Downsampled price history for charts with range filtering (1H, 1D, 1W, ALL)
     * and current user's trade markers.
     */
    public StockHistoryResponse getStockHistory(String symbol, String rangeStr, Long userId) {
        Stock stock = stockRepository.findBySymbol(symbol.toUpperCase())
                .orElseThrow(() -> new StockNotFoundException(symbol));

        String range = (rangeStr != null && !rangeStr.isBlank()) ? rangeStr.toUpperCase() : "1D";
        Instant now = Instant.now();
        Instant cutoff = switch (range) {
            case "1H" -> now.minus(1, ChronoUnit.HOURS);
            case "1D" -> now.minus(24, ChronoUnit.HOURS);
            case "1W" -> now.minus(7, ChronoUnit.DAYS);
            default -> null; // ALL
        };

        List<PriceHistory> historyList;
        if (cutoff != null) {
            historyList = priceHistoryRepository.findByStockSymbolAndRecordedAtAfterOrderByRecordedAtAsc(
                    stock.getSymbol(), cutoff);
        } else {
            historyList = priceHistoryRepository.findByStockSymbolOrderByRecordedAtAsc(stock.getSymbol());
        }

        List<StockHistoryResponse.HistoryPoint> points = new ArrayList<>();

        if (historyList.isEmpty()) {
            Instant startPoint = cutoff != null ? cutoff : now.minus(1, ChronoUnit.HOURS);
            BigDecimal base = stock.getPreviousClose() != null ? stock.getPreviousClose() : stock.getCurrentPrice();
            points.add(new StockHistoryResponse.HistoryPoint(startPoint, base));
            points.add(new StockHistoryResponse.HistoryPoint(now, stock.getCurrentPrice()));
        } else if (historyList.size() <= 240) {
            for (PriceHistory ph : historyList) {
                points.add(new StockHistoryResponse.HistoryPoint(ph.getRecordedAt(), ph.getPrice()));
            }
        } else {
            // Downsample in Java to at most 240 points by bucketing on time
            long startMs = historyList.get(0).getRecordedAt().toEpochMilli();
            long endMs = historyList.get(historyList.size() - 1).getRecordedAt().toEpochMilli();
            long totalSpan = Math.max(1, endMs - startMs);
            long bucketSizeMs = (long) Math.ceil((double) totalSpan / 240.0);

            Map<Long, PriceHistory> bucketMap = new LinkedHashMap<>();
            for (PriceHistory ph : historyList) {
                long bucketIdx = (ph.getRecordedAt().toEpochMilli() - startMs) / bucketSizeMs;
                bucketMap.put(bucketIdx, ph);
            }
            for (PriceHistory ph : bucketMap.values()) {
                points.add(new StockHistoryResponse.HistoryPoint(ph.getRecordedAt(), ph.getPrice()));
            }
        }

        // Ensure the very last point matches current price
        if (!points.isEmpty()) {
            StockHistoryResponse.HistoryPoint last = points.get(points.size() - 1);
            if (last.price().compareTo(stock.getCurrentPrice()) != 0) {
                points.add(new StockHistoryResponse.HistoryPoint(now, stock.getCurrentPrice()));
            }
        }

        BigDecimal open = points.get(0).price();
        BigDecimal close = points.get(points.size() - 1).price();
        BigDecimal high = points.stream().map(StockHistoryResponse.HistoryPoint::price).max(BigDecimal::compareTo).orElse(close);
        BigDecimal low = points.stream().map(StockHistoryResponse.HistoryPoint::price).min(BigDecimal::compareTo).orElse(close);

        BigDecimal changeAbs = close.subtract(open).setScale(2, RoundingMode.HALF_UP);
        BigDecimal changePct = BigDecimal.ZERO;
        if (open.compareTo(BigDecimal.ZERO) != 0) {
            changePct = close.subtract(open)
                    .divide(open, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
        }

        // Current user's trades within range
        List<StockHistoryResponse.UserTradeMarker> tradeMarkers = new ArrayList<>();
        if (userId != null) {
            List<Transaction> userTrades;
            if (cutoff != null) {
                userTrades = transactionRepository.findByUserIdAndStockSymbolAndCreatedAtAfterOrderByCreatedAtAsc(
                        userId, stock.getSymbol(), cutoff);
            } else {
                userTrades = transactionRepository.findByUserIdAndStockSymbolOrderByCreatedAtAsc(
                        userId, stock.getSymbol());
            }
            for (Transaction tx : userTrades) {
                tradeMarkers.add(new StockHistoryResponse.UserTradeMarker(
                        tx.getCreatedAt(),
                        tx.getType().name(),
                        tx.getQuantity(),
                        tx.getPrice()
                ));
            }
        }

        return new StockHistoryResponse(
                stock.getSymbol(),
                range,
                points,
                open,
                close,
                high,
                low,
                changeAbs,
                changePct,
                tradeMarkers
        );
    }

    /**
     * Preview trade impact and midpoint fill price without placing an order.
     */
    public ImpactPreviewResponse getImpactPreview(String symbol, Side side, int quantity) {
        Stock stock = stockRepository.findBySymbol(symbol.toUpperCase())
                .orElseThrow(() -> new StockNotFoundException(symbol));

        PriceImpactCalculator.Impact impact = priceImpactCalculator.calculate(side, stock.getCurrentPrice(), quantity);

        return new ImpactPreviewResponse(
                impact.executionPrice(),
                impact.newPrice(),
                impact.impactPct(),
                impact.totalAmount()
        );
    }

    /**
     * Admin set price:
     * Locks stock row, updates price, records history with source ADMIN, does NOT modify previous_close.
     */
    @Transactional
    public StockDto setPrice(String symbol, BigDecimal newPrice) {
        Stock stock = stockRepository.findBySymbolForUpdate(symbol.toUpperCase())
                .orElseThrow(() -> new StockNotFoundException(symbol));

        BigDecimal cleanPrice = newPrice.setScale(2, RoundingMode.HALF_UP);
        stock.setCurrentPrice(cleanPrice);
        stockRepository.save(stock);

        PriceHistory ph = new PriceHistory();
        ph.setStock(stock);
        ph.setPrice(cleanPrice);
        ph.setSource(PriceSource.ADMIN);
        priceHistoryRepository.save(ph);

        log.info("ADMIN set price: {} -> {}", symbol, cleanPrice);
        return StockDto.from(stock);
    }

    /**
     * Admin tick: applies ±2% random fluctuation across all stocks.
     * Does NOT modify previous_close.
     */
    @Transactional
    public List<StockDto> simulateTick() {
        List<Stock> stocks = stockRepository.findAll();
        for (Stock stock : stocks) {
            BigDecimal currentPrice = stock.getCurrentPrice();
            double factor = 1.0 + (random.nextDouble() * 0.04 - 0.02);
            BigDecimal newPrice = currentPrice.multiply(BigDecimal.valueOf(factor))
                    .setScale(2, RoundingMode.HALF_UP);
            if (newPrice.compareTo(BigDecimal.ONE) < 0) {
                newPrice = BigDecimal.ONE;
            }

            stock.setCurrentPrice(newPrice);
            stockRepository.save(stock);

            PriceHistory ph = new PriceHistory();
            ph.setStock(stock);
            ph.setPrice(newPrice);
            ph.setSource(PriceSource.ADMIN);
            priceHistoryRepository.save(ph);
        }

        log.info("ADMIN simulated tick across {} stocks", stocks.size());
        return getAllStocks();
    }
}
