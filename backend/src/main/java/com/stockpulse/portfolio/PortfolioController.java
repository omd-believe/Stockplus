package com.stockpulse.portfolio;

import com.stockpulse.portfolio.dto.PortfolioSummary;
import com.stockpulse.portfolio.dto.TradeReceipt;
import com.stockpulse.portfolio.dto.TradeRequest;
import com.stockpulse.risk.RiskAnalysisService;
import com.stockpulse.risk.RiskReport;
import com.stockpulse.user.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/portfolio")
@Tag(name = "Portfolio", description = "Trade execution and portfolio metrics")
public class PortfolioController {

    private final TradeService tradeService;
    private final PortfolioService portfolioService;
    private final RiskAnalysisService riskAnalysisService;

    public PortfolioController(TradeService tradeService,
                               PortfolioService portfolioService,
                               RiskAnalysisService riskAnalysisService) {
        this.tradeService = tradeService;
        this.portfolioService = portfolioService;
        this.riskAnalysisService = riskAnalysisService;
    }

    @PostMapping("/buy")
    @Operation(summary = "Execute a BUY trade")
    public ResponseEntity<TradeReceipt> buy(@AuthenticationPrincipal User user,
                                            @Valid @RequestBody TradeRequest req) {
        return ResponseEntity.ok(tradeService.buy(user.getId(), req.symbol(), req.quantity()));
    }

    @PostMapping("/sell")
    @Operation(summary = "Execute a SELL trade (includes realized P&L)")
    public ResponseEntity<TradeReceipt> sell(@AuthenticationPrincipal User user,
                                             @Valid @RequestBody TradeRequest req) {
        return ResponseEntity.ok(tradeService.sell(user.getId(), req.symbol(), req.quantity()));
    }

    @GetMapping
    @Operation(summary = "Get portfolio summary with all metrics")
    public ResponseEntity<PortfolioSummary> getPortfolio(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(portfolioService.getSummary(user));
    }

    @GetMapping("/risk")
    @Operation(summary = "Get risk analysis report with concentration warnings")
    public ResponseEntity<RiskReport> getRisk(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(riskAnalysisService.analyze(user.getId()));
    }
}
