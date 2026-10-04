ALTER TABLE product_images
    ADD COLUMN sort_order INT NULL;

ALTER TABLE order_items
    ADD COLUMN image_url_snapshot VARCHAR(1000) NULL;

-- Preserve the legacy display order deterministically: lower image_id means earlier image.
UPDATE product_images pi
SET sort_order = (
    SELECT ranked.image_sort_order
    FROM (
        SELECT image_id,
               ROW_NUMBER() OVER (
                   PARTITION BY product_id
                   ORDER BY image_id
               ) - 1 AS image_sort_order
        FROM product_images
    ) ranked
    WHERE ranked.image_id = pi.image_id
);

ALTER TABLE product_images
    MODIFY COLUMN sort_order INT NOT NULL;

ALTER TABLE product_images
    ADD CONSTRAINT ck_product_images_sort_order
        CHECK (sort_order >= 0);

ALTER TABLE product_images
    ADD CONSTRAINT uq_product_images_product_sort_order
        UNIQUE (product_id, sort_order);
