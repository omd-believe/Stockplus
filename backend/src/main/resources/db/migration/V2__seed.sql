-- =============================================================
-- V2__seed.sql  – Seed stock data
-- =============================================================

INSERT INTO stocks (symbol, company_name, sector, current_price, previous_close) VALUES
    ('TCS',        'Tata Consultancy Services', 'IT',      3550.0000, 3520.0000),
    ('INFY',       'Infosys',                   'IT',      1480.0000, 1495.0000),
    ('RELIANCE',   'Reliance Industries',       'Energy',  2920.0000, 2900.0000),
    ('HDFCBANK',   'HDFC Bank',                 'Banking', 1750.0000, 1740.0000),
    ('ICICIBANK',  'ICICI Bank',                'Banking', 1120.0000, 1110.0000),
    ('SBIN',       'State Bank of India',       'Banking',  920.0000,  915.0000),
    ('ITC',        'ITC Ltd',                   'FMCG',     465.0000,  462.0000),
    ('SUNPHARMA',  'Sun Pharmaceutical',        'Pharma',  1680.0000, 1665.0000);
