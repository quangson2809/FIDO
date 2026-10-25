-- P3.1 additive runtime bridge. Preserve legacy IDs and existing Account rows.
-- Existing full_name values cannot be inferred from phone/email without owner-approved backfill.
-- New create commands require full_name; target-schema nullability remains a migration blocker.
ALTER TABLE accounts ADD COLUMN full_name VARCHAR(150) NULL;
ALTER TABLE accounts ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE accounts ADD COLUMN deleted_at TIMESTAMP(6) NULL;
ALTER TABLE accounts ADD COLUMN phone_active_key VARCHAR(20)
    GENERATED ALWAYS AS (CASE WHEN deleted_at IS NULL THEN phone ELSE NULL END);

-- Phone uniqueness follows the non-soft-deleted identity. A deleted account no longer reserves
-- its phone; active rows remain protected by the generated-key unique index.
ALTER TABLE accounts DROP INDEX uq_accounts_phone;
CREATE UNIQUE INDEX uq_accounts_phone_active ON accounts(phone_active_key);

ALTER TABLE accounts ADD CONSTRAINT ck_accounts_status
    CHECK (status IN ('ACTIVE','PENDING_APPROVAL','LOCKED','SUSPENDED'));
ALTER TABLE accounts ADD CONSTRAINT ck_accounts_full_name
    CHECK (full_name IS NULL OR CHAR_LENGTH(TRIM(full_name)) > 0);

ALTER TABLE roles ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE roles ADD CONSTRAINT ck_roles_status CHECK (status IN ('ACTIVE','INACTIVE'));

ALTER TABLE permissions ADD COLUMN description VARCHAR(500) NULL;
