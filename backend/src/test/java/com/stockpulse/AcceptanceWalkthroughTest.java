package com.stockpulse;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stockpulse.auth.dto.LoginRequest;
import com.stockpulse.auth.dto.RegisterRequest;
import com.stockpulse.portfolio.dto.TradeReceipt;
import com.stockpulse.portfolio.dto.TradeRequest;
import com.stockpulse.stock.PriceHistory;
import com.stockpulse.stock.PriceHistoryRepository;
import com.stockpulse.stock.PriceSource;
import com.stockpulse.stock.Stock;
import com.stockpulse.stock.StockRepository;
import com.stockpulse.stock.StockService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "stockpulse.market.impact-enabled=true",
        "stockpulse.market.depth-inr=10000000",
        "stockpulse.market.max-impact-pct=2.0",
        "stockpulse.market.min-price=1.00",
        "stockpulse.market.drift.enabled=false"
})
class AcceptanceWalkthroughTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired StockRepository stockRepository;
    @Autowired StockService stockService;
    @Autowired PriceHistoryRepository priceHistoryRepository;

    @Test
    @DisplayName("Complete Section A6 Acceptance Walk-Through Verification")
    void testAcceptanceWalkThrough() throws Exception {
        // ── 1. Admin sets TCS = 3400.00. New user has cash 10,00,000 ─────────────
        Stock tcs = stockRepository.findBySymbol("TCS").orElseGet(() -> {
            Stock s = new Stock();
            s.setSymbol("TCS");
            s.setCompanyName("Tata Consultancy Services");
            s.setSector("IT");
            s.setCurrentPrice(new BigDecimal("3400.00"));
            s.setPreviousClose(new BigDecimal("3380.00"));
            s.setBasePrice(new BigDecimal("3400.00"));
            return stockRepository.save(s);
        });

        stockService.setPrice("TCS", new BigDecimal("3400.00"));

        // Register new user with 10,00,000 cash
        String email = "acceptance_" + System.currentTimeMillis() + "@test.com";
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RegisterRequest("Acceptance User", email, "Pass@1234"))))
                .andExpect(status().isCreated());

        MvcResult loginRes = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(email, "Pass@1234"))))
                .andExpect(status().isOk())
                .andReturn();

        String token = objectMapper.readTree(loginRes.getResponse().getContentAsString()).get("token").asText();

        // ── 2. BUY 10 TCS ────────────────────────────────────────────────────────
        // tradeValue 34,000 gives impact 0.34%. Fill 3405.78, cost 34,057.80, cash 965,942.20, avg 3405.78. TCS becomes 3411.56
        MvcResult buy1Result = mockMvc.perform(post("/api/portfolio/buy")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TradeRequest("TCS", 10))))
                .andExpect(status().isOk())
                .andReturn();

        TradeReceipt r1 = objectMapper.readValue(buy1Result.getResponse().getContentAsString(), TradeReceipt.class);
        assertThat(r1.impactPct()).isEqualByComparingTo("0.3400");
        assertThat(r1.executionPrice()).isEqualByComparingTo("3405.78");
        assertThat(r1.totalAmount()).isEqualByComparingTo("34057.80");
        assertThat(r1.cashBalance()).isEqualByComparingTo("965942.20");
        assertThat(r1.newAverageBuyPrice()).isEqualByComparingTo("3405.7800");
        assertThat(r1.newQuantity()).isEqualTo(10);
        assertThat(r1.priceBefore()).isEqualByComparingTo("3400.00");
        assertThat(r1.priceAfter()).isEqualByComparingTo("3411.56");

        tcs = stockRepository.findBySymbol("TCS").orElseThrow();
        assertThat(tcs.getCurrentPrice()).isEqualByComparingTo("3411.56");

        // ── 3. BUY 5 TCS ─────────────────────────────────────────────────────────
        // Impact 0.1706%. Fill 3414.47, cost 17,072.35, cash 948,869.85, qty 15, avg 3408.6767. TCS becomes 3417.38
        MvcResult buy2Result = mockMvc.perform(post("/api/portfolio/buy")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TradeRequest("TCS", 5))))
                .andExpect(status().isOk())
                .andReturn();

        TradeReceipt r2 = objectMapper.readValue(buy2Result.getResponse().getContentAsString(), TradeReceipt.class);
        assertThat(r2.impactPct()).isEqualByComparingTo("0.1706");
        assertThat(r2.executionPrice()).isEqualByComparingTo("3414.47");
        assertThat(r2.totalAmount()).isEqualByComparingTo("17072.35");
        assertThat(r2.cashBalance()).isEqualByComparingTo("948869.85");
        assertThat(r2.newAverageBuyPrice()).isEqualByComparingTo("3408.6767");
        assertThat(r2.newQuantity()).isEqualTo(15);
        assertThat(r2.priceAfter()).isEqualByComparingTo("3417.38");

        tcs = stockRepository.findBySymbol("TCS").orElseThrow();
        assertThat(tcs.getCurrentPrice()).isEqualByComparingTo("3417.38");

        // ── 4. SELL 4 TCS ────────────────────────────────────────────────────────
        // Impact 0.1367%. Fill 3415.04, proceeds 13,660.16, realized P&L ≈ 25.45, cash 962,530.01, qty 11, avg unchanged 3408.6767. TCS becomes 3412.71
        MvcResult sell1Result = mockMvc.perform(post("/api/portfolio/sell")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TradeRequest("TCS", 4))))
                .andExpect(status().isOk())
                .andReturn();

        TradeReceipt r3 = objectMapper.readValue(sell1Result.getResponse().getContentAsString(), TradeReceipt.class);
        assertThat(r3.impactPct()).isEqualByComparingTo("0.1367");
        assertThat(r3.executionPrice()).isEqualByComparingTo("3415.04");
        assertThat(r3.totalAmount()).isEqualByComparingTo("13660.16");
        assertThat(r3.realizedPnl()).isEqualByComparingTo("25.45");
        assertThat(r3.cashBalance()).isEqualByComparingTo("962530.01");
        assertThat(r3.newAverageBuyPrice()).isEqualByComparingTo("3408.6767");
        assertThat(r3.newQuantity()).isEqualTo(11);
        assertThat(r3.priceAfter()).isEqualByComparingTo("3412.71");

        tcs = stockRepository.findBySymbol("TCS").orElseThrow();
        assertThat(tcs.getCurrentPrice()).isEqualByComparingTo("3412.71");

        // ── 5. SELL 20 TCS gives 422 INSUFFICIENT_HOLDINGS ───────────────────────
        mockMvc.perform(post("/api/portfolio/sell")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TradeRequest("TCS", 20))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error", is("INSUFFICIENT_HOLDINGS")));

        // Database, cash, and price all unchanged
        tcs = stockRepository.findBySymbol("TCS").orElseThrow();
        assertThat(tcs.getCurrentPrice()).isEqualByComparingTo("3412.71");

        // ── 6. BUY 100 TCS: raw impact 3.41% is capped at 2% ─────────────────────
        MvcResult buy3Result = mockMvc.perform(post("/api/portfolio/buy")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TradeRequest("TCS", 100))))
                .andExpect(status().isOk())
                .andReturn();

        TradeReceipt r4 = objectMapper.readValue(buy3Result.getResponse().getContentAsString(), TradeReceipt.class);
        assertThat(r4.impactPct()).isEqualByComparingTo("2.0000");

        // ── 7. price_history contains rows with sources ADMIN, TRADE_BUY ×2, TRADE_SELL
        List<PriceHistory> history = priceHistoryRepository.findByStockSymbolOrderByRecordedAtAsc("TCS");
        List<PriceSource> sources = history.stream().map(PriceHistory::getSource).toList();

        assertThat(sources).contains(PriceSource.ADMIN, PriceSource.TRADE_BUY, PriceSource.TRADE_SELL);
    }
}
