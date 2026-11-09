package com.fido.modules.audit.repository;

import com.fido.modules.audit.entity.AuditLog;

import org.springframework.data.repository.Repository;

import java.util.Optional;

/** Read queries only. Writes go through AuditWriteService and its actor/payload policy. */
public interface AuditLogRepository
        extends Repository<AuditLog, Long>,
                org.springframework.data.jpa.repository.JpaSpecificationExecutor<AuditLog> {
    Optional<AuditLog> findById(Long id);

}
