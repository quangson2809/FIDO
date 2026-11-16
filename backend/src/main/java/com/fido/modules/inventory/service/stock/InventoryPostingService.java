package com.fido.modules.inventory.service.stock;

import com.fido.modules.inventory.entity.Inventory;
import com.fido.modules.inventory.entity.InventoryTransaction;
import com.fido.modules.inventory.repository.InventoryRepository;
import com.fido.modules.inventory.repository.InventoryTransactionRepository;
import com.fido.modules.inventory.service.stock.InventoryCommandService.StockLine;
import com.fido.modules.product.service.InventoryProductAccessService;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Component
class InventoryPostingService {
    private static final int MAX_SQL_INT = Integer.MAX_VALUE;
    private final EntityManager em;
    private final InventoryRepository inventories;
    private final InventoryTransactionRepository transactions;
    private final InventoryProductAccessService productAccess;

    InventoryPostingService(
            EntityManager em,
            InventoryRepository inventories,
            InventoryTransactionRepository transactions,
            InventoryProductAccessService productAccess) {
        this.em = em;
        this.inventories = inventories;
        this.transactions = transactions;
        this.productAccess = productAccess;
    }

    InventoryTransaction post(
            InventoryMovement movement, LocalDateTime now, String idempotencyKey) {
        return post(movement, now, idempotencyKey, null);
    }

    /**
     * movement do workflow tạo từ nguồn đã kiểm tra; now là giờ UTC, idempotencyKey là khóa nghiệp vụ
     * do máy chủ sinh.
     * ledgerConflictCode cho phép bên gọi đổi lỗi trùng ledger thành mã xung đột riêng; balance và
     * ledger dùng chung giao dịch.
     */
    InventoryTransaction post(
            InventoryMovement movement,
            LocalDateTime now,
            String idempotencyKey,
            String ledgerConflictCode) {
        applyBalanceDelta(
                movement.warehouseId(), movement.productId(), movement.quantityDelta(), now);
        try {
            return record(movement, idempotencyKey);
        } catch (org.springframework.dao.DataIntegrityViolationException failure) {
            if (ledgerConflictCode == null) throw failure;
            throw new ResponseStatusException(HttpStatus.CONFLICT, ledgerConflictCode);
        }
    }

    /**
     * warehouseId do máy chủ/chứng từ hợp lệ xác định; quantityDelta có dấu: dương nhập, âm xuất.
     * Khóa Product/số dư rồi cập nhật có điều kiện để không âm kho hoặc tràn số lượng/version.
     */
    private void applyBalanceDelta(
            Long warehouseId, Long productId, int quantityDelta, LocalDateTime now) {
        if (quantityDelta == 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);

        productAccess.lockTrackedProduct(productId);

        Inventory balance =
                inventories
                        .findByWarehouseIdAndProductIdForUpdate(warehouseId, productId)
                        .orElse(null);
        // Thiếu dòng tồn xem như 0: chỉ lệnh cộng được tạo số dư ban đầu, lệnh trừ phải thất bại.
        if (balance == null) {
            if (quantityDelta < 0) throw new ResponseStatusException(HttpStatus.CONFLICT);
            ensureInventoryRow(warehouseId, productId);
            balance =
                    inventories
                            .findByWarehouseIdAndProductIdForUpdate(warehouseId, productId)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT));
        }
        em.refresh(balance, LockModeType.PESSIMISTIC_WRITE);

        // SQL tự kiểm tra giới hạn và tăng version; chỉ đúng một dòng được cập nhật mới xem là
        // thành công.
        int updated =
                inventories.applyBalanceDeltaGuarded(
                        warehouseId, productId, quantityDelta, now, MAX_SQL_INT, MAX_SQL_INT);
        if (updated != 1) throw new ResponseStatusException(HttpStatus.CONFLICT);

        // SQL cập nhật trực tiếp không tự đổi entity đã nạp; refresh để bên gọi thấy số dư/version
        // mới.
        em.refresh(balance);
    }

    private void ensureInventoryRow(Long warehouseId, Long productId) {
        Inventory inventory = new Inventory();
        inventory.setWarehouseId(warehouseId);
        inventory.setProductId(productId);
        inventory.setQuantityOnHand(0);
        inventory.setVersion(0);
        inventories.save(inventory);
        em.flush();
    }

    private InventoryTransaction record(InventoryMovement movement, String idempotencyKey) {
        InventoryTransaction transaction = new InventoryTransaction();
        transaction.setWarehouseId(movement.warehouseId());
        transaction.setProductId(movement.productId());
        transaction.setQuantityDelta(movement.quantityDelta());
        transaction.setTransactionType(movement.transactionType());
        transaction.setOrderItemId(movement.orderItemId());
        transaction.setGoodsReceiptItemId(movement.goodsReceiptItemId());
        transaction.setIdempotencyKey(idempotencyKey);
        transaction.setReversesTransactionId(movement.reversesTransactionId());
        transaction.setActorAccountId(movement.actor());
        transaction.setReason(normalizeReason(movement.reason()));
        return transactions.save(transaction);
    }

    static List<StockLine> sortByProductAndSourceId(List<StockLine> lines) {
        return lines.stream()
                .sorted(
                        Comparator.comparing(StockLine::productId)
                                .thenComparing(
                                        line ->
                                                line.orderItemId() != null
                                                        ? line.orderItemId()
                                                        : line.goodsReceiptItemId() != null
                                                                ? line.goodsReceiptItemId()
                                                                : 0L))
                .toList();
    }

    static String normalizeReason(String reason) {
        if (reason == null || reason.isBlank()) return null;
        String trimmed = reason.trim();
        return trimmed.length() <= 80 ? trimmed : trimmed.substring(0, 80);
    }

    record InventoryMovement(
            Long actor,
            Long warehouseId,
            Long productId,
            int quantityDelta,
            String transactionType,
            Long orderItemId,
            Long goodsReceiptItemId,
            Long reversesTransactionId,
            String reason) {}
}
