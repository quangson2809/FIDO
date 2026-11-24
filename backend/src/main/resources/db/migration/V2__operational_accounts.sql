-- Additive owner-requested operational extension; V1 and existing business facts remain unchanged.
ALTER TABLE accounts ADD COLUMN auth_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN email_verified_at TIMESTAMP(6) NULL;
ALTER TABLE accounts ADD COLUMN verified_email_key VARCHAR(254) GENERATED ALWAYS AS
    (CASE WHEN deleted_at IS NULL AND email_verified_at IS NOT NULL THEN LOWER(TRIM(email)) ELSE NULL END) STORED;
CREATE UNIQUE INDEX uq_accounts_verified_email ON accounts(verified_email_key);
CREATE TABLE account_recovery_tokens (
    token_hash CHAR(64) PRIMARY KEY,
    account_id BIGINT NOT NULL,
    email_snapshot VARCHAR(254) NOT NULL,
    purpose VARCHAR(20) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    expires_at TIMESTAMP(6) NOT NULL,
    consumed_at TIMESTAMP(6) NULL,
    CONSTRAINT fk_recovery_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
    CONSTRAINT ck_recovery_purpose CHECK (purpose IN ('EMAIL_VERIFY','PASSWORD_RESET')),
    CONSTRAINT ck_recovery_window CHECK (expires_at > created_at)
);
CREATE INDEX ix_recovery_account_purpose ON account_recovery_tokens(account_id,purpose,created_at);
INSERT INTO permissions(code,name,description) VALUES ('CUSTOMER_WRITE','Quản lý trạng thái khách hàng','Khóa/mở khóa tài khoản khách hàng, có lý do và audit');
INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.code='SUPERADMIN' AND p.code='CUSTOMER_WRITE';
