package com.fido.persistence;

import com.fido.modules.account.entity.Account;
import com.fido.modules.account.entity.AccountRoleId;
import com.fido.modules.account.entity.RolePermissionId;
import com.fido.modules.account.repository.AccountRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
import jakarta.persistence.metamodel.EntityType;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.util.*;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@Sql("/persistence-fixture.sql")
class SchemaMappingTests {
    @Autowired EntityManager em;
    @Autowired DataSource dataSource;
    @Autowired AccountRepository accounts;

    @Test
    void exactly28DomainTablesAndEntitiesMatchApprovedOwnership() throws Exception {
        Map<String,String> owners = new HashMap<>();
        for (String line : Files.readAllLines(Path.of("../reference/table-ownership.csv")).subList(1, 29)) {
            String[] parts = line.split(",");
            owners.put(parts[1].trim(), parts[0].trim());
        }
        assertEquals(28, owners.size());
        Set<String> mapped = new HashSet<>();
        for (EntityType<?> entity : em.getMetamodel().getEntities()) {
            Class<?> type = entity.getJavaType();
            String table = type.getAnnotation(Table.class).name();
            assertEquals("com.fido.modules." + owners.get(table) + ".entity", type.getPackageName());
            mapped.add(table);
            Object key = switch (table) {
                case "roles" -> 101L;
                case "account_roles" -> new AccountRoleId(1L,101L);
                case "role_permissions" -> new RolePermissionId(101L,1L);
                default -> 1L;
            };
            assertNotNull(em.find(type, key), "Cannot read fixture for " + table);
        }
        assertEquals(owners.keySet(), mapped);
        try (Connection connection = dataSource.getConnection()) {
            Set<String> actual = new HashSet<>();
            try (var rows = connection.getMetaData().getTables(connection.getCatalog(), connection.getSchema(), "%", new String[]{"TABLE"})) {
                while(rows.next()) {
                    String name = rows.getString("TABLE_NAME").toLowerCase(Locale.ROOT);
                    if (!name.equals("flyway_schema_history")) actual.add(name);
                }
            }
            assertEquals(mapped, actual);
            for (EntityType<?> entity : em.getMetamodel().getEntities()) {
                String table = entity.getJavaType().getAnnotation(Table.class).name();
                Map<String,Column> expected = new HashMap<>();
                for (var field : entity.getJavaType().getDeclaredFields()) {
                    Column col = field.getAnnotation(Column.class);
                    if(col != null) expected.put(col.name(), col);
                }
                Set<String> actualColumns = new HashSet<>();
                String dbTable = connection.getMetaData().storesUpperCaseIdentifiers() ? table.toUpperCase(Locale.ROOT) : table;
                try (var cols = connection.getMetaData().getColumns(connection.getCatalog(), connection.getSchema(), dbTable, "%")) {
                    while(cols.next()) {
                        String name = cols.getString("COLUMN_NAME").toLowerCase(Locale.ROOT);
                        actualColumns.add(name);
                        Column column = expected.get(name);
                        assertNotNull(column, table + "." + name);
                        assertEquals(column.nullable(), cols.getInt("NULLABLE") == DatabaseMetaData.columnNullable, table + "." + name);
                    }
                }
                assertEquals(expected.keySet(), actualColumns, table);
            }
        }
    }

    @Test
    void repositoryRoundTripGeneratesIdAndUtcTimestamps() {
        Account account = new Account();
        account.setPasswordHash("test-only-hash");
        account.setPhone("0900000002");
        Account saved = accounts.save(account);
        em.flush();
        assertNotNull(saved.getAccountId());
        assertNotNull(saved.getCreatedAt());
        assertEquals(saved.getCreatedAt(), saved.getUpdatedAt());
        em.clear();
        assertTrue(accounts.findById(saved.getAccountId()).isPresent());
    }
}
