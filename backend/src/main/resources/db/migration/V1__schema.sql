-- =============================================================
-- V1__schema.sql  – StockPulse database schema
-- =============================================================

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(100)    NOT NULL,
    email         VARCHAR(150)    NOT NULL UNIQUE,
    password_hash VARCHAR(100)    NOT NULL,
    role          VARCHAR(20)     NOT NULL DEFAULT 'USER',
    cash_balance  NUMERIC(19,4)   NOT NULL DEFAULT 1000000.0000,
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE stocks (
    id              BIGSERIAL PRIMARY KEY,
    symbol          VARCHAR(20)     NOT NULL UNIQUE,
    company_name    VARCHAR(150)    NOT NULL,
    sector          VARCHAR(50)     NOT NULL,
    current_price   NUMERIC(19,4)   NOT NULL CHECK (current_price > 0),
    previous_close  NUMERIC(19,4)   NOT NULL
);

CREATE TABLE holdings (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT          NOT NULL REFERENCES users(id),
    stock_id          BIGINT          NOT NULL REFERENCES stocks(id),
    quantity          INT             NOT NULL CHECK (quantity > 0),
    average_buy_price NUMERIC(19,4)   NOT NULL,
    UNIQUE (user_id, stock_id)
);

CREATE TABLE transactions (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT          NOT NULL REFERENCES users(id),
    stock_id      BIGINT          NOT NULL REFERENCES stocks(id),
    type          VARCHAR(4)      NOT NULL CHECK (type IN ('BUY','SELL')),
    quantity      INT             NOT NULL CHECK (quantity > 0),
    price         NUMERIC(19,4)   NOT NULL,
    total_amount  NUMERIC(19,4)   NOT NULL,
    realized_pnl  NUMERIC(19,4),
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE price_history (
    id          BIGSERIAL PRIMARY KEY,
    stock_id    BIGINT          NOT NULL REFERENCES stocks(id),
    price       NUMERIC(19,4)   NOT NULL,
    recorded_at TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_transactions_user_created ON transactions(user_id, created_at DESC);
CREATE INDEX idx_holdings_user             ON holdings(user_id);
CREATE INDEX idx_price_history_stock       ON price_history(stock_id, recorded_at DESC);
