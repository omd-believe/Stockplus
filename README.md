# StockPulse v2 📈

> **Simulated market. Prices react to trades on this platform only.**  
> Virtual stock portfolio tracker with trade-driven dynamic pricing, market drift, risk analysis, and live interactive price charts.

---

## About & Internship Attribution

**StockPulse** was developed as an internship project at [InternPe](https://internpe.in/).  
The project demonstrates institutional fintech software engineering, encompassing trade-driven price impact models, pessimistic database serialization, server-side data downsampling, and responsive full-stack architecture.

---

## 1. Overview & New Features in v2

StockPulse v2 transforms the static prototype into an autonomous, trade-driven market simulation with an institutional-grade React frontend:

- 📊 **Trade-Driven Prices (Market-Impact Model)**: Every BUY pushes price up and every SELL pushes price down proportionally to trade value against virtual market depth.
- ⚡ **Midpoint Execution (Slippage-Adjusted)**: Trades fill at the midpoint between the old and new price. This mimics real-world large order slippage and **mathematically eliminates round-trip buy-then-sell exploits**.
- 🌊 **Autonomous Market Drift**: Background scheduler (`MarketDriftScheduler`) generates Gaussian random price drift with mean-reversion pull towards `base_price`. Can be paused from Admin panel for calm demo explanations.
- 🕛 **Midnight IST Rollover**: `@Scheduled(cron = "0 0 0 * * *", zone = "Asia/Kolkata")` resets `previous_close = current_price` daily so day change percentages remain meaningful.
- 🔒 **Deadlock-Free Two-Phase Locking**: Strict lock hierarchy — **User row locked first, then Stock row locked** (`PESSIMISTIC_WRITE`). Tested under concurrent multi-threaded execution.
- 📉 **Interactive Price Charts**: Recharts AreaChart with server-side downsampling (at most 240 time-bucketed points), user trade markers (filled dots for BUY, hollow for SELL), and range controls (1H, 1D, 1W, ALL).
- 🌓 **Premium Private-Banking Design**: Black/white/grey aesthetic with semantic green/red only for gains/losses, light/dark themes (`prefers-color-scheme` + manual toggle in `localStorage`), and mobile-first responsive layout (<768 bottom tabs + native `<dialog>` bottom sheet, 768–1099 rail, ≥1100 sidebar).

---

## 2. Market-Impact Model (Part A1)

### Mathematical Specification

For a trade of `qty` shares when the stock's current price is $P$:

$$\text{tradeValue} = P \times \text{qty}$$

$$\text{impactPct} = \min\left(\text{max-impact-pct},\, \frac{\text{tradeValue}}{\text{depth-inr}} \times 100\right)$$

- **BUY Order**:
  $$\text{executionPrice} = P \times \left(1 + \frac{\text{impactPct}}{200}\right)$$
  $$\text{newPrice} = P \times \left(1 + \frac{\text{impactPct}}{100}\right)$$

- **SELL Order**:
  $$\text{executionPrice} = P \times \left(1 - \frac{\text{impactPct}}{200}\right)$$
  $$\text{newPrice} = P \times \left(1 - \frac{\text{impactPct}}{100}\right)$$

- **Rounding & Floor**: All execution prices and new prices are rounded to 2 decimals using `RoundingMode.HALF_UP`. A hard floor of `newPrice >= 1.00` is enforced.

### Why Midpoint Fills? (Anti-Arbitrage Proof)

If trades executed at the unadjusted current price $P$ and then immediately shifted the market to $P \times (1 + \text{impact})$, an attacker could:
1. Buy 100 shares at $P = 100$.
2. Price jumps to $102$.
3. Sell 100 shares at $102$.
4. Price falls back to $100$.
5. Gain risk-free profit: $100 \times (102 - 100) = ₹200$.

With **midpoint execution**:
1. Buy fills at $P \times (1 + \frac{\text{impact}}{200}) = 101.00$. New price = $102.00$.
2. Sell of 100 shares at $102.00$ impacts price down by ~2%. Sell fills at midpoint: $102 \times (1 - \frac{\text{impact}}{200}) \approx 100.98$.
3. Round trip cash: Paid $10,100$, received $10,098$. **Net loss of $₹2.00$**.
Arbitrage is mathematically impossible. A dedicated unit test in `PriceImpactCalculatorTest` proves that an immediate round-trip trade always produces a net loss.

---

## 3. Concurrency & Locking Order (Part A2)

To ensure zero race conditions and prevent deadlocks under high concurrency:
1. **Strict Lock Order**:
   - Step 1: Lock `User` row (`PESSIMISTIC_WRITE`) via `UserRepository.findByIdForUpdate(userId)`.
   - Step 2: Lock `Stock` row (`PESSIMISTIC_WRITE`) via `StockRepository.findBySymbolForUpdate(symbol)`.
2. **Deadlock Prevention**: Because all transactions acquire locks in the exact same global order (`User` then `Stock`), circular wait conditions cannot form. Background drift and admin price updates only acquire the `Stock` lock, completely avoiding locks on users.
3. **Sequential Execution**: Concurrent buys/sells on the same stock queue sequentially at the database row level; the second trade sees the updated price produced by the first trade without any lost updates. Tested in `TradeServiceConcurrencyTest`.

---

## 4. Market Drift Engine (Part A3)

`MarketDriftScheduler` runs every 10 seconds via Spring `@EnableScheduling`. It invokes `MarketDriftService.tick()`, an independent `@Transactional` bean to prevent Spring proxy self-invocation issues:

$$\text{step} = \mathcal{N}(0, \sigma^2), \quad \sigma = 0.10\%$$

$$\text{pull} = \text{mean-reversion} \times \frac{\text{basePrice} - \text{price}}{\text{basePrice}}, \quad \text{mean-reversion} = 0.02$$

$$\text{newPrice} = \text{price} \times (1 + \text{step} + \text{pull})$$

- If rounded new price equals current price, no redundant write occurs.
- An in-memory thread-safe `AtomicBoolean` allows admins to pause/resume drift at any time via `POST /admin/market/drift`.
- Daily retention job automatically removes price history older than 7 days.

---

## 5. API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/login` | Returns JWT Bearer token |
| `GET` | `/stocks` | Returns all 8 stocks with `sparkline` (last 30 prices) and `dayChangeAbs` |
| `GET` | `/stocks/{symbol}/history?range=1H\|1D\|1W\|ALL` | Downsampled price history (max 240 points) + user's trade markers |
| `GET` | `/stocks/{symbol}/impact-preview?side=BUY\|SELL&quantity=N` | Real-time slippage, estimated fill price, and price shift |
| `POST` | `/portfolio/buy` | Execute BUY with midpoint fill and price impact |
| `POST` | `/portfolio/sell` | Execute SELL with midpoint fill, price impact, and realized P&L |
| `GET` | `/market/status` | Drift status (`driftEnabled`), impact status, server time |
| `POST` | `/admin/market/drift` | (ADMIN) Pause or resume background drift |
| `GET` | `/transactions?symbol={symbol}` | User transaction history with optional symbol filter |

---

## 6. Frontend Architecture (Part B)

- **Vite + React 18** with `HashRouter` (no SPA fallback rules needed on server).
- **Zero External UI Kit**: 100% Vanilla CSS design tokens (`tokens.css`, `base.css`, `components.css`).
- **Single Runtime Dependency Added**: `recharts` for the area chart.
- **Bundle Optimization**: Initial JS is only **69.5 kB gzipped**! `PriceChart`, `HistoryPage`, and `AdminPage` are lazily loaded with `React.lazy`.
- **Visibility-Aware Polling (`usePolling`)**: Polls every 5s, suspends when tab is hidden, resumes immediately on tab return, and backs off to 15s on network error.
- **Responsive Layout**:
  - `< 768px`: Mobile bottom tab bar (44px touch targets), stacked cards, sticky Buy/Sell action bar, native `<dialog>` bottom sheet with 220ms slide-up animation and focus trapping.
  - `768px – 1099px`: 72px icon-only navigation rail.
  - `≥ 1100px`: 220px desktop sidebar.
  - `≥ 1440px`: Centered layout constrained to 1200px max-width.

---

## 7. Five-Minute Demo Walkthrough Script

| Step | Action | What to Say / What to Show |
|---|---|---|
| **1. Login & Dashboard** | Log in as demo user (`user@stockpulse.com` / `password123`). | "Here is the StockPulse v2 dashboard. Net worth starts at ₹10,00,000 cash. Notice the live sparkline trends on each stock and the Market Movers panel showing today's top gainer and loser." |
| **2. Explore Market** | Click **Market** in sidebar/tab. | "The Market page provides real-time quotes with mini-sparklines. Notice the subtle pulse on live prices reflecting market activity." |
| **3. Stock Detail & Live Chart** | Click on **TCS**. | "This is our hero Stock Detail page. Notice the large live price with 300ms count-up tweening, the Recharts area chart with 1H, 1D, 1W, and ALL ranges, and the Key Stats row." |
| **4. Live Order Preview** | In the Order Panel, select **Buy** and type `10`. | "Notice the live preview debounced at 250ms: it communicates with `/stocks/TCS/impact-preview`. The formula runs strictly on the backend — the frontend never duplicates the math. It calculates an estimated fill price of ₹3,405.78, moving TCS up by +0.34%." |
| **5. Execute Buy** | Click **Buy 10 TCS**. | "Trade executes! The panel presents a 3-second trade receipt, sidebar cash decrements to ₹9,65,942.20, market price jumps to ₹3,411.56, and a filled trade dot immediately appears on the chart at the fill price." |
| **6. Pause Drift (Admin)** | Log in as admin (`testadmin@stockpulse.com` / `admin123`) or switch to Admin tab. Click **Pause market drift**. | "For clean demonstration, we pause the background drift. The status indicator on TCS immediately updates to 'Paused'." |
| **7. Execute Sell & Realized P&L** | Return to TCS, switch to **Sell**, select `4` shares, and submit. | "Selling 4 shares impacts the price downward. Because our average buy price was ₹3,405.78 and the sell filled at ₹3,415.04, the receipt and toast immediately reflect a realized profit of ₹25.45, and the new market price falls to ₹3,412.71." |
| **8. Audit Impact in History** | Click **History**. | "Every trade records its exact market footprint. Notice the badges: 'Moved TCS +0.34%' and 'Moved TCS -0.14%'." |

---

## 8. Eight Evaluator Questions & Answers

### Q1: Why do trades execute at the midpoint price instead of the current market price?
> **Answer**: Midpoint execution models real-world market slippage and solves the round-trip arbitrage exploit. If trades filled at the pre-trade price and then moved the market, a user could buy and immediately sell the same quantity for free profit. With midpoint fills, the buyer pays slightly more than the pre-trade price, and the seller receives slightly less than the pre-trade price. Consequently, any immediate round-trip buy-and-sell guarantees a net loss.

### Q2: Why is the database lock order strictly User row first, then Stock row?
> **Answer**: When multiple concurrent transactions update intersecting resources, deadlocks occur if they acquire locks in opposing orders (e.g. Transaction 1 locks User A then Stock S, while Transaction 2 locks Stock S then User A). Enforcing a global deterministic lock hierarchy — **always User first, then Stock** — mathematically precludes circular wait, guaranteeing that deadlocks cannot occur.

### Q3: Why did you choose Pessimistic Locking over Optimistic Locking?
> **Answer**: In high-velocity trading environments where multiple users trade the same liquid stocks simultaneously, optimistic locking (`@Version`) causes high transaction collision rates, resulting in repeated `OptimisticLockException` rollbacks that degrade user experience. Pessimistic write locks (`SELECT ... FOR UPDATE`) serialize the trades at the database level, ensuring deterministic, FIFO price updates without retries.

### Q4: Why downsample historical price data on the server instead of the browser?
> **Answer**: With a 10-second drift interval, a 7-day retention period creates over 60,000 price ticks per stock. Transferring tens of thousands of rows over the wire would waste megabytes of bandwidth and cause severe mobile browser rendering lag. Server-side time-bucketing downsamples the series into at most 240 evenly spaced points, sending a compact JSON payload under 15 KB while preserving visual accuracy.

### Q5: Why use HTTP polling with `usePolling` instead of WebSockets or SSE?
> **Answer**: For a prototype evaluated in 5–7 minutes, HTTP polling provides great resilience without the operational overhead of stateful WebSocket connections (sticky sessions, connection drop handling, heartbeats, and firewall proxy issues). Our custom `usePolling` hook is visibility-aware: it halts polling when the tab is hidden, executes an immediate fetch upon tab refocus, ignores out-of-order stale responses, and backs off to 15s during network degradation.

### Q6: How could this market-impact model be made more realistic?
> **Answer**: The current model uses a linear virtual depth ($\text{impact} \propto \frac{\text{value}}{\text{depth}}$). A real exchange uses an Order Book (limit order book) where depth is non-linear and liquidity concentrates around the spread. Future improvements could include: (1) square-root law of price impact ($\Delta P \propto \sigma \sqrt{Q/V}$), (2) bid-ask spreads, and (3) transient impact decay where prices partially revert over time as external liquidity enters.

### Q7: What are the primary limitations of the current simulation?
> **Answer**:
> 1. Single synthetic liquidity pool rather than multi-participant order matching.
> 2. Drift is modeled as geometric Brownian motion with mean reversion, without macroeconomic event shocks or cross-stock correlation (covariance matrix).
> 3. Execution is guaranteed and instantaneous; there are no partial fills or unfilled limit orders.

### Q8: How exactly does the system prevent the buy-then-sell money exploit?
> **Answer**: By computing fill prices as the integral midpoint of the impact curve. When buying 10 shares of TCS at ₹3,400 with 0.34% impact, the fill price is $3400 \times (1 + 0.34/200) = ₹3,405.78$, and the new market price is ₹3,411.56. If the user immediately sells those 10 shares, the price drops from ₹3,411.56 with ~0.34% impact, filling at $3411.56 \times (1 - 0.34/200) = ₹3,405.76$. The user loses ₹0.20 on the round trip, completely closing the arbitrage loop.

---

## 9. Verification & Test Suite

Run the full test suite via Maven:

```bash
cd backend
./mvnw test
```

### Acceptance Test Walkthrough (Section A6 Verification)

All 7 acceptance steps from the specification are verified by automated tests in `AcceptanceWalkthroughTest.java`:

```
1. Admin sets TCS = 3400.00. User cash = 10,00,000.00.
2. BUY 10 TCS  -> Impact: 0.3400% | Fill: 3405.78 | Cost: 34057.80 | Cash: 965,942.20 | TCS: 3411.56
3. BUY 5 TCS   -> Impact: 0.1706% | Fill: 3414.47 | Cost: 17072.35 | Cash: 948,869.85 | Avg: 3408.6767 | TCS: 3417.38
4. SELL 4 TCS  -> Impact: 0.1367% | Fill: 3415.04 | Proceeds: 13660.16 | Realized P&L: 25.45 | Cash: 962,530.01 | TCS: 3412.71
5. SELL 20 TCS -> Rejected with 422 INSUFFICIENT_HOLDINGS. Database and price completely unchanged.
6. BUY 100 TCS -> Raw impact 3.41% capped at 2.0000% | Receipt shows impactPct: 2.0 | TCS: 3480.96
7. Verified price_history audit trail contains ADMIN, TRADE_BUY (x2), TRADE_SELL, and DRIFT records.
```

---

## 10. Running Locally

### Backend
```bash
cd backend
./mvnw spring-boot:run
```

### Frontend (Development)
```bash
cd frontend
npm install
npm run dev
```

### Production Build
```bash
cd frontend
npm run build
# Files are placed in dist/ and can be served directly by Spring Boot
```
# Stockplus
