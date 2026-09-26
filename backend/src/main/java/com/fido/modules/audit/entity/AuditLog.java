package com.fido.modules.audit.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Immutable;

@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
@Immutable
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "audit_id", nullable = false, updatable = false)
    private Long auditId;

    @Column(name = "actor_account_id", nullable = false, updatable = false)
    private Long actorAccountId;

    @Column(name = "action", nullable = false, length = 120, updatable = false)
    private String action;

    @Column(name = "target_type", nullable = false, length = 80, updatable = false)
    private String targetType;

    @Column(name = "target_id", nullable = false, length = 80, updatable = false)
    private String targetId;

    @Column(name = "description", nullable = true, columnDefinition = "TEXT", updatable = false)
    private String description;

    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMP(6)", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        createdAt = now;
    }
}
