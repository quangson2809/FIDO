package com.fido.persistence;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

/**
 * Static guard for Phase 1 migration-preparation artifacts.
 *
 * These checks do not execute SQL or prove that it runs against MySQL. They protect the
 * preflight/fixture safety contract until a dedicated isolated-database rehearsal is run.
 */
class Phase1PreflightArtifactTests {

    @Test
    void sourcePreflightContainsOnlyReadOnlySelectStatements() throws IOException {
        List<String> statements = sqlStatements("/refactor/phase-1-source-preflight.sql");

        assertTrue(statements.size() >= 70, "Preflight diagnostics should remain comprehensive");
        for (String statement : statements) {
            String normalized = statement.strip().toUpperCase(Locale.ROOT);
            assertTrue(
                    normalized.startsWith("SELECT "),
                    () -> "Preflight must contain only SELECT statements; found: "
                            + normalized.substring(0, Math.min(normalized.length(), 60)));
            assertFalse(
                    normalized.matches("(?s).*(INSERT\\s+INTO|UPDATE\\s+\\w+|DELETE\\s+FROM|"
                            + "REPLACE\\s+INTO|ALTER\\s+TABLE|CREATE\\s+\\w+|DROP\\s+\\w+|"
                            + "TRUNCATE\\s+\\w+).*"),
                    "Preflight must not contain a data/schema mutation");
        }
    }

    @Test
    void syntheticFixtureContainsOnlyInsertStatements() throws IOException {
        List<String> statements = sqlStatements("/refactor/phase-1-source-fixture.sql");

        assertEquals(31, statements.size(), "Review this count whenever fixture statements change");
        for (String statement : statements) {
            String normalized = statement.strip().toUpperCase(Locale.ROOT);
            assertTrue(normalized.startsWith("INSERT INTO "), "Fixture must remain INSERT-only");
            assertFalse(
                    normalized.matches("(?s).*(DELETE\\s+FROM|UPDATE\\s+\\w+|REPLACE\\s+INTO|"
                            + "ALTER\\s+TABLE|CREATE\\s+\\w+|DROP\\s+\\w+|TRUNCATE\\s+\\w+).*"),
                    "Fixture must not contain destructive SQL");
        }
    }

    @Test
    void syntheticFixtureCoversKeyMigrationBlockers() throws IOException {
        String fixture = resourceText("/refactor/phase-1-source-fixture.sql");

        assertTrue(fixture.contains("example.invalid"), "Fixture contact values must stay synthetic");
        assertTrue(fixture.contains("image_url_snapshot"), "Include a legacy order-image snapshot");
        assertTrue(fixture.contains("alt_text"), "Include legacy image alt text");
        assertTrue(fixture.contains("voucher_products"), "Include voucher scope links");
        assertTrue(fixture.contains("voucher_usages"), "Include voucher usage history");
        assertTrue(fixture.contains("checkout_quotes"), "Include legacy checkout quotes");
        assertTrue(fixture.contains("amount_refunded"), "Include aggregate refund facts");
        assertTrue(fixture.contains("Synthetic source-only supplier note"));
        assertTrue(fixture.contains("Synthetic free-form audit description"));
        assertTrue(fixture.contains("only variant 9001 has an Inventory row"));
    }

    private static List<String> sqlStatements(String resourceName) throws IOException {
        String withoutLineComments = resourceText(resourceName).lines()
                .filter(line -> !line.stripLeading().startsWith("--"))
                .collect(Collectors.joining("\n"));

        return Arrays.stream(withoutLineComments.split(";"))
                .map(String::strip)
                .filter(statement -> !statement.isEmpty())
                .collect(Collectors.toList());
    }

    private static String resourceText(String resourceName) throws IOException {
        try (InputStream input = Objects.requireNonNull(
                Phase1PreflightArtifactTests.class.getResourceAsStream(resourceName),
                () -> "Missing test resource: " + resourceName)) {
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
