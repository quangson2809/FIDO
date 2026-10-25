-- Align the active runtime schema with the structured Address contract without fabricating legacy data.
-- Keep address_text only as nullable legacy storage; the Address entity/API no longer maps or returns it.
ALTER TABLE addresses MODIFY COLUMN address_text VARCHAR(500) NULL;

-- V10 allowed updated_at to be NULL. created_at is the only reliable migration-time fallback.
UPDATE addresses SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE addresses MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL;

-- Choose exactly one default for every legacy account that has addresses.
-- Prefer a previously-default row; otherwise choose latest updated_at, then highest id.
WITH ranked AS (
    SELECT account_id, id,
           ROW_NUMBER() OVER (
               PARTITION BY account_id
               ORDER BY CASE WHEN is_default = TRUE THEN 0 ELSE 1 END,
                        updated_at DESC,
                        id DESC
           ) AS row_number_in_account
    FROM addresses
),
chosen AS (
    SELECT account_id, id
    FROM ranked
    WHERE row_number_in_account = 1
)
UPDATE addresses target
JOIN chosen ON chosen.account_id = target.account_id
SET target.is_default = (target.id = chosen.id);
