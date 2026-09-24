package com.stockpulse.exception;

public class InsufficientHoldingsException extends RuntimeException {
    public InsufficientHoldingsException(String symbol, int owned, int requested) {
        super(String.format(
                "You own %d shares of %s but tried to sell %d.",
                owned, symbol, requested));
    }
}
