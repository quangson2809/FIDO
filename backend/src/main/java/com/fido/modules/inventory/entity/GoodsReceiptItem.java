package com.fido.modules.inventory.entity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "goods_receipt_items",
        uniqueConstraints = {@UniqueConstraint(columnNames = {"goods_receipt_id", "product_id"})})
@Getter
@Setter
@NoArgsConstructor
public class GoodsReceiptItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long receiptItemId;

    @Column(name = "goods_receipt_id", nullable = false)
    private Long receiptId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "quantity_received", nullable = false)
    private Integer quantity;

    @Column(name = "unit_cost", nullable = false)
    private Long unitCost = 0L;
}
