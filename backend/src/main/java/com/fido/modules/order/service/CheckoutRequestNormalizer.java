package com.fido.modules.order.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fido.modules.account.service.PhoneNumberCanonicalizer;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.Normalizer;
import java.util.HexFormat;
import java.util.Locale;

/** Canonicalizes checkout's semantic input before reading mutable Cart or catalog state. */
@Component
public class CheckoutRequestNormalizer {
    private static final ObjectMapper JSON = new ObjectMapper();

    private final PhoneNumberCanonicalizer phones;

    public CheckoutRequestNormalizer(PhoneNumberCanonicalizer phones) {
        this.phones = phones;
    }

    public Normalized normalize(
            String recipientName,
            String recipientPhone,
            String province,
            String district,
            String ward,
            String addressLine,
            String voucherCode) {
        String name = requiredText(recipientName, 150);
        String phone;
        try {
            phone = phones.canonicalize(recipientPhone);
        } catch (ResponseStatusException exception) {
            throw validationError();
        }
        String normalizedProvince = requiredText(province, 120);
        String normalizedDistrict = requiredText(district, 120);
        String normalizedWard = requiredText(ward, 120);
        String normalizedAddressLine = requiredText(addressLine, 500);

        String normalizedVoucher = null;
        if (voucherCode != null) {
            String trimmed = Normalizer.normalize(voucherCode, Normalizer.Form.NFC).trim();
            if (trimmed.isEmpty()) {
                throw validationError();
            }
            normalizedVoucher = trimmed.toUpperCase(Locale.ROOT);
            if (normalizedVoucher.codePointCount(0, normalizedVoucher.length()) > 80) {
                throw validationError();
            }
        }

        return new Normalized(
                name, phone, normalizedProvince, normalizedDistrict, normalizedWard,
                normalizedAddressLine, normalizedVoucher);
    }

    /** RFC 8785 field ordering with normalized values and an explicit JSON null for no Voucher. */
    public String fingerprint(Normalized request) {
        try {
            String canonicalJson = "{"
                    + "\"address_line\":" + encode(request.addressLine()) + ","
                    + "\"contract_version\":\"checkout-v1\","
                    + "\"district\":" + encode(request.district()) + ","
                    + "\"province\":" + encode(request.province()) + ","
                    + "\"recipient_name\":" + encode(request.recipientName()) + ","
                    + "\"recipient_phone\":" + encode(request.recipientPhone()) + ","
                    + "\"voucher_code\":" + encode(request.voucherCode()) + ","
                    + "\"ward\":" + encode(request.ward())
                    + "}";
            return sha256(canonicalJson);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not canonicalize checkout request", exception);
        }
    }

    private String requiredText(String raw, int maxLength) {
        if (raw == null) {
            throw validationError();
        }
        String value = Normalizer.normalize(raw, Normalizer.Form.NFC).trim();
        if (value.isEmpty() || value.codePointCount(0, value.length()) > maxLength) {
            throw validationError();
        }
        return value;
    }

    private String encode(String value) throws JsonProcessingException {
        return value == null ? "null" : JSON.writeValueAsString(value);
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private static ResponseStatusException validationError() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR");
    }

    public record Normalized(
            String recipientName,
            String recipientPhone,
            String province,
            String district,
            String ward,
            String addressLine,
            String voucherCode) {}
}
