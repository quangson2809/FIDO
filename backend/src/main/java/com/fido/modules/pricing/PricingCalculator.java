package com.fido.modules.pricing;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Pure arithmetic for the FIDO integer-VND contract.
 *
 * <p>This class has no Spring, persistence, clock, locale, or I/O dependency. It uses checked
 * signed-BIGINT arithmetic for every intermediate monetary product/sum and deterministic
 * largest-remainder allocation.
 */
public final class PricingCalculator {
    private static final long BASIS_POINTS = 10_000L;
    private static final long HALF_UP_BIAS = 5_000L;

    public record LineInput(Long productId, Long unitPrice, Integer quantity) {}

    public record PricedLine(
            Long productId,
            Long unitPrice,
            Integer quantity,
            long grossAmount,
            long discountAmount,
            long lineTotal) {}

    public record PricingResult(
            List<PricedLine> lines,
            long subtotal,
            long discountAmount,
            long shippingFee,
            long total) {
        public PricingResult {
            lines = List.copyOf(lines);
        }
    }

    private static final class Allocation {
        private final LineInput input;
        private final long gross;
        private final int originalIndex;
        private long discount;
        private long remainder;

        private Allocation(LineInput input, long gross, int originalIndex) {
            this.input = input;
            this.gross = gross;
            this.originalIndex = originalIndex;
        }
    }

    public PricingResult calculate(List<LineInput> lines, long requestedDiscount, long shippingFee) {
        if (lines == null) {
            throw new PricingException("VALIDATION_ERROR");
        }
        if (requestedDiscount < 0 || shippingFee < 0) {
            throw new PricingException("VALIDATION_ERROR");
        }

        List<Allocation> allocations = new ArrayList<>(lines.size());
        Set<Long> productIds = new HashSet<>();
        long subtotal = 0L;
        int index = 0;
        for (LineInput line : lines) {
            validateLine(line);
            if (!productIds.add(line.productId())) {
                // The approved Cart key is (Cart, Product); duplicate Product lines are invalid.
                throw new PricingException("MONEY_TOTAL_MISMATCH");
            }
            long gross = calculateLineGross(line.unitPrice(), line.quantity());
            subtotal = add(subtotal, gross);
            allocations.add(new Allocation(line, gross, index++));
        }

        // A fixed voucher can exceed merchandise subtotal, but may never create a negative line.
        long discount = Math.min(requestedDiscount, subtotal);
        if (subtotal > 0 && discount > 0) {
            long allocatedBase = 0L;
            for (Allocation allocation : allocations) {
                long numerator = multiply(discount, allocation.gross);
                allocation.discount = numerator / subtotal;
                allocation.remainder = numerator % subtotal;
                allocatedBase = add(allocatedBase, allocation.discount);
            }

            long leftover = discount - allocatedBase;
            List<Allocation> ranked = new ArrayList<>(allocations);
            ranked.sort(
                    Comparator.comparingLong((Allocation a) -> a.remainder)
                            .reversed()
                            .thenComparingLong(a -> a.input.productId()));
            if (leftover < 0 || leftover > ranked.size()) {
                throw new PricingException("MONEY_TOTAL_MISMATCH");
            }
            for (int i = 0; i < (int) leftover; i++) {
                ranked.get(i).discount = add(ranked.get(i).discount, 1L);
            }
        }

        List<PricedLine> pricedLines = new ArrayList<>(allocations.size());
        for (Allocation allocation : allocations) {
            if (allocation.discount < 0 || allocation.discount > allocation.gross) {
                throw new PricingException("MONEY_TOTAL_MISMATCH");
            }
            pricedLines.add(
                    new PricedLine(
                            allocation.input.productId(),
                            allocation.input.unitPrice(),
                            allocation.input.quantity(),
                            allocation.gross,
                            allocation.discount,
                            allocation.gross - allocation.discount));
        }

        long sumLineDiscounts = 0L;
        long sumLineTotals = 0L;
        for (PricedLine line : pricedLines) {
            sumLineDiscounts = add(sumLineDiscounts, line.discountAmount());
            sumLineTotals = add(sumLineTotals, line.lineTotal());
        }
        if (sumLineDiscounts != discount || sumLineTotals != subtotal - discount) {
            throw new PricingException("MONEY_TOTAL_MISMATCH");
        }
        long total = add(subtotal - discount, shippingFee);
        return new PricingResult(pricedLines, subtotal, discount, shippingFee, total);
    }

    public long calculateSubtotal(List<LineInput> lines) {
        return calculate(lines, 0L, 0L).subtotal();
    }

    public long calculateLineGross(Long unitPrice, Integer quantity) {
        if (unitPrice == null || quantity == null || unitPrice < 0 || quantity <= 0) {
            throw new PricingException("VALIDATION_ERROR");
        }
        return multiply(unitPrice, quantity.longValue());
    }

    /** Returns the order-wide integer-VND voucher amount before line allocation. */
    public long calculateDiscountAmount(
            String discountType, Long discountValue, Long maximumDiscount, long subtotal) {
        if (subtotal < 0 || discountValue == null || discountValue <= 0
                || (maximumDiscount != null && maximumDiscount < 0)) {
            throw new PricingException("VOUCHER_CONFIGURATION_INVALID");
        }

        long candidate;
        if ("FIXED".equals(discountType)) {
            candidate = discountValue;
        } else if ("PERCENT".equals(discountType)) {
            if (discountValue < 1 || discountValue > BASIS_POINTS) {
                throw new PricingException("VOUCHER_CONFIGURATION_INVALID");
            }
            if (subtotal == 0) {
                candidate = 0L;
            } else {
                // HALF-UP for non-negative integer ratios; intermediate overflow is rejected.
                long numerator = add(multiply(subtotal, discountValue), HALF_UP_BIAS);
                candidate = numerator / BASIS_POINTS;
            }
        } else {
            throw new PricingException("VOUCHER_CONFIGURATION_INVALID");
        }

        if (maximumDiscount != null) {
            candidate = Math.min(candidate, maximumDiscount);
        }
        return Math.min(candidate, subtotal);
    }

    public long sumAmounts(List<Long> amounts) {
        if (amounts == null) {
            throw new PricingException("VALIDATION_ERROR");
        }
        long total = 0L;
        for (Long amount : amounts) {
            if (amount == null || amount < 0) {
                throw new PricingException("VALIDATION_ERROR");
            }
            total = add(total, amount);
        }
        return total;
    }

    private void validateLine(LineInput line) {
        if (line == null
                || line.productId() == null
                || line.productId() <= 0
                || line.unitPrice() == null
                || line.unitPrice() < 0
                || line.quantity() == null
                || line.quantity() <= 0) {
            throw new PricingException("VALIDATION_ERROR");
        }
    }

    private long add(long left, long right) {
        try {
            return Math.addExact(left, right);
        } catch (ArithmeticException ex) {
            throw new PricingException("MONEY_OVERFLOW");
        }
    }

    private long multiply(long left, long right) {
        try {
            return Math.multiplyExact(left, right);
        } catch (ArithmeticException ex) {
            throw new PricingException("MONEY_OVERFLOW");
        }
    }
}
