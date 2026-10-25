package com.fido.modules.audit.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Types;

@Repository
public class AuditWriteRepository {

    private static final String INSERT_SQL =
            """
            INSERT INTO audit_logs
                (actor_account_id, action, entity_type, entity_id,
                 before_data, after_data, correlation_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """;

    private final JdbcTemplate jdbc;

    public AuditWriteRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Inserts only the columns defined by the approved target DDL.
     * ID and created_at are database-owned; update/delete methods are intentionally absent.
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
                    var statement = connection.prepareStatement(INSERT_SQL);
                    if (actorAccountId == null) {
                        statement.setNull(1, Types.BIGINT);
                    } else {
                        statement.setLong(1, actorAccountId);
                    }
                    statement.setString(2, action);
                    statement.setString(3, entityType);
                    statement.setString(4, entityId);
                    if (beforeDataJson == null) {
                        statement.setNull(5, Types.VARCHAR);
                    } else {
                        statement.setString(5, beforeDataJson);
                    }
                    if (afterDataJson == null) {
                        statement.setNull(6, Types.VARCHAR);
                    } else {
                        statement.setString(6, afterDataJson);
                    }
                    statement.setString(7, correlationId);
                    return statement;
                });
    }
}
