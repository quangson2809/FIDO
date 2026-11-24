CREATE TABLE order_return_receipts (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 order_id BIGINT NOT NULL,
 source_operation_id VARCHAR(80) NOT NULL,
 request_fingerprint CHAR(64) NOT NULL,
 received_by BIGINT NOT NULL,
 reason VARCHAR(500) NOT NULL,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT uq_return_operation UNIQUE(order_id,source_operation_id),
 CONSTRAINT fk_return_order FOREIGN KEY(order_id) REFERENCES orders(id),
 CONSTRAINT fk_return_actor FOREIGN KEY(received_by) REFERENCES accounts(id)
);
CREATE TABLE order_return_receipt_items (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 return_receipt_id BIGINT NOT NULL,
 order_item_id BIGINT NOT NULL,
 received_quantity INT NOT NULL,
 sellable_quantity INT NOT NULL,
 condition_code VARCHAR(20) NOT NULL,
 disposition VARCHAR(40) NOT NULL,
 CONSTRAINT uq_return_receipt_item UNIQUE(return_receipt_id,order_item_id),
 CONSTRAINT fk_return_item_receipt FOREIGN KEY(return_receipt_id) REFERENCES order_return_receipts(id),
 CONSTRAINT fk_return_item_order_item FOREIGN KEY(order_item_id) REFERENCES order_items(id),
 CONSTRAINT ck_return_quantity CHECK(received_quantity>0 AND sellable_quantity>=0 AND sellable_quantity<=received_quantity),
 CONSTRAINT ck_return_condition CHECK(condition_code IN ('SELLABLE','DAMAGED','MIXED')),
 CONSTRAINT ck_return_disposition CHECK(disposition IN ('RESTOCK','QUARANTINE','RESTOCK_AND_QUARANTINE'))
);
