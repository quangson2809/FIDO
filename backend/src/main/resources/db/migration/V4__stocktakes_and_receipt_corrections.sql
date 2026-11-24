CREATE TABLE stocktakes (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 warehouse_id BIGINT NOT NULL,
 source_operation_id VARCHAR(80) NOT NULL UNIQUE,
 request_fingerprint CHAR(64) NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
 reason VARCHAR(500) NOT NULL,
 created_by BIGINT NOT NULL,
 confirmed_by BIGINT NULL,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 confirmed_at TIMESTAMP(6) NULL,
 CONSTRAINT fk_stocktake_warehouse FOREIGN KEY(warehouse_id) REFERENCES warehouses(id),
 CONSTRAINT fk_stocktake_actor FOREIGN KEY(created_by) REFERENCES accounts(id),
 CONSTRAINT fk_stocktake_confirmer FOREIGN KEY(confirmed_by) REFERENCES accounts(id),
 CONSTRAINT ck_stocktake_status CHECK(status IN ('DRAFT','CONFIRMED','CANCELLED'))
);
CREATE TABLE stocktake_items (
 stocktake_id BIGINT NOT NULL,
 product_id BIGINT NOT NULL,
 expected_quantity INT NOT NULL,
 expected_version INT NOT NULL,
 counted_quantity INT NOT NULL,
 PRIMARY KEY(stocktake_id,product_id),
 CONSTRAINT fk_count_stocktake FOREIGN KEY(stocktake_id) REFERENCES stocktakes(id),
 CONSTRAINT fk_count_product FOREIGN KEY(product_id) REFERENCES products(id),
 CONSTRAINT ck_count_quantities CHECK(expected_quantity>=0 AND counted_quantity>=0 AND expected_version>=0)
);
CREATE TABLE goods_receipt_corrections (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 goods_receipt_id BIGINT NOT NULL,
 source_operation_id VARCHAR(80) NOT NULL,
 request_fingerprint CHAR(64) NOT NULL,
 reason VARCHAR(500) NOT NULL,
 created_by BIGINT NOT NULL,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT uq_receipt_correction_operation UNIQUE(goods_receipt_id,source_operation_id),
 CONSTRAINT fk_correction_receipt FOREIGN KEY(goods_receipt_id) REFERENCES goods_receipts(id),
 CONSTRAINT fk_correction_actor FOREIGN KEY(created_by) REFERENCES accounts(id)
);
CREATE TABLE goods_receipt_correction_items (
 correction_id BIGINT NOT NULL,
 goods_receipt_item_id BIGINT NOT NULL,
 before_quantity INT NOT NULL,
 after_quantity INT NOT NULL,
 before_unit_cost BIGINT NOT NULL,
 after_unit_cost BIGINT NOT NULL,
 quantity_delta INT NOT NULL,
 value_delta BIGINT NOT NULL,
 PRIMARY KEY(correction_id,goods_receipt_item_id),
 CONSTRAINT fk_correction_item_header FOREIGN KEY(correction_id) REFERENCES goods_receipt_corrections(id),
 CONSTRAINT fk_correction_source_item FOREIGN KEY(goods_receipt_item_id) REFERENCES goods_receipt_items(id),
 CONSTRAINT ck_correction_values CHECK(before_quantity>=0 AND after_quantity>=0 AND before_unit_cost>=0 AND after_unit_cost>=0 AND quantity_delta=after_quantity-before_quantity)
);
