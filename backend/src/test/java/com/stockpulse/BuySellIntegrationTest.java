package com.stockpulse;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stockpulse.auth.dto.LoginRequest;
import com.stockpulse.auth.dto.RegisterRequest;
import com.stockpulse.portfolio.dto.TradeRequest;
import com.stockpulse.stock.Stock;
import com.stockpulse.stock.StockRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class BuySellIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired StockRepository stockRepository;

    String token;

    @BeforeEach
    void setUp() throws Exception {
        // Ensure TCS stock exists in H2
        if (!stockRepository.existsBySymbol("TCS")) {
            Stock tcs = new Stock();
            tcs.setSymbol("TCS");
            tcs.setCompanyName("Tata Consultancy Services");
            tcs.setSector("IT");
            tcs.setCurrentPrice(new BigDecimal("3400.0000"));
            tcs.setPreviousClose(new BigDecimal("3380.0000"));
            stockRepository.save(tcs);
        } else {
            stockRepository.findBySymbol("TCS").ifPresent(s -> {
                s.setCurrentPrice(new BigDecimal("3400.0000"));
                stockRepository.save(s);
            });
        }

        // Register + login a fresh user
        String uniqueEmail = "inttest+" + System.currentTimeMillis() + "@test.com";
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                        new RegisterRequest("IntTest", uniqueEmail, "Password@1"))))
                .andExpect(status().isCreated());

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                        new LoginRequest(uniqueEmail, "Password@1"))))
                .andExpect(status().isOk())
                .andReturn();

        token = objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .get("token").asText();
    }

    @Test
    void buyThenSell_correctNumbersAndRealizedPnl() throws Exception {
        // BUY 10 TCS @ 3400
        mockMvc.perform(post("/api/portfolio/buy")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new TradeRequest("TCS", 10))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.newCashBalance", closeTo(966000.0, 0.01)))
                .andExpect(jsonPath("$.newAverageBuyPrice", closeTo(3400.0, 0.001)))
                .andExpect(jsonPath("$.newQuantity", is(10)));

        // Update TCS price to 3550 (simulate admin price set in test)
        stockRepository.findBySymbol("TCS").ifPresent(s -> {
            s.setCurrentPrice(new BigDecimal("3550.0000"));
            stockRepository.save(s);
        });

        // SELL 4 TCS @ 3550
        // realizedPnl = (3550 - 3400) * 4 = 150 * 4 = 600.0000
        mockMvc.perform(post("/api/portfolio/sell")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new TradeRequest("TCS", 4))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.realizedPnl", closeTo(600.0, 0.01)))
                .andExpect(jsonPath("$.newQuantity", is(6)));

        // SELL more than owned → 422
        mockMvc.perform(post("/api/portfolio/sell")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new TradeRequest("TCS", 100))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error", is("INSUFFICIENT_HOLDINGS")));

        // Portfolio should still show 6 shares
        mockMvc.perform(get("/api/portfolio")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.holdings[0].quantity", is(6)));
    }

    @Test
    void buy_insufficientFunds_returns422() throws Exception {
        // Try to buy 1000 TCS @ 3400 = ₹3,400,000 — more than ₹10,00,000
        mockMvc.perform(post("/api/portfolio/buy")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new TradeRequest("TCS", 1000))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error", is("INSUFFICIENT_FUNDS")));
    }

    @Test
    void unauthenticated_request_returns401Json() throws Exception {
        mockMvc.perform(get("/api/portfolio"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error", is("UNAUTHORIZED")));
    }
}
