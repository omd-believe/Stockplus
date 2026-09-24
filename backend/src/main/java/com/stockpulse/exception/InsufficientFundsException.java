package com.stockpulse.exception;

import java.math.BigDecimal;

public class InsufficientFundsException extends RuntimeException {
    public InsufficientFundsException(BigDecimal required, BigDecimal available) {
        super(String.format(
                "Insufficient funds. Required: ₹%.2f, Available: ₹%.2f",
                required, available));
    }
}
