-- Approved Voucher V1. Legacy code-only vouchers stay unavailable until configured.
ALTER TABLE vouchers ADD COLUMN discount_type VARCHAR(20),
 ADD COLUMN discount_value DECIMAL(18,2), ADD COLUMN maximum_discount DECIMAL(18,2),
 ADD COLUMN minimum_amount DECIMAL(18,2), ADD COLUMN starts_at TIMESTAMP(6),
 ADD COLUMN ends_at TIMESTAMP(6), ADD COLUMN scope VARCHAR(20),
 ADD COLUMN global_limit BIGINT, ADD COLUMN customer_limit BIGINT,
 ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE voucher_products (
 voucher_id BIGINT NOT NULL, product_id BIGINT NOT NULL,
 PRIMARY KEY(voucher_id, product_id),
 FOREIGN KEY(voucher_id) REFERENCES vouchers(voucher_id),
 FOREIGN KEY(product_id) REFERENCES products(product_id)
);
CREATE TABLE voucher_categories (
 voucher_id BIGINT NOT NULL, category_id BIGINT NOT NULL,
 PRIMARY KEY(voucher_id, category_id),
 FOREIGN KEY(voucher_id) REFERENCES vouchers(voucher_id),
 FOREIGN KEY(category_id) REFERENCES categories(category_id)
);
CREATE TABLE voucher_usages (
 order_id BIGINT PRIMARY KEY, voucher_id BIGINT NOT NULL, account_id BIGINT NOT NULL,
 restored BOOLEAN NOT NULL DEFAULT FALSE,
 FOREIGN KEY(order_id) REFERENCES orders(order_id),
 FOREIGN KEY(voucher_id) REFERENCES vouchers(voucher_id),
 FOREIGN KEY(account_id) REFERENCES accounts(account_id)
);
CREATE INDEX ix_voucher_usage_count ON voucher_usages(voucher_id, restored, account_id);
CREATE TABLE checkout_quotes (
 quote_id VARCHAR(36) PRIMARY KEY, account_id BIGINT NOT NULL,
 fingerprint VARCHAR(64) NOT NULL, expires_at TIMESTAMP(6) NOT NULL,
 order_id BIGINT UNIQUE,
 FOREIGN KEY(account_id) REFERENCES accounts(account_id),
 FOREIGN KEY(order_id) REFERENCES orders(order_id)
);
INSERT INTO permissions(code, name) VALUES
 ('VOUCHER_READ', 'Xem voucher'),
 ('VOUCHER_WRITE', 'Quản lý voucher');
