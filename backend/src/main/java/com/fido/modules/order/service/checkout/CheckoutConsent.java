package com.fido.modules.order.service.checkout;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Comparator;
import java.util.HexFormat;

final class CheckoutConsent {
    private CheckoutConsent() {}

    static String token(CheckoutCalculation c) {
        StringBuilder canonical = new StringBuilder("checkout-consent-v1:");
        canonical
                .append(c.subtotal())
                .append(':')
                .append(c.discount())
                .append(':')
                .append(c.shippingFee())
                .append(':')
                .append(c.total())
                .append(':')
                .append(c.voucher().voucherId())
                .append(':')
                .append(c.voucher().code());
        c.items().stream()
                .sorted(Comparator.comparing(i -> i.productId()))
                .forEach(
                        i -> {
                            var line = c.lineFor(i.productId());
                            canonical
                                    .append(';')
                                    .append(i.productId())
                                    .append(':')
                                    .append(i.quantity())
                                    .append(':')
                                    .append(i.unitPrice())
                                    .append(':')
                                    .append(line.discountAmount())
                                    .append(':')
                                    .append(line.lineTotal());
                        });
        try {
            return HexFormat.of()
                    .formatHex(
                            MessageDigest.getInstance("SHA-256")
                                    .digest(canonical.toString().getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
    }
}
