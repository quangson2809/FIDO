package com.fido.persistence;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fido.modules.account.entity.Account;
import com.fido.modules.account.entity.AccountRole;
import com.fido.modules.account.entity.Address;
import com.fido.modules.account.entity.Permission;
import com.fido.modules.account.entity.Role;
import com.fido.modules.account.entity.RolePermission;

import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.Transaction;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistry;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;
import java.util.UUID;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

@EnabledIfEnvironmentVariable(named = "CLEAN_RESET_TEST_DB_URL", matches = "jdbc:mysql:.*")
class CleanTargetEntityMappingTests {


    private void installSchema(DataSource dataSource) {
        dropAllTables(dataSource);
        try (Connection connection = dataSource.getConnection()) {
            ScriptUtils.executeSqlScript(
                    connection, new ClassPathResource("db/migration/V1__fido_target_schema.sql"));
        } catch (SQLException failure) {
            throw new IllegalStateException("Canonical FIDO database baseline failed", failure);
        }
    }

    private void dropAllTables(DataSource dataSource) {
        try (Connection connection = dataSource.getConnection();
             var statement = connection.createStatement()) {
            statement.execute("SET FOREIGN_KEY_CHECKS=0");
            List<String> tables = new ArrayList<>();
            try (var rows = statement.executeQuery(
                    "SELECT TABLE_NAME FROM information_schema.tables "
                            + "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE'")) {
                while (rows.next()) tables.add(rows.getString(1));
            }
            for (String table : tables) {
                statement.execute("DROP TABLE IF EXISTS `" + table.replace("`", "") + "`");
            }
            statement.execute("SET FOREIGN_KEY_CHECKS=1");
        } catch (SQLException failure) {
            throw new IllegalStateException("Could not reset disposable schema-test database", failure);
        }
    }

    private DataSource newDataSource() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                System.getenv("CLEAN_RESET_TEST_DB_URL"),
                System.getenv().getOrDefault("CLEAN_RESET_TEST_DB_USERNAME", "root"),
                System.getenv().getOrDefault("CLEAN_RESET_TEST_DB_PASSWORD", ""));
        dataSource.setDriverClassName(
                System.getenv().getOrDefault("CLEAN_RESET_TEST_DB_DRIVER", "com.mysql.cj.jdbc.Driver"));
        return dataSource;
    }

    @Test
    void accountAddressRbacAndCompositeMappingsValidateAndPersistAgainstCleanTarget() {
        DataSource dataSource = newDataSource();
        try {
            installSchema(dataSource);
            JdbcTemplate jdbc = new JdbcTemplate(dataSource);
            assertTargetNotNull(jdbc, "accounts", "full_name");
            assertTargetNotNull(jdbc, "accounts", "phone");
            for (String column : new String[] {
                    "recipient_name", "recipient_phone", "province", "district", "ward",
                    "address_line", "updated_at"
            }) {
                assertTargetNotNull(jdbc, "addresses", column);
            }

            StandardServiceRegistry registry = new StandardServiceRegistryBuilder()
                    .applySetting("hibernate.connection.datasource", dataSource)
                    .applySetting("hibernate.dialect", "org.hibernate.dialect.MySQLDialect")
                    .applySetting("hibernate.hbm2ddl.auto", "validate")
                    .build();
            try {
                MetadataSources metadata = new MetadataSources(registry)
                        .addAnnotatedClass(Account.class)
                        .addAnnotatedClass(Address.class)
                        .addAnnotatedClass(Role.class)
                        .addAnnotatedClass(Permission.class)
                        .addAnnotatedClass(AccountRole.class)
                        .addAnnotatedClass(RolePermission.class);
                try (SessionFactory sessionFactory = metadata.buildMetadata().buildSessionFactory();
                     Session session = sessionFactory.openSession()) {
                    Transaction transaction = session.beginTransaction();
                    Account account = new Account();
                    account.setFullName("Target Mapping Verification");
                    account.setPhone("+84987654321");
                    account.setPasswordHash("test-only-hash");
                    account.setStatus("ACTIVE");
                    session.persist(account);

                    Role role = new Role();
                    role.setCode("P31_MAPPING_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
                    role.setName("Mapping Verification");
                    role.setStatus("ACTIVE");
                    session.persist(role);

                    Permission permission = new Permission();
                    permission.setCode("P31_MAPPING_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
                    permission.setName("Mapping Verification");
                    session.persist(permission);
                    session.flush();

                    Address address = new Address();
                    address.setAccountId(account.getAccountId());
                    address.setRecipientName("Target Mapping Verification");
                    address.setRecipientPhone("0901234567");
                    address.setProvince("Hà Nội");
                    address.setDistrict("Cầu Giấy");
                    address.setWard("Dịch Vọng");
                    address.setAddressLine("Target schema test");
                    address.setDefault(true);
                    session.persist(address);

                    AccountRole accountRole = new AccountRole();
                    accountRole.setAccountId(account.getAccountId());
                    accountRole.setRoleId(role.getRoleId());
                    session.persist(accountRole);

                    RolePermission rolePermission = new RolePermission();
                    rolePermission.setRoleId(role.getRoleId());
                    rolePermission.setPermissionId(permission.getPermissionId());
                    session.persist(rolePermission);
                    session.flush();
                    transaction.commit();

                    assertEquals(1, jdbc.queryForObject(
                            "SELECT COUNT(*) FROM accounts WHERE id=?", Integer.class, account.getAccountId()));
                    assertEquals(1, jdbc.queryForObject(
                            "SELECT COUNT(*) FROM addresses WHERE id=? AND account_id=?",
                            Integer.class, address.getId(), account.getAccountId()));
                    assertEquals(1, jdbc.queryForObject(
                            "SELECT COUNT(*) FROM account_roles WHERE account_id=? AND role_id=?",
                            Integer.class, account.getAccountId(), role.getRoleId()));
                    assertEquals(1, jdbc.queryForObject(
                            "SELECT COUNT(*) FROM role_permissions WHERE role_id=? AND permission_id=?",
                            Integer.class, role.getRoleId(), permission.getPermissionId()));
                }
            } finally {
                StandardServiceRegistryBuilder.destroy(registry);
            }
        } finally {
            dropAllTables(dataSource);
        }
    }

    private void assertTargetNotNull(JdbcTemplate jdbc, String table, String column) {
        String nullable = jdbc.queryForObject(
                "SELECT IS_NULLABLE FROM information_schema.columns "
                        + "WHERE table_schema=DATABASE() AND table_name=? AND column_name=?",
                String.class,
                table,
                column);
        assertEquals("NO", nullable, table + "." + column + " must be NOT NULL in target schema");
    }
}
