package com.fido.modules.audit.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;

@Entity
@Table(name = "audit_logs")
@Getter @Setter @NoArgsConstructor @Immutable
public class AuditLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false, updatable = false)
    private Long auditId;

    @Column(name = "actor_account_id", updatable = false)
    private Long actorAccountId;
    @Column(name = "action", nullable = false, length = 120, updatable = false)
    private String action;

    // Legacy compatibility columns remain nullable while older domain writers are retired.
    @Column(name = "target_type", length = 80, updatable = false)
    private String targetType;
    @Column(name = "target_id", length = 80, updatable = false)
    private String targetId;
    @Column(name = "description", columnDefinition = "TEXT", updatable = false)
    private String description;

    @Column(name = "entity_type", length = 80, updatable = false)
    private String entityType;
    @Column(name = "entity_id", length = 100, updatable = false)
    private String entityId;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "before_data", columnDefinition = "JSON", updatable = false)
    private Map<String,Object> beforeData;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "after_data", columnDefinition = "JSON", updatable = false)
    private Map<String,Object> afterData;
    @Column(name = "correlation_id", length = 120, updatable = false)
    private String correlationId;

    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMP(6)", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
