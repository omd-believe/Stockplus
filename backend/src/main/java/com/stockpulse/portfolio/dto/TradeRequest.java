package com.stockpulse.portfolio.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record TradeRequest(
        @NotBlank(message = "Symbol is required")
        String symbol,

        @Min(value = 1, message = "Quantity must be at least 1")
        int quantity
) {}
