package com.fido.modules.account;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fido.modules.account.service.PhoneNumberCanonicalizer;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class PhoneNumberCanonicalizerTests {
    private final PhoneNumberCanonicalizer phones = new PhoneNumberCanonicalizer();

    @Test
    void canonicalizesNationalAndInternationalNumbers() {
        assertEquals("+84912345678", phones.canonicalize("0912345678"));
        assertEquals("+84912345678", phones.canonicalize(" +84912345678 "));
        assertEquals("+84912345678", phones.canonicalize("(091)234-5678"));
        assertEquals("+84912345678", phones.canonicalize("0 912 345 678"));
        assertEquals("+84912345678", phones.canonicalize("+84 91 234 5678"));
    }

    @Test
    void legacyLookupChecksBothRepresentations() {
        assertEquals(
                java.util.List.of("+84912345678", "0912345678"),
                phones.lookupValues("0912345678"));
    }

    @Test
    void rejectsUnsupportedPhoneFormats() {
        for (String value : java.util.List.of("", "09123", "84912345678", "+840912345678")) {
            assertThrows(ResponseStatusException.class, () -> phones.canonicalize(value), value);
        }
        assertThrows(ResponseStatusException.class, () -> phones.canonicalize(null));
    }
}
