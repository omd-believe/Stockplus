# StockPulse – Evaluator Q&A

Concise answers for the 5–7 minute demo. Read these the night before.

---

**Q1. Why `BigDecimal` instead of `double` for money?**

`double` is a binary floating-point type. `0.1 + 0.2` in `double` gives `0.30000000000000004`. For financial calculations, rounding errors compound across trades and make the numbers wrong. `BigDecimal` gives exact decimal arithmetic with explicit scale (4 dp) and `RoundingMode.HALF_UP`, which matches how banks calculate.

---

**Q2. What does `@Transactional` do, and what triggers a rollback?**

`@Transactional` wraps the method in a database transaction. If the method completes normally, the transaction commits (cash deducted + holding updated + transaction row inserted happen atomically). If any unchecked exception (`RuntimeException` or subclass) propagates out of the method, Spring rolls back **all three** changes. So a failed BUY never leaves the user with less cash and no holding.

---

**Q3. Why pessimistic locking? What race condition does it prevent?**

Without locking, two concurrent BUY requests for the same user could both read `cashBalance = 10,00,000`, both compute `cost < balance`, and both deduct — leaving the user with `balance - 2*cost` without the safety check catching the second request. `findByIdWithLock` issues `SELECT … FOR UPDATE`, which blocks the second request until the first transaction commits. This serialises trades per user at the DB level.

---

**Q4. `@Transactional` self-invocation pitfall — what is it?**

Spring's `@Transactional` works via a proxy. If method A (non-transactional) calls `this.buy(…)` (transactional) inside the same class, it bypasses the proxy — no transaction starts. The fix: inject the service into itself, or move the inner method to a separate `@Service` class. In StockPulse, `TradeService.buy/sell` are always called through the proxy (from the controller), so this pitfall doesn't apply.

---

**Q5. How does JWT validation work?**

1. `JwtAuthFilter` intercepts every request, extracts the `Authorization: Bearer <token>` header.
2. `JwtService.isTokenValid()` uses jjwt's `Jwts.parser().verifyWith(signingKey)` to verify the HMAC-SHA signature and check expiry — all in one call.
3. On success, the user's ID is read from the `sub` claim, the user loaded from the DB, and set in `SecurityContextHolder`.
4. If validation fails, a JSON `401` is returned immediately — never HTML.

---

**Q6. Why return DTOs instead of JPA entities from controllers?**

- **Security:** Entities might expose fields you don't want serialised (e.g., `passwordHash`).
- **Stability:** API consumers see a stable contract; you can change the entity without breaking the API.
- **Circular refs:** JPA entities with bidirectional relationships cause infinite serialisation loops unless you add `@JsonIgnore`, making the entity messy.
- **Separation of concerns:** Entities belong to the persistence layer; the API layer should own its own contract.

---

**Q7. What is the N+1 problem? How do you avoid it for holdings?**

Without care, loading 10 holdings would execute 1 query for the list + 10 queries for each stock (`SELECT * FROM stocks WHERE id = ?` × 10). `@EntityGraph(attributePaths = "stock")` on `HoldingRepository.findByUserId` tells Hibernate to JOIN-FETCH the stock in the same query — 1 query total.

---

**Q8. Why Flyway instead of `ddl-auto: create`?**

`ddl-auto: create` wipes the schema on every restart. Flyway applies versioned SQL migrations (V1, V2, …) that are idempotent — once applied they're never re-run. This means you get a safe, repeatable, auditable schema evolution across environments, with rollback scripts possible for each version.

---

**Q9. Average-cost vs FIFO — what's the trade-off?**

| | Average-Cost | FIFO |
|---|---|---|
| Complexity | One number per holding | Queue of tax lots |
| Realised P&L | One number per sell | Different P&L per lot |
| Tax accuracy | Less accurate for long-term/short-term | More accurate |
| Used by | Most Indian brokers | US brokers, tax-sensitive |

Average-cost is simpler and sufficient for a portfolio tracker prototype.

---

**Q10. Prices are simulated — how would you plug in a real feed?**

The `PriceProvider` interface is the seam. Today `SimulatedPriceProvider` reads from the DB. To use a live feed:

```java
@Component @Primary
class NSELivePriceProvider implements PriceProvider {
    public BigDecimal getPrice(String symbol) {
        // call NSE/BSE API, parse JSON, return price
    }
}
```

Zero changes to `TradeService` or `PortfolioService`. This is the **Open/Closed Principle** in action.

---

**Q11. How would you scale this horizontally?**

Current bottleneck: pessimistic locking works within one DB connection. To scale:
1. **Move to optimistic locking** (`@Version` on User entity) — retry on conflict, better throughput.
2. **Separate read/write data sources** — portfolio summary reads can go to a replica.
3. **Cache stock prices** in Redis with short TTL (1–5s) — reduces DB load for `/stocks` queries.
4. **Extract a trade-processing service** behind a queue (Kafka) to handle burst traffic without blocking.

---

**Q12. What tests did you write?**

- **Unit tests (TradeService):** first BUY average, second BUY weighted average, insufficient funds throws without side effects, partial SELL P&L, sell-more-than-owned throws, all-shares SELL deletes holding.
- **Unit tests (RiskAnalysisService):** empty portfolio, single holding, stock concentration > 40%, sector concentration > 60%, balanced portfolio (no warnings), diversification score formula.
- **Integration test (BuySellIntegrationTest):** full BUY → price update → SELL → 422 overflow → portfolio check; all against real Spring context with H2.

---

**Q13. Why H2 for tests instead of Testcontainers?**

H2 starts in milliseconds with no Docker dependency. The `MODE=PostgreSQL` flag makes H2 understand most PostgreSQL syntax. For this project the SQL is simple enough that H2 compatibility is complete. Testcontainers would give higher fidelity (real Postgres) but adds Docker as a test dependency and 5–10s startup time per test run.

---

**Q14. What would you do differently if you had more time?**

- **Optimistic locking** instead of pessimistic (better for high-concurrency)
- **Integration tests with Testcontainers** (real Postgres, not H2)
- **Portfolio history table** — store net worth snapshots daily for a P&L chart
- **Idempotency key** on trades (prevent double-submit from retried HTTP requests)
- **Password reset / email verification** (didn't scope it)

---

**Q15. A user calls `/api/portfolio/buy` twice simultaneously with the same amount — what happens?**

Both requests hit `TradeService.buy()` concurrently. Both try to acquire the pessimistic write lock on the user row (`SELECT … FOR UPDATE`). One gets the lock, checks balance, deducts, commits. The second then gets the lock, sees the already-reduced balance, and if the balance is now insufficient it throws `InsufficientFundsException` (HTTP 422). The database is always consistent — no double-spend.
