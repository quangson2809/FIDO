package com.fido.modules.audit.repository;

import com.fido.modules.audit.entity.AuditLog;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface AuditLogRepository extends Repository<AuditLog, Long> {
    Optional<AuditLog> findById(Long id);
    AuditLog save(AuditLog entity);
}
