package com.fido.modules.audit.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.SQLException;
import java.sql.Types;
import java.util.Locale;

@Repository
public class AuditWriteRepository {

    private static final String INSERT_SQL_TEMPLATE =
            """
            INSERT INTO audit_logs
                (actor_account_id, action, entity_type, entity_id,
                 before_data, after_data, correlation_id)
            VALUES (?, ?, ?, ?, %s, %s, ?)
            """;

    private final JdbcTemplate jdbc;

    public AuditWriteRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Inserts only the approved target columns; ID and created_at are database-owned.
     * MySQL parses CAST(? AS JSON); H2 uses its FORMAT JSON binding syntax so a JSON object
     * remains an object instead of being persisted as a JSON string scalar.
     */
    public void insert(
            Long actorAccountId,
            String action,
            String entityType,
            String entityId,
            String beforeDataJson,
            String afterDataJson,
            String correlationId) {
        jdbc.update(
                connection -> {
                    String product = connection.getMetaData().getDatabaseProductName();
                    boolean h2 = "H2".equalsIgnoreCase(product);
                    boolean mysql = product.toLowerCase(Locale.ROOT).contains("mysql");
                    if (!h2 && !mysql) {
                        throw new SQLException("Unsupported database for audit JSON binding");
                    }

                    String jsonPlaceholder = h2 ? "? FORMAT JSON" : "CAST(? AS JSON)";
                    String beforeExpression =
                            beforeDataJson == null ? "NULL" : jsonPlaceholder;
                    String afterExpression =
                            afterDataJson == null ? "NULL" : jsonPlaceholder;
                    String sql =
                            INSERT_SQL_TEMPLATE.formatted(beforeExpression, afterExpression);
                    var statement = connection.prepareStatement(sql);

                    if (actorAccountId == null) {
                        statement.setNull(1, Types.BIGINT);
                    } else {
                        statement.setLong(1, actorAccountId);
                    }
                    statement.setString(2, action);
                    statement.setString(3, entityType);
                    statement.setString(4, entityId);

                    int parameterIndex = 5;
                    if (beforeDataJson != null) {
                        statement.setString(parameterIndex++, beforeDataJson);
                    }
                    if (afterDataJson != null) {
                        statement.setString(parameterIndex++, afterDataJson);
                    }
                    statement.setString(parameterIndex, correlationId);
                    return statement;
                });
    }
}
