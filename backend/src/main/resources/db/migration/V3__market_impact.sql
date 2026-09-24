-- =============================================================
-- V3__market_impact.sql – Market impact model, drift, and trade attribution
-- =============================================================

-- Add base_price to stocks to anchor mean-reversion in market drift
ALTER TABLE stocks ADD COLUMN base_price NUMERIC(19,4);
UPDATE stocks SET base_price = current_price;
ALTER TABLE stocks ALTER COLUMN base_price SET NOT NULL;

-- Add attribution source to price history
ALTER TABLE price_history ADD COLUMN source VARCHAR(12) NOT NULL DEFAULT 'SEED';

-- Compound index for fast stock history queries
CREATE INDEX IF NOT EXISTS idx_price_history_stock_time ON price_history (stock_id, recorded_at DESC);

-- Track market movement attribution per trade
ALTER TABLE transactions ADD COLUMN price_before NUMERIC(19,4);
ALTER TABLE transactions ADD COLUMN price_after NUMERIC(19,4);
ALTER TABLE transactions ADD COLUMN impact_pct NUMERIC(19,4);
