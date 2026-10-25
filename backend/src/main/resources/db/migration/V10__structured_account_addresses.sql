-- Keep legacy free-text data; do not infer missing recipient/location fields.
ALTER TABLE addresses RENAME COLUMN address_id TO id;
ALTER TABLE addresses ADD COLUMN recipient_name VARCHAR(150) NULL;
ALTER TABLE addresses ADD COLUMN recipient_phone VARCHAR(20) NULL;
ALTER TABLE addresses ADD COLUMN province VARCHAR(120) NULL;
ALTER TABLE addresses ADD COLUMN district VARCHAR(120) NULL;
ALTER TABLE addresses ADD COLUMN ward VARCHAR(120) NULL;
ALTER TABLE addresses ADD COLUMN address_line VARCHAR(500) NULL;
ALTER TABLE addresses ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE addresses ADD COLUMN updated_at TIMESTAMP(6) NULL;
CREATE INDEX ix_addresses_account_default ON addresses (account_id, is_default);
