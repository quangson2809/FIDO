package com.fido.modules.inventory.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "goods_receipt_items", uniqueConstraints = {@UniqueConstraint(columnNames = {"receipt_id", "variant_id"})})
@Getter
@Setter
@NoArgsConstructor
public class GoodsReceiptItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "receipt_item_id", nullable = false)
    private Long receiptItemId;

    @Column(name = "receipt_id", nullable = false)
    private Long receiptId;

    @Column(name = "variant_id", nullable = false)
    private Long variantId;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;
}
