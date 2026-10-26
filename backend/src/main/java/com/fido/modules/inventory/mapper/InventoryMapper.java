package com.fido.modules.inventory.mapper;

import com.fido.modules.inventory.dto.response.GoodsReceiptDetailDto;
import com.fido.modules.inventory.dto.response.GoodsReceiptItemDto;
import com.fido.modules.inventory.dto.response.GoodsReceiptSummaryDto;
import com.fido.modules.inventory.dto.response.InventoryRowDto;
import com.fido.modules.inventory.dto.response.InventoryTransactionDto;
import com.fido.modules.inventory.dto.response.SupplierDto;
import com.fido.modules.inventory.entity.GoodsReceipt;
import com.fido.modules.inventory.entity.GoodsReceiptItem;
import com.fido.modules.inventory.entity.InventoryTransaction;
import com.fido.modules.inventory.entity.Supplier;
import com.fido.modules.inventory.repository.InventoryRowView;

import java.util.List;

public final class InventoryMapper {
    private InventoryMapper() {}

    public static SupplierDto supplier(Supplier supplier) {
        return new SupplierDto(supplier.getSupplierId(), supplier.getCode(), supplier.getName(),
                supplier.getPhone(), supplier.getEmail(), supplier.getUsageStatus());
    }

    public static GoodsReceiptItemDto receiptItem(GoodsReceiptItem item) {
        return new GoodsReceiptItemDto(
                item.getReceiptItemId(), item.getProductId(), item.getQuantity(), item.getUnitCost());
    }

    public static GoodsReceiptSummaryDto receiptSummary(GoodsReceipt receipt) {
        return new GoodsReceiptSummaryDto(receipt.getReceiptId(), receipt.getReceiptCode(),
                receipt.getSupplierId(), receipt.getWarehouseId(), receipt.getReceiptStatus(),
                receipt.getConfirmedAt(), receipt.getCreatedAt());
    }

    public static GoodsReceiptDetailDto receiptDetail(
            GoodsReceipt receipt, List<GoodsReceiptItemDto> items) {
        return new GoodsReceiptDetailDto(receipt.getReceiptId(), receipt.getReceiptCode(),
                receipt.getSupplierId(), receipt.getWarehouseId(), receipt.getReceiptStatus(),
                receipt.getConfirmedAt(), receipt.getCreatedAt(), receipt.getCreatedByAccountId(),
                receipt.getConfirmedByAccountId(), items, receipt.getUpdatedAt());
    }

    public static InventoryRowDto inventoryRow(InventoryRowView row) {
        return new InventoryRowDto(row.getWarehouseId(), row.getProductId(), row.getSku(),
                row.getProductName(), row.getAvailableQuantity(), row.getVersion(), row.getUpdatedAt());
    }

    public static InventoryTransactionDto transaction(InventoryTransaction transaction) {
        return new InventoryTransactionDto(transaction.getTxnId(), transaction.getProductId(),
                transaction.getWarehouseId(), transaction.getQuantityDelta(), transaction.getTransactionType(),
                transaction.getOrderItemId(), transaction.getGoodsReceiptItemId(),
                transaction.getActorAccountId(), transaction.getReason(), transaction.getCreatedAt());
    }
}
