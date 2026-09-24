package com.stockpulse.stock;

import com.stockpulse.stock.dto.ImpactPreviewResponse;
import com.stockpulse.stock.dto.StockHistoryResponse;
import com.stockpulse.user.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@Tag(name = "Stocks", description = "Stock listing, price history, and market impact preview")
public class StockController {

    private final StockService stockService;

    public StockController(StockService stockService) {
        this.stockService = stockService;
    }

    @GetMapping("/stocks")
    @Operation(summary = "List all stocks with sparkline and dayChangeAbs")
    public ResponseEntity<List<StockDto>> getAllStocks() {
        return ResponseEntity.ok(stockService.getAllStocks());
    }

    @GetMapping("/stocks/{symbol}")
    @Operation(summary = "Get a single stock by symbol with sparkline")
    public ResponseEntity<StockDto> getStock(@PathVariable String symbol) {
        return ResponseEntity.ok(stockService.getBySymbol(symbol));
    }

    @GetMapping("/stocks/{symbol}/history")
    @Operation(summary = "Get downsampled price history for charts with user trade markers (range: 1H, 1D, 1W, ALL)")
    public ResponseEntity<StockHistoryResponse> getHistory(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "1D") String range,
            @AuthenticationPrincipal User user) {
        Long userId = user != null ? user.getId() : null;
        return ResponseEntity.ok(stockService.getStockHistory(symbol, range, userId));
    }

    @GetMapping("/stocks/{symbol}/impact-preview")
    @Operation(summary = "Preview market impact and slippage fill price without placing an order")
    public ResponseEntity<ImpactPreviewResponse> getImpactPreview(
            @PathVariable String symbol,
            @RequestParam Side side,
            @RequestParam(defaultValue = "1") int quantity) {
        return ResponseEntity.ok(stockService.getImpactPreview(symbol, side, quantity));
    }

    // ── Admin endpoints ──────────────────────────────────────────────────────

    @PostMapping("/admin/stocks/{symbol}/price")
    @Operation(summary = "ADMIN: Set a specific price for a stock without altering previous_close")
    public ResponseEntity<StockDto> setPrice(
            @PathVariable String symbol,
            @Valid @RequestBody SetPriceRequest req) {
        return ResponseEntity.ok(stockService.setPrice(symbol, req.price()));
    }

    @PostMapping("/admin/stocks/simulate-tick")
    @Operation(summary = "ADMIN: Apply a random ±2% tick across all stocks")
    public ResponseEntity<List<StockDto>> simulateTick() {
        return ResponseEntity.ok(stockService.simulateTick());
    }
}
