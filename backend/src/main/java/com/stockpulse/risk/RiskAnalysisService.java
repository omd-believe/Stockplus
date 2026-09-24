package com.stockpulse.risk;

import com.stockpulse.config.AppProperties;
import com.stockpulse.portfolio.Holding;
import com.stockpulse.portfolio.HoldingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RiskAnalysisService {

    private final HoldingRepository holdingRepository;
    private final AppProperties.Risk riskConfig;

    public RiskAnalysisService(HoldingRepository holdingRepository, AppProperties props) {
        this.holdingRepository = holdingRepository;
        this.riskConfig = props.risk();
    }

    @Transactional(readOnly = true)
    public RiskReport analyze(Long userId) {
        List<Holding> holdings = holdingRepository.findByUserId(userId);

        if (holdings.isEmpty()) {
            return new RiskReport(
                    null, BigDecimal.ZERO,
                    Map.of(),
                    List.of("INSUFFICIENT_DIVERSIFICATION: No holdings in portfolio."),
                    RiskReport.RiskLevel.LOW,
                    BigDecimal.valueOf(100)
            );
        }

        // Total market value (cash excluded — risk is about holdings allocation)
        BigDecimal totalValue = holdings.stream()
                .map(h -> h.getStock().getCurrentPrice().multiply(BigDecimal.valueOf(h.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalValue.compareTo(BigDecimal.ZERO) == 0) {
            return new RiskReport(null, BigDecimal.ZERO, Map.of(),
                    List.of("INSUFFICIENT_DIVERSIFICATION: Holdings have zero value."),
                    RiskReport.RiskLevel.LOW, BigDecimal.valueOf(100));
        }

        // Per-holding allocation %
        Map<String, BigDecimal> stockAllocation = new LinkedHashMap<>();
        Map<String, BigDecimal> sectorAllocation = new LinkedHashMap<>();

        for (Holding h : holdings) {
            BigDecimal value = h.getStock().getCurrentPrice()
                    .multiply(BigDecimal.valueOf(h.getQuantity()));
            BigDecimal pct = value.divide(totalValue, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);

            stockAllocation.put(h.getStock().getSymbol(), pct);
            sectorAllocation.merge(h.getStock().getSector(), pct, BigDecimal::add);
        }

        // Largest single stock
        Map.Entry<String, BigDecimal> largest = stockAllocation.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .orElseThrow();

        double topHoldingPct = largest.getValue().doubleValue();

        List<String> warnings = new ArrayList<>();

        // Insufficient diversification
        if (holdings.size() < 2) {
            warnings.add("INSUFFICIENT_DIVERSIFICATION: Portfolio has fewer than 2 holdings. " +
                    "Diversify to reduce risk.");
        }

        // Stock concentration
        if (topHoldingPct > riskConfig.singleStockLimitPct()) {
            warnings.add(String.format(
                    "HIGH_STOCK_CONCENTRATION: %s is %.1f%% of your portfolio (limit %.0f%%).",
                    largest.getKey(), topHoldingPct, riskConfig.singleStockLimitPct()));
        }

        // Sector concentration
        for (Map.Entry<String, BigDecimal> sector : sectorAllocation.entrySet()) {
            double sectorPct = sector.getValue().doubleValue();
            if (sectorPct > riskConfig.sectorLimitPct()) {
                warnings.add(String.format(
                        "HIGH_SECTOR_CONCENTRATION: %s sector is %.1f%% (limit %.0f%%).",
                        sector.getKey(), sectorPct, riskConfig.sectorLimitPct()));
            }
        }

        // Risk level
        RiskReport.RiskLevel level;
        if (topHoldingPct >= riskConfig.highRiskTopHoldingPct()) {
            level = RiskReport.RiskLevel.HIGH;
        } else if (topHoldingPct >= riskConfig.mediumRiskTopHoldingPct()) {
            level = RiskReport.RiskLevel.MEDIUM;
        } else {
            level = RiskReport.RiskLevel.LOW;
        }

        // Diversification score: 100 - topHoldingPct  (range 0–100)
        BigDecimal diversificationScore = BigDecimal.valueOf(100 - topHoldingPct)
                .setScale(2, RoundingMode.HALF_UP);
        if (diversificationScore.compareTo(BigDecimal.ZERO) < 0) {
            diversificationScore = BigDecimal.ZERO;
        }

        // Sort sector allocation for clean output
        Map<String, BigDecimal> sortedSectors = sectorAllocation.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue,
                        (a, b) -> a, LinkedHashMap::new));

        return new RiskReport(
                largest.getKey(),
                largest.getValue(),
                sortedSectors,
                warnings,
                level,
                diversificationScore
        );
    }
}
