package com.fido.modules.inventory.service;

import static com.fido.modules.inventory.service.InventoryPostingService.normalizeReason;
import static com.fido.modules.inventory.service.InventoryPostingService.sortByProductAndSourceId;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEntityType;
import com.fido.modules.audit.service.AuditWriteEvent;
import com.fido.modules.audit.service.AuditWriteService;
import com.fido.modules.inventory.entity.InventoryTransaction;
import com.fido.modules.inventory.repository.InventoryTransactionRepository;
import com.fido.modules.inventory.service.InventoryCommandService.StockLine;
import com.fido.modules.inventory.service.InventoryPostingService.InventoryMovement;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Component
class InventoryOrderWorkflow {
    private final InventoryTransactionRepository transactions;
    private final OperationalWarehouseService operationalWarehouse;
    private final AuditWriteService audit;
    private final InventoryPostingService posting;

    InventoryOrderWorkflow(
            InventoryTransactionRepository transactions,
            OperationalWarehouseService operationalWarehouse,
            AuditWriteService audit,
            InventoryPostingService posting) {
        this.transactions = transactions;
        this.operationalWarehouse = operationalWarehouse;
        this.audit = audit;
        this.posting = posting;
    }

    void deductConfirmedOrder(Long actor, Long orderId, List<StockLine> lines, String reason) {
        if (actor == null
                || actor <= 0
                || orderId == null
                || orderId <= 0
                || lines == null
                || lines.isEmpty()
                || !"ORDER_CONFIRM".equals(reason)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "INVENTORY_ORDER_SOURCE_INVALID");
        }
        Map<Long, StockLine> expected = orderLines(lines);
        List<Long> itemIds = List.copyOf(expected.keySet());
        if (!transactions
                .findAllByOrderItemIdInAndTransactionType(
                        itemIds, InventoryPolicy.ORDER_CONFIRM_OUT)
                .isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "INVENTORY_ORDER_MOVEMENT_CONFLICT");
        }
        for (StockLine line : expected.values()) {
            if (transactions
                    .findByIdempotencyKey(
                            orderMovementKey(
                                    orderId, line.orderItemId(), InventoryPolicy.ORDER_CONFIRM_OUT))
                    .isPresent()) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT, "INVENTORY_ORDER_MOVEMENT_CONFLICT");
            }
        }

        Long warehouseId = operationalWarehouse.requireOperationalWarehouseId();
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        for (StockLine line : sortByProductAndSourceId(expected.values().stream().toList())) {
            int delta = -line.quantity();
            posting.post(
                    new InventoryMovement(
                            actor,
                            warehouseId,
                            line.productId(),
                            delta,
                            InventoryPolicy.ORDER_CONFIRM_OUT,
                            line.orderItemId(),
                            null,
                            null,
                            "ORDER_CONFIRM"),
                    now,
                    orderMovementKey(
                            orderId, line.orderItemId(), InventoryPolicy.ORDER_CONFIRM_OUT));
        }
    }

    void requireConfirmedOrderMovements(Long orderId, List<StockLine> lines) {
        if (orderId == null || orderId <= 0 || lines == null || lines.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "INVENTORY_ORDER_SOURCE_INVALID");
        }
        Map<Long, StockLine> expected = orderLines(lines);
        List<InventoryTransaction> posted =
                transactions.findAllByOrderItemIdInAndTransactionType(
                        List.copyOf(expected.keySet()), InventoryPolicy.ORDER_CONFIRM_OUT);
        if (posted.size() != expected.size()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "INVENTORY_ORDER_MOVEMENT_INVALID");
        }
        Set<Long> seen = new HashSet<>();
        for (InventoryTransaction movement : posted) {
            StockLine line = expected.get(movement.getOrderItemId());
            if (line == null
                    || !seen.add(movement.getOrderItemId())
                    || !Objects.equals(movement.getProductId(), line.productId())
                    || !Objects.equals(movement.getQuantityDelta(), -line.quantity())
                    || movement.getReversesTransactionId() != null
                    || !Objects.equals(
                            movement.getIdempotencyKey(),
                            orderMovementKey(
                                    orderId, line.orderItemId(), InventoryPolicy.ORDER_CONFIRM_OUT))
                    || !transactions
                            .findAllByReversesTransactionId(movement.getTxnId())
                            .isEmpty()) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT, "INVENTORY_ORDER_MOVEMENT_INVALID");
            }
        }
    }

    private Map<Long, StockLine> orderLines(List<StockLine> lines) {
        Map<Long, StockLine> byItem = new java.util.LinkedHashMap<>();
        for (StockLine line : lines) {
            if (line == null
                    || line.orderItemId() == null
                    || byItem.putIfAbsent(line.orderItemId(), line) != null) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT, "INVENTORY_ORDER_SOURCE_INVALID");
            }
        }
        if (byItem.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "INVENTORY_ORDER_SOURCE_INVALID");
        }
        return byItem;
    }

    private String orderMovementKey(Long orderId, Long orderItemId, String transactionType) {
        return "order:" + orderId + ":item:" + orderItemId + ":" + transactionType;
    }

    void restoreCancelledOrder(Long actor, Long orderId, List<StockLine> lines, String reason) {
        if (actor == null
                || actor <= 0
                || orderId == null
                || orderId <= 0
                || lines == null
                || lines.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "INVENTORY_ORDER_SOURCE_INVALID");
        }

        Map<Long, StockLine> expected = orderLines(lines);
        requireConfirmedOrderMovements(orderId, lines);
        List<Long> itemIds = List.copyOf(expected.keySet());
        List<InventoryTransaction> originals =
                transactions
                        .findAllByOrderItemIdInAndTransactionType(
                                itemIds, InventoryPolicy.ORDER_CONFIRM_OUT)
                        .stream()
                        .sorted(
                                Comparator.comparing(InventoryTransaction::getProductId)
                                        .thenComparing(InventoryTransaction::getWarehouseId)
                                        .thenComparing(InventoryTransaction::getTxnId))
                        .toList();
        if (originals.size() != expected.size()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "INVENTORY_ORDER_MOVEMENT_INVALID");
        }

        // Reject every missing, changed, or already reversed source before mutating any balance.
        for (InventoryTransaction original : originals) {
            StockLine line = expected.get(original.getOrderItemId());
            String key = orderCancellationReversalKey(original.getTxnId());
            if (line == null
                    || !Objects.equals(original.getProductId(), line.productId())
                    || !Objects.equals(original.getQuantityDelta(), -line.quantity())
                    || original.getReversesTransactionId() != null
                    || !transactions.findAllByReversesTransactionId(original.getTxnId()).isEmpty()
                    || transactions.findByIdempotencyKey(key).isPresent()) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT, "INVENTORY_ORDER_MOVEMENT_CONFLICT");
            }
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        for (InventoryTransaction original : originals) {
            int delta = Math.negateExact(original.getQuantityDelta());
            String key = orderCancellationReversalKey(original.getTxnId());

            InventoryTransaction reversal =
                    posting.post(
                            new InventoryMovement(
                                    actor,
                                    original.getWarehouseId(),
                                    original.getProductId(),
                                    delta,
                                    InventoryPolicy.ORDER_CANCEL_IN,
                                    original.getOrderItemId(),
                                    null,
                                    original.getTxnId(),
                                    reason),
                            now,
                            key,
                            "INVENTORY_ORDER_MOVEMENT_CONFLICT");

            audit.record(
                    AuditWriteEvent.withChanges(
                            AuditAction.INVENTORY_ORDER_CANCEL_REVERSAL,
                            AuditEntityType.INVENTORY_TRANSACTION,
                            reversal.getTxnId().toString(),
                            Map.of(
                                    "product_id", original.getProductId(),
                                    "warehouse_id", original.getWarehouseId(),
                                    "quantity_delta", original.getQuantityDelta()),
                            Map.of(
                                    "product_id", reversal.getProductId(),
                                    "warehouse_id", reversal.getWarehouseId(),
                                    "quantity_delta", reversal.getQuantityDelta(),
                                    "reason_code", normalizeReason(reason))));
        }
    }

    private String orderCancellationReversalKey(Long originalTransactionId) {
        return "order-cancel-reversal:" + originalTransactionId;
    }

    void restoreDeliveryReturn(Long actor, Long orderId, List<StockLine> lines, String reason) {
        restoreOrderStock(actor, orderId, lines, InventoryPolicy.DELIVERY_RETURN_IN, reason);
    }

    private void restoreOrderStock(
            Long actor,
            Long orderId,
            List<StockLine> lines,
            String transactionType,
            String reason) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        List<Long> itemIds =
                lines.stream()
                        .map(StockLine::orderItemId)
                        .filter(java.util.Objects::nonNull)
                        .distinct()
                        .toList();

        if (!itemIds.isEmpty()) {
            var originalMovements =
                    transactions
                            .findAllByOrderItemIdInAndTransactionType(
                                    itemIds, InventoryPolicy.ORDER_CONFIRM_OUT)
                            .stream()
                            .sorted(
                                    Comparator.comparing(InventoryTransaction::getProductId)
                                            .thenComparing(InventoryTransaction::getWarehouseId)
                                            .thenComparing(InventoryTransaction::getTxnId))
                            .toList();
            for (InventoryTransaction original : originalMovements) {
                int quantity = Math.negateExact(original.getQuantityDelta());
                posting.post(
                        new InventoryMovement(
                                actor,
                                original.getWarehouseId(),
                                original.getProductId(),
                                quantity,
                                transactionType,
                                original.getOrderItemId(),
                                null,
                                original.getTxnId(),
                                reason),
                        now,
                        UUID.randomUUID().toString());
            }
            return;
        }

        // Compatibility callers without OrderItem references use the server-resolved warehouse.
        Long warehouseId = operationalWarehouse.requireOperationalWarehouseId();
        for (StockLine line : sortByProductAndSourceId(lines)) {
            posting.post(
                    new InventoryMovement(
                            actor,
                            warehouseId,
                            line.productId(),
                            line.quantity(),
                            transactionType,
                            null,
                            null,
                            null,
                            reason),
                    now,
                    UUID.randomUUID().toString());
        }
    }
}
