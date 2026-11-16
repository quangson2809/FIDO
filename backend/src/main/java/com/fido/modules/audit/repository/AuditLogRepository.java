package com.fido.modules.audit.repository;

import com.fido.modules.audit.entity.AuditLog;

import org.springframework.data.repository.Repository;

import java.util.Optional;

/** Chỉ truy vấn; ghi audit phải qua AuditWriteService để xác định người thực hiện và lọc dữ liệu. */
public interface AuditLogRepository
        extends Repository<AuditLog, Long>,
                org.springframework.data.jpa.repository.JpaSpecificationExecutor<AuditLog> {
    Optional<AuditLog> findById(Long id);
}
