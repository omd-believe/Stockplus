package com.stockpulse.portfolio;

import com.stockpulse.portfolio.dto.HoldingDto;
import com.stockpulse.portfolio.dto.PortfolioSummary;
import com.stockpulse.transaction.TransactionRepository;
import com.stockpulse.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class PortfolioService {

    private final HoldingRepository holdingRepository;
    private final TransactionRepository transactionRepository;

    public PortfolioService(HoldingRepository holdingRepository,
                            TransactionRepository transactionRepository) {
        this.holdingRepository = holdingRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional(readOnly = true)
    public PortfolioSummary getSummary(User user) {
        List<Holding> holdings = holdingRepository.findByUserId(user.getId());
        BigDecimal totalRealizedPnl = transactionRepository.sumRealizedPnlByUserId(user.getId());

        if (holdings.isEmpty()) {
            return new PortfolioSummary(
                    user.getCashBalance(),
                    BigDecimal.ZERO, BigDecimal.ZERO,
                    BigDecimal.ZERO, BigDecimal.ZERO,
                    totalRealizedPnl,
                    user.getCashBalance(), // netWorth = cash when no holdings
                    BigDecimal.ZERO,
                    List.of()
            );
        }

        // Total holdings value for allocation % calculation
        BigDecimal holdingsValue = holdings.stream()
                .map(h -> h.getStock().getCurrentPrice()
                        .multiply(BigDecimal.valueOf(h.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<HoldingDto> holdingDtos = holdings.stream()
                .map(h -> toHoldingDto(h, holdingsValue))
                .toList();

        BigDecimal totalInvested = holdingDtos.stream()
                .map(HoldingDto::invested)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalUnrealizedPnl = holdingDtos.stream()
                .map(HoldingDto::unrealizedPnl)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalUnrealizedPnlPct = totalInvested.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : totalUnrealizedPnl.divide(totalInvested, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));

        BigDecimal dayChange = holdingDtos.stream()
                .map(HoldingDto::dayChange)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal netWorth = user.getCashBalance().add(holdingsValue);

        return new PortfolioSummary(
                user.getCashBalance(),
                totalInvested,
                holdingsValue,
                totalUnrealizedPnl,
                totalUnrealizedPnlPct,
                totalRealizedPnl,
                netWorth,
                dayChange,
                holdingDtos
        );
    }

    private HoldingDto toHoldingDto(Holding h, BigDecimal totalHoldingsValue) {
        BigDecimal qty = BigDecimal.valueOf(h.getQuantity());
        BigDecimal currentPrice = h.getStock().getCurrentPrice();
        BigDecimal prevClose = h.getStock().getPreviousClose();

        BigDecimal invested = h.getAverageBuyPrice().multiply(qty).setScale(4, RoundingMode.HALF_UP);
        BigDecimal currentValue = currentPrice.multiply(qty).setScale(4, RoundingMode.HALF_UP);
        BigDecimal unrealizedPnl = currentValue.subtract(invested);
        BigDecimal unrealizedPnlPct = invested.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : unrealizedPnl.divide(invested, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
        BigDecimal dayChange = currentPrice.subtract(prevClose).multiply(qty).setScale(4, RoundingMode.HALF_UP);
        BigDecimal allocationPct = totalHoldingsValue.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : currentValue.divide(totalHoldingsValue, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));

        return new HoldingDto(
                h.getStock().getSymbol(),
                h.getStock().getCompanyName(),
                h.getStock().getSector(),
                h.getQuantity(),
                h.getAverageBuyPrice(),
                currentPrice,
                invested,
                currentValue,
                unrealizedPnl,
                unrealizedPnlPct,
                dayChange,
                allocationPct
        );
    }
}
