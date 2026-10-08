package com.fido.config;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.WebApplicationType;

class ExternalEnvironmentConfigTests {
    @Test
    void importedEnvFileSelectsDevelopmentProfileAndBindsJwtSettings(@TempDir Path directory)
            throws Exception {
        String encodedKey = Base64.getEncoder().encodeToString(new byte[32]);
        Path envFile = directory.resolve("backend.env");
        Files.writeString(envFile,
                "SPRING_PROFILES_ACTIVE=dev\n"
                        + "JWT_SECRET_BASE64=" + encodedKey + "\n"
                        + "JWT_ISSUER=local-fido\n");

        var application = new SpringApplication(IsolatedConfiguration.class);
        application.setWebApplicationType(WebApplicationType.NONE);

        try (var context = application.run(
                "--spring.config.import=" + envFile.toUri() + "[.properties]",
                "--spring.main.banner-mode=off"
        )) {
            var environment = context.getEnvironment();
            assertArrayEquals(new String[]{"dev"}, environment.getActiveProfiles());
            assertEquals(encodedKey, environment.getProperty("app.jwt.secret-base64"));
            assertEquals("local-fido", environment.getProperty("app.jwt.issuer"));
        }
    }

    @SpringBootConfiguration
    static class IsolatedConfiguration {
    }
}
