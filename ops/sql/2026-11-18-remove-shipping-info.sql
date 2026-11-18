-- Manual upgrade; stop application writes and take a verified backup first.
-- This drops the former shipping metadata. No columns or tables replace it.
-- Run using a MySQL client that stops on the first error; do not use --force.
DELIMITER $$
DROP PROCEDURE IF EXISTS fido_remove_shipping_info$$
CREATE PROCEDURE fido_remove_shipping_info()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = 'shipping_infos'
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Expected legacy shipping_infos table; inspect schema before upgrade';
    END IF;

    -- Differences must be resolved explicitly, not by replacing the reporting timestamp.
    IF EXISTS (
        SELECT 1 FROM orders o
        LEFT JOIN payments p ON p.order_id = o.id
        LEFT JOIN shipping_infos s ON s.order_id = o.id
        WHERE p.order_id IS NULL OR s.order_id IS NULL
           OR NOT (p.amount <=> o.total_amount)
           OR s.shipping_status <> CASE
               WHEN o.status IN ('PENDING','CONFIRMED','PREPARING') THEN 'PENDING'
               WHEN o.status = 'SHIPPING' THEN 'SHIPPED'
               WHEN o.status = 'DELIVERY_FAILED' THEN 'FAILED'
               WHEN o.status IN ('COMPLETED','RETURNED') THEN 'DELIVERED'
               WHEN o.status = 'CANCELLED' THEN 'CANCELLED'
               ELSE 'INVALID'
           END
           OR (o.status IN ('COMPLETED','RETURNED') AND (
               p.collected_at IS NULL OR p.collected_by_account_id IS NULL
               OR NOT (s.delivered_at <=> p.collected_at)
               OR (o.status = 'COMPLETED' AND p.payment_status <> 'PAID')
               OR (o.status = 'RETURNED' AND p.payment_status <> 'REFUNDED')
           ))
           OR (o.status NOT IN ('COMPLETED','RETURNED') AND (
               p.payment_status <> 'UNPAID' OR p.collected_at IS NOT NULL
               OR s.delivered_at IS NOT NULL
           ))
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Order/payment/shipping mismatch; resolve before removing shipping_infos';
    END IF;

    DROP TABLE shipping_infos;
END$$
CALL fido_remove_shipping_info()$$
DROP PROCEDURE fido_remove_shipping_info$$
DELIMITER ;
