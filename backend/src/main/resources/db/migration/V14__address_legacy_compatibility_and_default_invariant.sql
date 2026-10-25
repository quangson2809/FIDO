-- Align the active runtime schema with the structured Address contract without fabricating legacy data.
-- Keep address_text only as nullable legacy storage; the Address entity/API no longer maps or returns it.
ALTER TABLE addresses MODIFY COLUMN address_text VARCHAR(500) NULL;

-- V10 allowed updated_at to be NULL. created_at is the only reliable migration-time fallback.
UPDATE addresses SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE addresses MODIFY COLUMN updated_at TIMESTAMP(6) NOT NULL;

-- Choose one default per account with addresses: preserve a current default where possible;
-- otherwise choose latest updated_at, then highest id. Materialize winners before updating
-- addresses so the same statement works on MySQL and H2 and never reads its target table in UPDATE.
CREATE TEMPORARY TABLE p31_address_default_winners AS
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
WHERE account_id IN (SELECT account_id FROM p31_address_default_winners);
UPDATE addresses
SET is_default = TRUE
WHERE id IN (SELECT id FROM p31_address_default_winners);
DROP TABLE p31_address_default_winners;
