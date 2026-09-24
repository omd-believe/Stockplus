package com.stockpulse.transaction;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    Page<Transaction> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Page<Transaction> findByUserIdAndStockSymbolOrderByCreatedAtDesc(Long userId, String symbol, Pageable pageable);

    List<Transaction> findByUserIdAndStockSymbolAndCreatedAtAfterOrderByCreatedAtAsc(Long userId, String symbol, Instant after);

    List<Transaction> findByUserIdAndStockSymbolOrderByCreatedAtAsc(Long userId, String symbol);

    @Query("SELECT COALESCE(SUM(t.realizedPnl), 0) FROM Transaction t WHERE t.user.id = :userId AND t.type = 'SELL'")
    BigDecimal sumRealizedPnlByUserId(Long userId);
}
