package com.fido.modules.inventory.repository;

import com.fido.modules.inventory.entity.GoodsReceiptItem;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/** Chỉ thay dòng khi phiếu còn DRAFT; service chịu trách nhiệm kiểm tra trạng thái trước khi gọi. */
public interface GoodsReceiptItemRepository extends Repository<GoodsReceiptItem, Long> {

    Optional<GoodsReceiptItem> findById(Long id);

    GoodsReceiptItem save(GoodsReceiptItem entity);

    List<GoodsReceiptItem> findAllByReceiptIdOrderByReceiptItemIdAsc(Long receiptId);

    @Modifying(flushAutomatically = true)
    @Query(
            """
            delete from GoodsReceiptItem item
            where item.receiptId = :receiptId
            """)
    int deleteByReceiptId(@Param("receiptId") Long receiptId);
}
