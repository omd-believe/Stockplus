package com.stockpulse.stock;

import com.stockpulse.config.AppProperties;
import com.stockpulse.stock.dto.DriftToggleRequest;
import com.stockpulse.stock.dto.MarketStatusResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api")
@Tag(name = "Market", description = "Market simulation status and drift controls")
public class MarketController {

    private final MarketDriftService marketDriftService;
    private final boolean impactEnabled;

    public MarketController(MarketDriftService marketDriftService, AppProperties props) {
        this.marketDriftService = marketDriftService;
        this.impactEnabled = props != null && props.market() != null ? props.market().impactEnabled() : true;
    }

    @GetMapping("/market/status")
    @Operation(summary = "Get current market simulation status")
    public ResponseEntity<MarketStatusResponse> getStatus() {
        return ResponseEntity.ok(new MarketStatusResponse(
                marketDriftService.isDriftEnabled(),
                impactEnabled,
                Instant.now()
        ));
    }

    @PostMapping("/admin/market/drift")
    @Operation(summary = "ADMIN: Pause or resume background market drift")
    public ResponseEntity<MarketStatusResponse> toggleDrift(@RequestBody DriftToggleRequest req) {
        marketDriftService.setDriftEnabled(req.enabled());
        return ResponseEntity.ok(new MarketStatusResponse(
                marketDriftService.isDriftEnabled(),
                impactEnabled,
                Instant.now()
        ));
    }
}
