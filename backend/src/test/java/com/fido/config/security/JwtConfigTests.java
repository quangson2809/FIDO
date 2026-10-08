package com.fido.config.security;

import static org.junit.jupiter.api.Assertions.*;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class JwtConfigTests {
    private static final String DEV = "Zmlkby1sb2NhbC1kZXYtc2lnbmluZy1rZXktZG8tbm90LXVzZS1pbi1wcm9kdWN0aW9uLTIwMjY=";
    private final JwtConfig config = new JwtConfig();

    private MockEnvironment environment(String... profiles) {
        var environment = new MockEnvironment();
        environment.setActiveProfiles(profiles);
        return environment;
    }

    @Test
    void publicKeyRequiresExplicitDevOnlyProfile() {
        assertThrows(IllegalStateException.class, () -> config.jwtKey(DEV, new MockEnvironment()));
        assertThrows(IllegalStateException.class, () -> config.jwtKey(DEV, new MockEnvironment().withProperty("spring.profiles.default", "dev")));
        assertThrows(IllegalStateException.class, () -> config.jwtKey(DEV, environment("prod")));
        assertThrows(IllegalStateException.class, () -> config.jwtKey(DEV, environment("dev", "prod")));
        assertNotNull(config.jwtKey(DEV, environment("dev")));
    }

    @Test
    void missingMalformedOrShortKeyFailsButConfiguredKeyWorks() {
        for (String value : new String[]{"", "not base64", "c2hvcnQ="}) {
            assertThrows(IllegalStateException.class, () -> config.jwtKey(value, new MockEnvironment()));
        }
        assertNotNull(config.jwtKey(Base64.getEncoder().encodeToString(new byte[32]), environment("prod")));
    }
}
