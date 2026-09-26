package com.fido.modules.inventory.repository;

import com.fido.modules.inventory.entity.GoodsReceiptItem;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface GoodsReceiptItemRepository extends Repository<GoodsReceiptItem, Long> {
    Optional<GoodsReceiptItem> findById(Long id);
    GoodsReceiptItem save(GoodsReceiptItem entity);
}
