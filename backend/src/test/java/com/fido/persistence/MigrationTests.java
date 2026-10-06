package com.fido.persistence;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@ActiveProfiles("test")
class MigrationTests {
    @Autowired Flyway flyway;

    @Test
    void validatesAndDoesNotReapplyMigrationsOnRestart() {
        flyway.validate();
        assertEquals(0, flyway.migrate().migrationsExecuted);
        assertEquals("4", flyway.info().current().getVersion().getVersion());
        assertEquals(0, flyway.info().pending().length);
    }
}
