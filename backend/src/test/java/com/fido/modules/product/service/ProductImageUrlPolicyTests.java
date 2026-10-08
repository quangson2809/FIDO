package com.fido.modules.product.service;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

class ProductImageUrlPolicyTests {
    @Test
    void acceptsHttpsWithoutInventingProviderHostAllowlist() {
        assertTrue(ProductImageUrlPolicy.isValid("https://i.ibb.co/test/image.png"));
        assertTrue(ProductImageUrlPolicy.isValid("https://example.test/image.png?version=2"));
    }

    @Test
    void rejectsUnsafeAndMalformedUris() {
        for (String value : new String[]{"http://example.test/x", "javascript:alert(1)", "data:image/png;base64,x", "//example.test/x", "https:/x", "https://", "https://user:password@example.test/x", "https://example.test/a b", "https://example.test:99999/x", "https://example.test/x#fragment"}) {
            assertFalse(ProductImageUrlPolicy.isValid(value), value);
        }
    }
}
