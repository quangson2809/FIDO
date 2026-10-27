package com.fido.persistence;

import static org.junit.jupiter.api.Assertions.*;

import com.fido.modules.account.entity.Account;
import com.fido.modules.account.entity.AccountRoleId;
import com.fido.modules.account.entity.RolePermissionId;
import com.fido.modules.account.repository.AccountRepository;
import com.fido.modules.inventory.entity.Inventory;
import com.fido.modules.product.entity.ProductAttributeValueId;

import jakarta.persistence.Column;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Table;
import jakarta.persistence.metamodel.EntityType;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import javax.sql.DataSource;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@Sql("/persistence-fixture.sql")
class SchemaMappingTests {
    private static final Map<String, String> OWNERS = Map.ofEntries(
            Map.entry("accounts", "account"),
            Map.entry("addresses", "account"),
            Map.entry("roles", "account"),
            Map.entry("permissions", "account"),
            Map.entry("account_roles", "account"),
            Map.entry("role_permissions", "account"),
            Map.entry("categories", "product"),
            Map.entry("brands", "product"),
            Map.entry("attribute_types", "product"),
            Map.entry("attributes", "product"),
            Map.entry("attribute_options", "product"),
            Map.entry("products", "product"),
            Map.entry("product_attribute_values", "product"),
            Map.entry("product_images", "product"),
            Map.entry("carts", "cart"),
            Map.entry("cart_items", "cart"),
            Map.entry("vouchers", "promotion"),
            Map.entry("orders", "order"),
            Map.entry("order_items", "order"),
            Map.entry("order_addresses", "order"),
            Map.entry("order_voucher_snapshots", "order"),
            Map.entry("payments", "order"),
            Map.entry("shipping_infos", "order"),
            Map.entry("suppliers", "inventory"),
            Map.entry("warehouses", "inventory"),
            Map.entry("goods_receipts", "inventory"),
            Map.entry("goods_receipt_items", "inventory"),
            Map.entry("inventories", "inventory"),
            Map.entry("inventory_transactions", "inventory"),
            Map.entry("audit_logs", "audit"),
            Map.entry("content_pages", "content"));

    @Autowired EntityManager em;
    @Autowired DataSource dataSource;
    @Autowired AccountRepository accounts;

    @Test
    void domainTablesAndEntitiesMatchApprovedThirtyOneTableOwnership() throws Exception {
        Set<String> mapped = new HashSet<>();
        for (EntityType<?> entity : em.getMetamodel().getEntities()) {
            Class<?> type = entity.getJavaType();
            Table tableAnnotation = type.getAnnotation(Table.class);
            assertNotNull(tableAnnotation, type.getName());
            String table = tableAnnotation.name();
            assertEquals("com.fido.modules." + OWNERS.get(table) + ".entity", type.getPackageName());
            mapped.add(table);

            Object key = switch (table) {
                case "roles" -> 101L;
                case "permissions" -> 1001L;
                case "account_roles" -> new AccountRoleId(1L, 101L);
                case "role_permissions" -> new RolePermissionId(101L, 1001L);
                case "product_attribute_values" -> new ProductAttributeValueId(1L, 1L);
                case "inventories" -> new Inventory.InventoryId(1L, 1L);
                default -> 1L;
            };
            assertNotNull(em.find(type, key), "Cannot read canonical fixture for " + table);
        }
        assertEquals(OWNERS.keySet(), mapped);
        assertEquals(31, mapped.size());

        try (Connection connection = dataSource.getConnection()) {
            Set<String> actualTables = new HashSet<>();
            try (var rows = connection.getMetaData().getTables(
                    connection.getCatalog(), connection.getSchema(), "%", new String[] {"TABLE"})) {
                while (rows.next()) {
                    String name = rows.getString("TABLE_NAME").toLowerCase(Locale.ROOT);
                    if (!name.equals("flyway_schema_history")) actualTables.add(name);
                }
            }
            assertEquals(OWNERS.keySet(), actualTables,
                    "The database must contain exactly the approved 31 target tables.");

            for (EntityType<?> entity : em.getMetamodel().getEntities()) {
                String table = entity.getJavaType().getAnnotation(Table.class).name();
                Map<String, Column> expectedColumns = new HashMap<>();
                for (var field : entity.getJavaType().getDeclaredFields()) {
                    Column column = field.getAnnotation(Column.class);
                    if (column != null) expectedColumns.put(column.name(), column);
                }

                Set<String> actualColumns = new HashSet<>();
                String dbTable = connection.getMetaData().storesUpperCaseIdentifiers()
                        ? table.toUpperCase(Locale.ROOT) : table;
                try (var columns = connection.getMetaData().getColumns(
                        connection.getCatalog(), connection.getSchema(), dbTable, "%")) {
                    while (columns.next()) {
                        String name = columns.getString("COLUMN_NAME").toLowerCase(Locale.ROOT);
                        actualColumns.add(name);
                        Column column = expectedColumns.get(name);
                        assertNotNull(column, table + "." + name + " must be explicitly mapped");
                        assertEquals(
                                column.nullable(),
                                columns.getInt("NULLABLE") == DatabaseMetaData.columnNullable,
                                table + "." + name + " nullability");
                    }
                }
                assertEquals(expectedColumns.keySet(), actualColumns, table + " columns");
            }
        }
    }

    @Test
    void repositoryRoundTripGeneratesIdAndUtcTimestamps() {
        Account account = new Account();
        account.setFullName("Round trip account");
        account.setPasswordHash("test-only-hash");
        account.setPhone("0900000002");
        account.setStatus("ACTIVE");
        Account saved = accounts.save(account);
        em.flush();

        assertNotNull(saved.getAccountId());
        assertNotNull(saved.getCreatedAt());
        assertEquals(saved.getCreatedAt(), saved.getUpdatedAt());

        em.clear();
        assertTrue(accounts.findById(saved.getAccountId()).isPresent());
    }
}
