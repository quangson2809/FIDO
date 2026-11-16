package com.fido.modules.pricing;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Tính VND nguyên, kiểm tra tràn số và phân bổ giảm giá xác định; không đọc DB hay đồng hồ. */
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

    /**
     * lines lấy từ giá Product và số lượng giỏ do service đọc lại; requestedDiscount là giảm toàn đơn
     * do voucher tính.
     * shippingFee là phí máy chủ, mọi tiền tính bằng VND nguyên; trả dòng đã phân bổ và tổng khớp
     * nhau.
     */
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
                // Mỗi Product chỉ có một dòng trong giỏ; dòng trùng làm sai phép phân bổ giảm giá.
                throw new PricingException("MONEY_TOTAL_MISMATCH");
            }
            long gross = calculateLineGross(line.unitPrice(), line.quantity());
            subtotal = add(subtotal, gross);
            allocations.add(new Allocation(line, gross, index++));
        }

        // Giảm cố định có thể lớn hơn tiền hàng nhưng tổng giảm thực tế không được vượt subtotal.
        long discount = Math.min(requestedDiscount, subtotal);
        if (subtotal > 0 && discount > 0) {
            long allocatedBase = 0L;
            for (Allocation allocation : allocations) {
                // Chia giảm giá theo tỷ trọng tiền gốc từng dòng; giữ phần dư để xử lý các đồng còn lẻ.
                long numerator = multiply(discount, allocation.gross);
                allocation.discount = numerator / subtotal;
                allocation.remainder = numerator % subtotal;
                allocatedBase = add(allocatedBase, allocation.discount);
            }

            long leftover = discount - allocatedBase;
            List<Allocation> ranked = new ArrayList<>(allocations);
            // Ưu tiên phần dư lớn nhất, bằng nhau chọn Product ID nhỏ hơn để kết quả không phụ thuộc thứ tự giỏ.
            ranked.sort(
                    Comparator.comparingLong((Allocation a) -> a.remainder)
                            .reversed()
                            .thenComparingLong(a -> a.input.productId()));
            if (leftover < 0 || leftover > ranked.size()) {
                throw new PricingException("MONEY_TOTAL_MISMATCH");
            }
            // Phát thêm từng đồng còn dư cho các dòng ưu tiên để tổng giảm dòng đúng bằng giảm toàn đơn.
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

    /**
     * discountType/value và maximumDiscount lấy từ voucher trong DB; subtotal là tiền hàng trước giảm,
     * chưa có ship.
     * FIXED dùng VND, PERCENT dùng basis point (100 = 1%); chặn mức giảm theo cap rồi theo subtotal.
     */
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
                // Cộng nửa mẫu số để làm tròn HALF-UP; phép nhân/cộng vẫn phải kiểm tra tràn số.
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
