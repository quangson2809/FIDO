package com.fido.modules.inventory.service;

import com.fido.modules.audit.service.*;
import com.fido.modules.inventory.dto.request.ReceiptCorrectionRequest;
import com.fido.modules.inventory.dto.response.ReceiptCorrectionDto;
import com.fido.modules.inventory.repository.*;
import com.fido.modules.inventory.service.stock.InventoryCommandService;
import com.fido.modules.product.service.InventoryProductAccessService;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
@Transactional
public class ReceiptCorrectionService {
    private final GoodsReceiptRepository receipts;
    private final GoodsReceiptItemRepository items;
    private final ReceiptCorrectionRepository corrections;
    private final InventoryCommandService inventory;
    private final InventoryProductAccessService products;
    private final AuditWriteService audit;

    public ReceiptCorrectionService(
            GoodsReceiptRepository receipts,
            GoodsReceiptItemRepository items,
            ReceiptCorrectionRepository corrections,
            InventoryCommandService inventory,
            InventoryProductAccessService products,
            AuditWriteService audit) {
        this.receipts = receipts;
        this.items = items;
        this.corrections = corrections;
        this.inventory = inventory;
        this.products = products;
        this.audit = audit;
    }

    @PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_INVENTORY_READ')")
    @Transactional(readOnly = true)
    public List<ReceiptCorrectionDto> list(long receipt) {
        receipts.findById(receipt)
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND, "RECEIPT_NOT_FOUND"));
        return corrections.list(receipt);
    }

    @PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_INVENTORY_WRITE')")
    public ReceiptCorrectionDto correct(
            long actor, long receiptId, ReceiptCorrectionRequest request) {
        var receipt =
                receipts.findByIdForUpdate(receiptId)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "RECEIPT_NOT_FOUND"));
        var requested =
                request.items().stream()
                        .sorted(
                                Comparator.comparing(
                                        ReceiptCorrectionRequest.Line::receipt_item_id))
                        .toList();
        String hash =
                StocktakeService.hash(
                        request.reason().trim()
                                + ":"
                                + request.expected_correction_id()
                                + requested.toString());
        var prior = corrections.prior(receiptId, request.source_operation_id());
        if (prior.isPresent()) {
            if (!prior.get().fingerprint().equals(hash))
                throw conflict("CORRECTION_IDEMPOTENCY_CONFLICT");
            return corrections.list(receiptId).stream()
                    .filter(c -> c.id() == prior.get().id())
                    .findFirst()
                    .orElseThrow();
        }
        if (!"CONFIRMED".equals(receipt.getReceiptStatus()))
            throw conflict("CORRECTION_REQUIRES_CONFIRMED_RECEIPT");
        if (!Objects.equals(corrections.latest(receiptId), request.expected_correction_id()))
            throw conflict("CORRECTION_STALE_SOURCE");
        var source = new HashMap<Long, com.fido.modules.inventory.entity.GoodsReceiptItem>();
        items.findAllByReceiptIdOrderByReceiptItemIdAsc(receiptId)
                .forEach(i -> source.put(i.getReceiptItemId(), i));
        var seen = new HashSet<Long>();
        var resultLines = new ArrayList<ReceiptCorrectionDto.Line>();
        for (var line : requested) {
            var original = source.get(line.receipt_item_id());
            if (original == null || !seen.add(line.receipt_item_id()))
                throw conflict("CORRECTION_SOURCE_INVALID");
            var previous = corrections.latestLine(original.getReceiptItemId());
            int before =
                    previous.map(ReceiptCorrectionDto.Line::corrected_quantity)
                            .orElse(original.getQuantity());
            long cost =
                    previous.map(ReceiptCorrectionDto.Line::corrected_unit_cost)
                            .orElse(original.getUnitCost());
            long value;
            try {
                value =
                        Math.subtractExact(
                                Math.multiplyExact(
                                        (long) line.corrected_quantity(),
                                        line.corrected_unit_cost()),
                                Math.multiplyExact((long) before, cost));
            } catch (ArithmeticException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "MONEY_OVERFLOW");
            }
            if (before == line.corrected_quantity() && cost == line.corrected_unit_cost()) continue;
            resultLines.add(
                    new ReceiptCorrectionDto.Line(
                            original.getReceiptItemId(),
                            before,
                            line.corrected_quantity(),
                            cost,
                            line.corrected_unit_cost(),
                            line.corrected_quantity() - before,
                            value));
        }
        if (resultLines.isEmpty()) throw conflict("CORRECTION_NO_CHANGES");
        resultLines.stream()
                .map(l -> source.get(l.receipt_item_id()).getProductId())
                .distinct()
                .sorted()
                .forEach(products::lockTrackedProduct);
        long id =
                corrections.create(
                        receiptId,
                        request.source_operation_id(),
                        hash,
                        AuditPayloadPolicy.redactReason(request.reason()),
                        actor);
        for (var line : resultLines) {
            corrections.line(id, line);
            inventory.postReceiptCorrection(
                    actor,
                    id,
                    line.receipt_item_id(),
                    source.get(line.receipt_item_id()).getProductId(),
                    line.quantity_delta());
        }
        long valueDelta;
        try {
            long sum = 0;
            for (var l : resultLines) sum = Math.addExact(sum, l.value_delta());
            valueDelta = sum;
        } catch (ArithmeticException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "MONEY_OVERFLOW");
        }
        audit.record(
                AuditWriteEvent.withChanges(
                        AuditAction.GOODS_RECEIPT_CORRECT,
                        AuditEntityType.GOODS_RECEIPT_CORRECTION,
                        Long.toString(id),
                        Map.of(),
                        Map.of(
                                "reason",
                                request.reason(),
                                "item_count",
                                resultLines.size(),
                                "value_delta",
                                valueDelta)));
        return corrections.list(receiptId).stream()
                .filter(c -> c.id() == id)
                .findFirst()
                .orElseThrow();
    }

    private static ResponseStatusException conflict(String code) {
        return new ResponseStatusException(HttpStatus.CONFLICT, code);
    }
}
