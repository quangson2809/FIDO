-- Remove the runtime write dependency on address_text without deleting historical values.
ALTER TABLE addresses MODIFY COLUMN address_text VARCHAR(500) NULL;

-- V10 allowed a null update timestamp for legacy rows; use their recorded creation time.
UPDATE addresses SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE addresses MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL;

-- Repair each account's default-address invariant without fabricating structured recipient/location data.
-- Prefer a current default; otherwise choose latest updated_at then highest id.
CREATE TEMPORARY TABLE p31_address_defaults AS
SELECT account_id, id
FROM (
    SELECT account_id, id,
           ROW_NUMBER() OVER (
               PARTITION BY account_id
               ORDER BY CASE WHEN is_default = TRUE THEN 0 ELSE 1 END,
                        updated_at DESC,
                        id DESC
           ) AS row_number_in_account
    FROM addresses
) ranked
WHERE row_number_in_account = 1;

UPDATE addresses
SET is_default = FALSE
WHERE account_id IN (SELECT account_id FROM p31_address_defaults)
  AND id NOT IN (SELECT id FROM p31_address_defaults);
UPDATE addresses
SET is_default = TRUE
WHERE id IN (SELECT id FROM p31_address_defaults);
