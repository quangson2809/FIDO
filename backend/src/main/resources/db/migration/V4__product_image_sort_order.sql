ALTER TABLE product_images
    ADD COLUMN sort_order INT NULL;

UPDATE product_images
SET sort_order = (
    SELECT ranked.sort_order
    FROM (
        SELECT current_image.image_id AS image_id,
               COUNT(previous_image.image_id) AS sort_order
        FROM product_images current_image
        LEFT JOIN product_images previous_image
          ON previous_image.product_id = current_image.product_id
         AND previous_image.image_id < current_image.image_id
        GROUP BY current_image.image_id
    ) ranked
    WHERE ranked.image_id = product_images.image_id
);

ALTER TABLE product_images
    MODIFY COLUMN sort_order INT NOT NULL;

ALTER TABLE product_images
    ADD CONSTRAINT uq_product_images_product_sort_order
        UNIQUE (product_id, sort_order);
