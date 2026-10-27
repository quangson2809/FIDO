package com.fido.modules.product;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fido.modules.inventory.repository.InventoryRepository;
import com.fido.modules.inventory.service.InventoryAvailabilityService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

class InventoryProductIdIntegrationTests extends CatalogHttpSupport {

    @Autowired InventoryRepository inventories;
    @Autowired InventoryAvailabilityService availability;

    @Test
    void stockRowsAndAvailabilityAreKeyedByProductAndWarehouseWithoutVariantTables() throws Exception {
        long catalogWrite = ensurePermission("CATALOG_WRITE");
        long catalogRead = ensurePermission("CATALOG_READ");
        long inventoryRead = ensurePermission("INVENTORY_READ");
        long inventoryWrite = ensurePermission("INVENTORY_WRITE");
        long roleId = customRole(catalogWrite);
        db.update("INSERT INTO role_permissions(role_id,permission_id) VALUES (?,?)", roleId, catalogRead);
        db.update("INSERT INTO role_permissions(role_id,permission_id) VALUES (?,?)", roleId, inventoryRead);
        db.update("INSERT INTO role_permissions(role_id,permission_id) VALUES (?,?)", roleId, inventoryWrite);
        Employee writer = employee(roleId);
        CatalogFixture fixture = createCatalog(writer);

        String suffix = UUID.randomUUID().toString().replace("-", "");
        long firstWarehouse = db.queryForObject(
                "SELECT id FROM warehouses WHERE status='ACTIVE' ORDER BY id LIMIT 1", Long.class);
        long secondWarehouse = createWarehouse("P32-B-" + suffix, "P3.2 warehouse B");
        db.update("UPDATE warehouses SET status='INACTIVE' WHERE id=?", secondWarehouse);
        db.update(
                "INSERT INTO inventories(warehouse_id,product_id,quantity_on_hand,version) VALUES (?,?,?,0)",
                firstWarehouse, fixture.productId(), 7);
        db.update(
                "INSERT INTO inventories(warehouse_id,product_id,quantity_on_hand,version) VALUES (?,?,?,0)",
                secondWarehouse, fixture.productId(), 4);

        String sku = fixture.createProductResponse().data().get("data").get("sku").asText();
        var allWarehouses = inventories.search(
                fixture.productId(), sku, null, PageRequest.of(0, 10));
        assertEquals(2, allWarehouses.getTotalElements());
        assertTrue(allWarehouses.getContent().stream()
                .allMatch(row -> row.getProductId().equals(fixture.productId())));
        assertEquals(
                Set.of(firstWarehouse, secondWarehouse),
                allWarehouses.getContent().stream().map(row -> row.getWarehouseId()).collect(Collectors.toSet()));
        assertEquals(7, availability.availableQuantity(fixture.productId()));

        var oneWarehouse = inventories.search(
                fixture.productId(), null, firstWarehouse, PageRequest.of(0, 10));
        assertEquals(1, oneWarehouse.getTotalElements());
        assertEquals(7, oneWarehouse.getContent().get(0).getAvailableQuantity());

        var adjustment = call("POST", "/api/v1/admin/inventory/adjustments", writer.token(),
                Map.of("product_id", fixture.productId(),
                        "quantity_delta", 3, "reason_code", "COUNT_CORRECTION", "source_operation_id", "p32-" + UUID.randomUUID()));
        assertEquals(201, adjustment.status(), adjustment.body());
        assertEquals(fixture.productId(),
                adjustment.data().get("data").get("product_id").asLong());
        assertEquals(firstWarehouse,
                adjustment.data().get("data").get("warehouse_id").asLong());
        assertEquals("ADJUSTMENT",
                adjustment.data().get("data").get("transaction_type").asText());

        var adjustedStock = inventories.search(
                fixture.productId(), null, firstWarehouse, PageRequest.of(0, 10));
        assertEquals(10, adjustedStock.getContent().get(0).getAvailableQuantity());
    }

    @Test
    void goodsReceiptUsesProductIdWarehouseAndIntegerVndUnitCost() throws Exception {
        long catalogWrite = ensurePermission("CATALOG_WRITE");
        long catalogRead = ensurePermission("CATALOG_READ");
        long inventoryRead = ensurePermission("INVENTORY_READ");
        long inventoryWrite = ensurePermission("INVENTORY_WRITE");
        long roleId = customRole(catalogWrite);
        for (long permissionId : List.of(catalogRead, inventoryRead, inventoryWrite)) {
            db.update("INSERT INTO role_permissions(role_id,permission_id) VALUES (?,?)",
                    roleId, permissionId);
        }
        Employee writer = employee(roleId);
        CatalogFixture fixture = createCatalog(writer);

        String suffix = UUID.randomUUID().toString().replace("-", "");
        long warehouseId = db.queryForObject(
                "SELECT id FROM warehouses WHERE status='ACTIVE' ORDER BY id LIMIT 1", Long.class);
        String supplierCode = "SUP-P32-" + suffix;
        db.update("INSERT INTO suppliers(code,name,status) VALUES (?,?,'ACTIVE')",
                supplierCode, "P3.2 receipt supplier");
        long supplierId = db.queryForObject(
                "SELECT id FROM suppliers WHERE code=?", Long.class, supplierCode);
        suppliers.add(supplierId);

        var created = call("POST", "/api/v1/admin/goods-receipts", writer.token(),
                Map.of("supplier_id", supplierId,
                        "items", List.of(Map.of("product_id", fixture.productId(),
                                "quantity_received", 3, "unit_cost", 55000))));
        assertEquals(201, created.status(), created.body());
        long receiptId = created.data().get("data").get("receipt_id").asLong();
        receipts.add(receiptId);
        assertEquals(warehouseId, created.data().get("data").get("warehouse_id").asLong());
        assertEquals(fixture.productId(),
                created.data().get("data").get("items").get(0).get("product_id").asLong());
        assertEquals(55000,
                created.data().get("data").get("items").get(0).get("unit_cost").asLong());

        var confirmed = call("POST",
                "/api/v1/admin/goods-receipts/" + receiptId + "/actions",
                writer.token(), Map.of("action", "CONFIRM"));
        assertEquals(200, confirmed.status(), confirmed.body());
        var stock = inventories.search(
                fixture.productId(), null, warehouseId, PageRequest.of(0, 10));
        assertEquals(1, stock.getTotalElements());
        assertEquals(3, stock.getContent().get(0).getAvailableQuantity());
        assertEquals(1, db.queryForObject(
                "SELECT COUNT(*) FROM inventory_transactions WHERE product_id=? AND warehouse_id=? "
                        + "AND transaction_type='GOODS_RECEIPT'",
                Integer.class, fixture.productId(), warehouseId));
    }

    private long createWarehouse(String code, String name) {
        db.update("INSERT INTO warehouses(code,name,status) VALUES (?,?, 'ACTIVE')", code, name);
        long id = db.queryForObject("SELECT id FROM warehouses WHERE code=?", Long.class, code);
        warehouses.add(id);
        return id;
    }
}
