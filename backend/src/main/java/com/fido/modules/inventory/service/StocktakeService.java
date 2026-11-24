package com.fido.modules.inventory.service;

import com.fido.modules.audit.service.*;
import com.fido.modules.inventory.dto.request.StocktakeRequest;
import com.fido.modules.inventory.dto.response.StocktakeDto;
import com.fido.modules.inventory.repository.StocktakeRepository;
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
public class StocktakeService {
    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_INVENTORY_WRITE')";
    private final StocktakeRepository counts;
    private final InventoryAvailabilityService availability;
    private final InventoryProductAccessService products;
    private final InventoryCommandService commands;
    private final OperationalWarehouseService warehouse;
    private final AuditWriteService audit;

    public StocktakeService(
            StocktakeRepository counts,
            InventoryAvailabilityService availability,
            InventoryProductAccessService products,
            InventoryCommandService commands,
            OperationalWarehouseService warehouse,
            AuditWriteService audit) {
        this.counts = counts;
        this.availability = availability;
        this.products = products;
        this.commands = commands;
        this.warehouse = warehouse;
        this.audit = audit;
    }

    @PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_INVENTORY_READ')")
    @Transactional(readOnly = true)
    public List<StocktakeDto> list() {
        return counts.list();
    }

    @PreAuthorize(WRITE)
    public StocktakeDto create(long actor, StocktakeRequest request) {
        var lines =
                request.items().stream()
                        .sorted(Comparator.comparing(StocktakeRequest.Line::product_id))
                        .toList();
        if (lines.stream().map(StocktakeRequest.Line::product_id).distinct().count()
                != lines.size()) throw bad("STOCKTAKE_DUPLICATE_PRODUCT");
        String hash = hash(request.reason().trim() + lines.toString());
        // Lock all products before source-key lookup, so same operation and source rows serialize.
        for (var line : lines) products.lockTrackedProduct(line.product_id());
        var prior = counts.prior(request.source_operation_id());
        if (prior.isPresent()) {
            if (!hash.equals(prior.get().fingerprint()))
                throw conflict("STOCKTAKE_IDEMPOTENCY_CONFLICT");
            return counts.detail(prior.get().id(), false);
        }
        long id;
        try {
            id =
                    counts.create(
                            warehouse.requireOperationalWarehouseId(),
                            request.source_operation_id(),
                            hash,
                            AuditPayloadPolicy.redactReason(request.reason()),
                            actor);
        } catch (org.springframework.dao.DuplicateKeyException duplicate) {
            throw conflict("STOCKTAKE_IDEMPOTENCY_CONFLICT");
        }
        for (var line : lines) {
            var balance = availability.balance(line.product_id());
            if (balance.version() != line.expected_version())
                throw conflict("INVENTORY_STALE_VERSION");
            counts.line(
                    id,
                    line.product_id(),
                    balance.quantityOnHand(),
                    balance.version(),
                    line.counted_quantity());
        }
        audit.record(
                AuditWriteEvent.withChanges(
                        AuditAction.STOCKTAKE_CREATE,
                        AuditEntityType.STOCKTAKE,
                        Long.toString(id),
                        Map.of(),
                        Map.of(
                                "status",
                                "DRAFT",
                                "item_count",
                                lines.size(),
                                "reason",
                                request.reason())));
        return counts.detail(id, false);
    }

    @PreAuthorize(WRITE)
    public StocktakeDto act(long actor, long id, String action) {
        var count = counts.detail(id, true);
        if (!"DRAFT".equals(count.status())) throw conflict("STOCKTAKE_STATE_CONFLICT");
        if ("CANCEL".equals(action)) {
            counts.cancel(id);
        } else if ("CONFIRM".equals(action)) {
            for (var line : count.items()) products.lockTrackedProduct(line.product_id());
            for (var line : count.items()) {
                var balance = availability.balance(line.product_id());
                if (balance.version() != line.expected_version()
                        || balance.quantityOnHand() != line.expected_quantity())
                    throw conflict("INVENTORY_STALE_VERSION");
            }
            for (var line : count.items())
                commands.postCountDifference(actor, id, line.product_id(), line.difference());
            counts.confirm(id, actor);
        } else throw bad("STOCKTAKE_ACTION_INVALID");
        var result = counts.detail(id, false);
        audit.record(
                AuditWriteEvent.withChanges(
                        AuditAction.STOCKTAKE_CONFIRM,
                        AuditEntityType.STOCKTAKE,
                        Long.toString(id),
                        Map.of("status", "DRAFT"),
                        Map.of("status", result.status(), "item_count", count.items().size())));
        return result;
    }

    public static String hash(String value) {
        try {
            return HexFormat.of()
                    .formatHex(
                            java.security.MessageDigest.getInstance("SHA-256")
                                    .digest(
                                            value.getBytes(
                                                    java.nio.charset.StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static ResponseStatusException conflict(String c) {
        return new ResponseStatusException(HttpStatus.CONFLICT, c);
    }

    private static ResponseStatusException bad(String c) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, c);
    }
}
