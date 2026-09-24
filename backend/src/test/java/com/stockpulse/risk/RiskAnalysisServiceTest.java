package com.stockpulse.risk;

import com.stockpulse.config.AppProperties;
import com.stockpulse.portfolio.Holding;
import com.stockpulse.portfolio.HoldingRepository;
import com.stockpulse.stock.Stock;
import com.stockpulse.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RiskAnalysisServiceTest {

    @Mock HoldingRepository holdingRepository;

    RiskAnalysisService riskAnalysisService;

    @BeforeEach
    void setUp() {
        AppProperties.Risk riskConfig = new AppProperties.Risk(40, 60, 30, 50);
        AppProperties props = new AppProperties(
                new AppProperties.Jwt("secret-that-is-at-least-32-characters", 60),
                new AppProperties.Admin("a@b.com", "pass"),
                riskConfig,
                null
        );
        riskAnalysisService = new RiskAnalysisService(holdingRepository, props);
    }

    @Test
    void emptyPortfolio_returnsInsufficientDiversificationWarning() {
        when(holdingRepository.findByUserId(1L)).thenReturn(List.of());

        RiskReport report = riskAnalysisService.analyze(1L);

        assertThat(report.warnings()).anyMatch(w -> w.startsWith("INSUFFICIENT_DIVERSIFICATION"));
        assertThat(report.riskLevel()).isEqualTo(RiskReport.RiskLevel.LOW);
    }

    @Test
    void singleHolding_alwaysTriggersInsufficientDiversification() {
        Holding h = makeHolding("TCS", "IT", 100, "3550");
        when(holdingRepository.findByUserId(1L)).thenReturn(List.of(h));

        RiskReport report = riskAnalysisService.analyze(1L);

        assertThat(report.warnings()).anyMatch(w -> w.startsWith("INSUFFICIENT_DIVERSIFICATION"));
    }

    @Test
    void stockConcentrationAbove40pct_triggersWarning() {
        // TCS = 50%, INFY = 50% → no concentration
        // Let TCS be 80% of portfolio
        Holding tcs = makeHolding("TCS", "IT", 80, "1000");
        Holding infy = makeHolding("INFY", "IT", 20, "1000");
        when(holdingRepository.findByUserId(1L)).thenReturn(List.of(tcs, infy));

        RiskReport report = riskAnalysisService.analyze(1L);

        assertThat(report.warnings()).anyMatch(w -> w.contains("HIGH_STOCK_CONCENTRATION"));
        assertThat(report.riskLevel()).isEqualTo(RiskReport.RiskLevel.HIGH);
    }

    @Test
    void sectorConcentrationAbove60pct_triggersWarning() {
        // All IT: TCS 40% + INFY 30% = 70% IT sector
        Holding tcs = makeHolding("TCS", "IT", 40, "1000");
        Holding infy = makeHolding("INFY", "IT", 30, "1000");
        Holding rel = makeHolding("RELIANCE", "Energy", 30, "1000");
        when(holdingRepository.findByUserId(1L)).thenReturn(List.of(tcs, infy, rel));

        RiskReport report = riskAnalysisService.analyze(1L);

        assertThat(report.warnings()).anyMatch(w -> w.contains("HIGH_SECTOR_CONCENTRATION")
                && w.contains("IT"));
    }

    @Test
    void balancedPortfolio_lowRisk_noWarnings() {
        // Four stocks equal weight → 25% each, no concentration
        Holding a = makeHolding("A", "IT", 25, "1000");
        Holding b = makeHolding("B", "Energy", 25, "1000");
        Holding c = makeHolding("C", "Banking", 25, "1000");
        Holding d = makeHolding("D", "FMCG", 25, "1000");
        when(holdingRepository.findByUserId(1L)).thenReturn(List.of(a, b, c, d));

        RiskReport report = riskAnalysisService.analyze(1L);

        assertThat(report.riskLevel()).isEqualTo(RiskReport.RiskLevel.LOW);
        assertThat(report.warnings()).isEmpty();
    }

    @Test
    void diversificationScore_isOneHundredMinusTopHolding() {
        Holding tcs = makeHolding("TCS", "IT", 45, "1000");
        Holding infy = makeHolding("INFY", "Energy", 55, "1000");
        when(holdingRepository.findByUserId(1L)).thenReturn(List.of(tcs, infy));

        RiskReport report = riskAnalysisService.analyze(1L);

        // topHolding = 55%, diversificationScore = 100 - 55 = 45
        assertThat(report.diversificationScore()).isEqualByComparingTo("45.00");
    }

    private Holding makeHolding(String symbol, String sector, int quantity, String price) {
        Stock stock = new Stock();
        stock.setSymbol(symbol);
        stock.setCompanyName(symbol + " Corp");
        stock.setSector(sector);
        stock.setCurrentPrice(new BigDecimal(price));
        stock.setPreviousClose(new BigDecimal(price));

        User user = new User();
        user.setId(1L);

        Holding h = new Holding();
        h.setUser(user);
        h.setStock(stock);
        h.setQuantity(quantity);
        h.setAverageBuyPrice(new BigDecimal(price));
        return h;
    }
}
