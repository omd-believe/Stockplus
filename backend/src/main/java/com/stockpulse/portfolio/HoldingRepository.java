package com.stockpulse.portfolio;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HoldingRepository extends JpaRepository<Holding, Long> {

    /**
     * EntityGraph forces a JOIN FETCH on stock, preventing N+1 when we load
     * all holdings for the portfolio view.
     */
    @EntityGraph(attributePaths = "stock")
    List<Holding> findByUserId(Long userId);

    Optional<Holding> findByUserIdAndStockSymbol(Long userId, String symbol);

    boolean existsByStockId(Long stockId);
}
