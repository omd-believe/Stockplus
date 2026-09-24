package com.stockpulse.stock.dto;

import java.time.Instant;

public record MarketStatusResponse(
        boolean driftEnabled,
        boolean impactEnabled,
        Instant serverTime
) {}
