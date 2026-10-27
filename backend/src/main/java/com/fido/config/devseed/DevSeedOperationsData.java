package com.fido.config.devseed;

import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Minimal audit/content fixtures that use the approved target field names. */
@Component
@Profile({"dev", "test"})
public class DevSeedOperationsData {
    private final JdbcTemplate jdbc;

    public DevSeedOperationsData(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void seed() {
        seedAuditLogs();
        seedContentPages();
    }

    private void seedAuditLogs() {
        jdbc.update(
                """
                INSERT INTO audit_logs(
                    id,actor_account_id,action,entity_type,entity_id,before_data,after_data,
                    correlation_id,created_at
                ) VALUES
                (1050001,900001,'ORDER_CONFIRM','ORDER','1001002',
                    JSON_OBJECT('status','PENDING'),JSON_OBJECT('status','CONFIRMED'),
                    'seed-order-confirm','2026-09-08 02:10:00'),
                (1050002,900001,'GOODS_RECEIPT_CONFIRM','GOODS_RECEIPT','1010002',
                    JSON_OBJECT('status','DRAFT'),JSON_OBJECT('status','CONFIRMED'),
                    'seed-receipt-confirm','2026-09-18 03:00:00'),
                (1050003,900001,'CONTENT_UPDATE','CONTENT_PAGE','1060001',
                    JSON_OBJECT('status','DRAFT'),JSON_OBJECT('status','PUBLISHED'),
                    'seed-content-update','2026-09-01 00:00:00')
                """);
    }

    private void seedContentPages() {
        jdbc.update(
                """
                INSERT INTO content_pages(
                    id,slug,title,content,status,updated_by,updated_at
                ) VALUES
                (1060001,'shipping-policy','Chính sách giao hàng',
                    'Nội dung seed cho chính sách giao hàng.','PUBLISHED',
                    900001,'2026-09-01 00:00:00'),
                (1060002,'return-policy','Chính sách đổi trả',
                    'Nội dung seed cho chính sách đổi trả.','PUBLISHED',
                    900001,'2026-09-01 00:00:00'),
                (1060003,'privacy-policy','Chính sách bảo mật',
                    'Nội dung seed cho chính sách bảo mật.','PUBLISHED',
                    900001,'2026-09-01 00:00:00')
                """);
    }
}
