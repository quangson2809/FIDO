package com.fido.config.security;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Base64;
import org.junit.jupiter.api.Test;

class JwtConfigTests {
    private final JwtConfig config = new JwtConfig();

    @Test
    void missingMalformedOrShortKeyFails() {
        for (String value : new String[]{"", " ", "not base64", "c2hvcnQ="}) {
            assertThrows(IllegalStateException.class, () -> config.jwtKey(value));
        }
        assertThrows(IllegalStateException.class, () -> config.jwtKey(null));
    }

    @Test
    void previouslyPublishedDevelopmentKeyIsAlwaysRejected() {
        String published = "Zmlkby1sb2NhbC1kZXYtc2lnbmluZy1rZXktZG8tbm90LXVzZS1pbi1wcm9kdWN0aW9uLTIwMjY=";
        assertThrows(IllegalStateException.class, () -> config.jwtKey(published));
    }

    @Test
    void validExternalKeyWorksWithoutADevelopmentFallback() {
        String configuredKey = Base64.getEncoder().encodeToString(new byte[32]);
        assertNotNull(config.jwtKey(configuredKey));
    }
}
