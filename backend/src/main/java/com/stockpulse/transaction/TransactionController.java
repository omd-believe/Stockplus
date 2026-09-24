package com.stockpulse.transaction;

import com.stockpulse.user.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/transactions")
@Tag(name = "Transactions", description = "Transaction history")
public class TransactionController {

    private final TransactionRepository transactionRepository;

    public TransactionController(TransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    @GetMapping
    @Operation(summary = "Get paginated transaction history for current user, optionally filtered by symbol")
    public ResponseEntity<Page<TransactionDto>> getTransactions(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String symbol,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<Transaction> txPage;
        PageRequest pageRequest = PageRequest.of(page, size);

        if (symbol != null && !symbol.isBlank()) {
            txPage = transactionRepository.findByUserIdAndStockSymbolOrderByCreatedAtDesc(
                    user.getId(), symbol.trim().toUpperCase(), pageRequest);
        } else {
            txPage = transactionRepository.findByUserIdOrderByCreatedAtDesc(
                    user.getId(), pageRequest);
        }

        return ResponseEntity.ok(txPage.map(TransactionDto::from));
    }
}
