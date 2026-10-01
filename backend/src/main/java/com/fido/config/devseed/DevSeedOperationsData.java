package com.fido.config.devseed;

import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

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
        jdbc.update("""
                INSERT INTO audit_logs(
                    audit_id,actor_account_id,action,target_type,target_id,
                    description,created_at
                ) VALUES
                (1050001,900005,'ORDER_CONFIRM','ORDER','1001002',
                    'Seed audit order confirm','2026-09-08 02:10:00'),
                (1050002,900004,'GOODS_RECEIPT_CONFIRM','GOODS_RECEIPT','1010002',
                    'Seed audit receipt confirm','2026-09-18 03:00:00'),
                (1050003,900001,'CONTENT_UPDATE','CONTENT_PAGE','1060001',
                    'Seed audit content','2026-09-01 00:00:00')
                """);
    }

    private void seedContentPages() {
        jdbc.update("""
                INSERT INTO content_pages(
                    page_id,page_code,title,content,updated_by_account_id,updated_at
                ) VALUES
                (1060001,'shipping-policy','Chính sách giao hàng',
                    'Nội dung seed cho chính sách giao hàng.',
                    900001,'2026-09-01 00:00:00'),
                (1060002,'return-policy','Chính sách đổi trả',
                    'Nội dung seed cho chính sách đổi trả.',
                    900001,'2026-09-01 00:00:00'),
                (1060003,'privacy-policy','Chính sách bảo mật',
                    'Nội dung seed cho chính sách bảo mật.',
                    900001,'2026-09-01 00:00:00')
                """);
    }
}
