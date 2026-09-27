-- Phase 4 technical migration.
-- No new domain table/column is introduced.
-- DD-DB-01 requires one inventory row per ProductVariant in the one-warehouse baseline.

INSERT INTO inventories (
    variant_id,
    available_quantity,
    updated_at
)
SELECT
    v.variant_id,
    0,
    CURRENT_TIMESTAMP
FROM product_variants v
LEFT JOIN inventories i
    ON i.variant_id = v.variant_id
WHERE i.variant_id IS NULL;

CREATE INDEX idx_goods_receipts_supplier_date
    ON goods_receipts (supplier_id, receipt_date);

CREATE INDEX idx_goods_receipts_status
    ON goods_receipts (receipt_status);

CREATE INDEX idx_goods_receipt_items_variant
    ON goods_receipt_items (variant_id);

CREATE INDEX idx_inventory_transactions_variant_created
    ON inventory_transactions (variant_id, created_at);

CREATE INDEX idx_inventory_transactions_order
    ON inventory_transactions (order_id);

CREATE INDEX idx_inventory_transactions_receipt
    ON inventory_transactions (goods_receipt_id);
