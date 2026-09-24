package com.stockpulse.auth.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record AuthResponse(
        String token,
        Instant expiresAt,
        UserInfo user
) {
    public record UserInfo(
            Long id,
            String name,
            String email,
            String role,
            BigDecimal cashBalance
    ) {}
}
