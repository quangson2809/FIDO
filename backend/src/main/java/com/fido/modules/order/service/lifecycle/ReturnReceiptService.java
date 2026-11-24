package com.fido.modules.order.service.lifecycle;

import com.fido.modules.audit.service.*;
import com.fido.modules.inventory.service.stock.InventoryCommandService;
import com.fido.modules.inventory.service.stock.InventoryCommandService.StockLine;
import com.fido.modules.order.dto.request.ReturnReceiptRequest;
import com.fido.modules.order.dto.response.ReturnReceiptDto;
import com.fido.modules.order.repository.*;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
@Transactional
public class ReturnReceiptService {
    private final OrderRepository orders;
    private final OrderItemRepository items;
    private final com.fido.modules.inventory.service.InventoryMovementQueryService movements;
    private final ReturnReceiptRepository receipts;
    private final InventoryCommandService inventory;
    private final AuditWriteService audit;

    public ReturnReceiptService(
            OrderRepository orders,
            OrderItemRepository items,
            ReturnReceiptRepository receipts,
            InventoryCommandService inventory,
            AuditWriteService audit,
            com.fido.modules.inventory.service.InventoryMovementQueryService movements) {
        this.movements = movements;
        this.orders = orders;
        this.items = items;
        this.receipts = receipts;
        this.inventory = inventory;
        this.audit = audit;
    }

    @PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_ORDER_READ')")
    @Transactional(readOnly = true)
    public List<ReturnReceiptDto> list(long orderId) {
        orders.findById(orderId)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));
        return receipts.list(orderId);
    }

    @PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_INVENTORY_WRITE')")
    public ReturnReceiptDto receive(long actor, long orderId, ReturnReceiptRequest request) {
        var order =
                orders.findByIdForUpdate(orderId)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));
        String fingerprint = fingerprint(request);
        var prior = receipts.prior(orderId, request.source_operation_id());
        if (prior.isPresent()) {
            if (!prior.get().fingerprint().equals(fingerprint))
                throw conflict("RETURN_IDEMPOTENCY_CONFLICT");
            return receipts.list(orderId).stream()
                    .filter(r -> r.id() == prior.get().id())
                    .findFirst()
                    .orElseThrow();
        }
        if (!Set.of("CANCELLED", "RETURNED").contains(order.getOrderStatus()))
            throw conflict("RETURN_ORDER_STATE_INVALID");
        var source = new HashMap<Long, com.fido.modules.order.entity.OrderItem>();
        items.findAllByOrderIdForUpdate(orderId).forEach(i -> source.put(i.getOrderItemId(), i));
        var seen = new HashSet<Long>();
        for (var line : request.items()) {
            var item = source.get(line.order_item_id());
            if (item == null
                    || !seen.add(line.order_item_id())
                    || line.received_quantity() <= 0
                    || line.sellable_quantity() < 0
                    || line.sellable_quantity() > line.received_quantity())
                throw conflict("RETURN_SOURCE_INVALID");
            if (!movements.hasOrderDeduction(item.getOrderItemId(), item.getQuantity())
                    || receipts.previouslyReceived(item.getOrderItemId())
                                    + movements.cancellationRestoredQuantity(item.getOrderItemId())
                                    + line.received_quantity()
                            > item.getQuantity()) throw conflict("RETURN_QUANTITY_EXCEEDED");
        }
        long id =
                receipts.create(
                        orderId,
                        request.source_operation_id(),
                        fingerprint,
                        actor,
                        AuditPayloadPolicy.redactReason(request.reason()));
        var sellable = new ArrayList<StockLine>();
        for (var line : request.items()) {
            receipts.line(
                    id, line.order_item_id(), line.received_quantity(), line.sellable_quantity());
            if (line.sellable_quantity() > 0)
                sellable.add(
                        new StockLine(
                                source.get(line.order_item_id()).getProductId(),
                                line.sellable_quantity(),
                                line.order_item_id()));
        }
        inventory.receiveReturnedStock(actor, orderId, id, sellable);
        audit.record(
                AuditWriteEvent.withChanges(
                        AuditAction.ORDER_DELIVERY_RETURN_IN,
                        AuditEntityType.ORDER,
                        Long.toString(orderId),
                        Map.of(),
                        Map.of(
                                "reason",
                                request.reason(),
                                "item_count",
                                request.items().size(),
                                "received_quantity",
                                request.items().stream()
                                        .mapToLong(ReturnReceiptRequest.Line::received_quantity)
                                        .sum(),
                                "sellable_quantity",
                                request.items().stream()
                                        .mapToLong(ReturnReceiptRequest.Line::sellable_quantity)
                                        .sum())));
        return receipts.list(orderId).stream().filter(r -> r.id() == id).findFirst().orElseThrow();
    }

    private String fingerprint(ReturnReceiptRequest request) {
        StringBuilder value = new StringBuilder(request.reason().trim());
        request.items().stream()
                .sorted(Comparator.comparing(ReturnReceiptRequest.Line::order_item_id))
                .forEach(
                        l ->
                                value.append(';')
                                        .append(l.order_item_id())
                                        .append(':')
                                        .append(l.received_quantity())
                                        .append(':')
                                        .append(l.sellable_quantity()));
        try {
            return HexFormat.of()
                    .formatHex(
                            java.security.MessageDigest.getInstance("SHA-256")
                                    .digest(
                                            value.toString()
                                                    .getBytes(
                                                            java.nio.charset.StandardCharsets
                                                                    .UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static ResponseStatusException conflict(String code) {
        return new ResponseStatusException(HttpStatus.CONFLICT, code);
    }
}
