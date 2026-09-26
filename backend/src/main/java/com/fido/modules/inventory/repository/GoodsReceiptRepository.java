package com.fido.modules.inventory.repository;

import com.fido.modules.inventory.entity.GoodsReceipt;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface GoodsReceiptRepository extends Repository<GoodsReceipt, Long> {
    Optional<GoodsReceipt> findById(Long id);
    GoodsReceipt save(GoodsReceipt entity);
}
