package com.stockpulse.stock;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface PriceHistoryRepository extends JpaRepository<PriceHistory, Long> {
    List<PriceHistory> findByStockSymbolOrderByRecordedAtDesc(String symbol, Pageable pageable);

    List<PriceHistory> findByStockSymbolAndRecordedAtAfterOrderByRecordedAtAsc(String symbol, Instant after);

    List<PriceHistory> findByStockSymbolOrderByRecordedAtAsc(String symbol);

    @Modifying
    @Query("DELETE FROM PriceHistory ph WHERE ph.recordedAt < :cutoff")
    int deleteOlderThan(@Param("cutoff") Instant cutoff);
}
