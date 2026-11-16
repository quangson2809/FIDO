package com.fido.modules.audit.service;

import com.fido.config.web.CorrelationIdContext;
import com.fido.modules.audit.repository.AuditWriteRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

/** Ghi audit đồng bộ trong giao dịch có sẵn; lỗi ghi phải lan ra để thay đổi nghiệp vụ cũng rollback. */
@Service
public class AuditWriteService {

    private final AuditWriteRepository repository;
    private final AuditActorResolver actorResolver;
    private final AuditPayloadPolicy payloadPolicy;

    public AuditWriteService(
            AuditWriteRepository repository,
            AuditActorResolver actorResolver,
            AuditPayloadPolicy payloadPolicy) {
        this.repository = repository;
        this.actorResolver = actorResolver;
        this.payloadPolicy = payloadPolicy;
    }

    /**
     * event do service nghiệp vụ tạo, chứa loại hành động/đối tượng và dữ liệu trước/sau đã chọn.
     * Người thực hiện lấy lại từ đăng nhập hiện tại; dùng giao dịch của lệnh gọi, không commit audit
     * riêng.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(AuditWriteEvent event) {
        write(event, actorResolver.requireAuthenticatedAccountId());
    }

    /** Chỉ dành cho lệnh hệ thống tin cậy không có người đăng nhập; request người dùng gọi record(event). */
    @Transactional(propagation = Propagation.MANDATORY)
    public void recordSystemEvent(AuditWriteEvent event) {
        actorResolver.requireSystemContext();
        write(event, null);
    }

    private void write(AuditWriteEvent event, Long actorAccountId) {
        Objects.requireNonNull(event, "event");
        String beforeJson = payloadPolicy.toJson(event.action(), event.beforeData());
        String afterJson = payloadPolicy.toJson(event.action(), event.afterData());

        repository.insert(
                actorAccountId,
                event.action().name(),
                event.entityType().name(),
                event.entityId(),
                beforeJson,
                afterJson,
                CorrelationIdContext.currentOrGenerate());
    }
}
