-- Manual upgrade for the previous carts schema. Stop application writes and back up first.
-- See docs/operations/reusable-cart-upgrade.md. This is not a Flyway migration.
-- MySQL DDL commits implicitly; run with a client that stops on the first error.
DELIMITER $$

SELECT c.account_id, c.id AS cart_id, c.status, COUNT(ci.id) AS item_count
FROM carts c LEFT JOIN cart_items ci ON ci.cart_id = c.id
WHERE c.account_id IN (
    SELECT account_id FROM carts GROUP BY account_id HAVING COUNT(*) > 1
)
GROUP BY c.account_id, c.id, c.status
ORDER BY c.account_id, c.id$$

DROP PROCEDURE IF EXISTS fido_upgrade_reusable_cart$$
CREATE PROCEDURE fido_upgrade_reusable_cart()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        DROP TEMPORARY TABLE IF EXISTS fido_cart_keepers;
        RESIGNAL;
    END;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'carts' AND column_name = 'status'
    ) OR NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = DATABASE() AND table_name = 'carts'
          AND constraint_name = 'ck_carts_status' AND constraint_type = 'CHECK'
    ) OR NOT EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = 'carts'
          AND index_name = 'ix_carts_account_status'
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Expected legacy carts schema; inspect schema before upgrade';
    END IF;

    IF EXISTS (
        SELECT c.account_id
        FROM carts c
        WHERE EXISTS (SELECT 1 FROM cart_items ci WHERE ci.cart_id = c.id)
        GROUP BY c.account_id HAVING COUNT(*) > 1
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Multiple nonempty carts for one account; resolve explicitly before upgrade';
    END IF;

    START TRANSACTION;
    CREATE TEMPORARY TABLE fido_cart_keepers (
        account_id BIGINT NOT NULL PRIMARY KEY,
        keep_id BIGINT NOT NULL
    );
    INSERT INTO fido_cart_keepers(account_id, keep_id)
    SELECT c.account_id,
           COALESCE(MIN(CASE WHEN ci.cart_id IS NOT NULL THEN c.id END), MIN(c.id))
    FROM carts c
    LEFT JOIN (SELECT DISTINCT cart_id FROM cart_items) ci ON ci.cart_id = c.id
    GROUP BY c.account_id;

    DELETE c FROM carts c
    JOIN fido_cart_keepers k ON k.account_id = c.account_id
    WHERE c.id <> k.keep_id
      AND NOT EXISTS (SELECT 1 FROM cart_items ci WHERE ci.cart_id = c.id);
    DROP TEMPORARY TABLE fido_cart_keepers;
    COMMIT;

    ALTER TABLE carts
        ADD CONSTRAINT uq_carts_account UNIQUE (account_id),
        DROP INDEX ix_carts_account_status,
        DROP CHECK ck_carts_status,
        DROP COLUMN status;
END$$

CALL fido_upgrade_reusable_cart()$$
DROP PROCEDURE fido_upgrade_reusable_cart$$
DELIMITER ;
