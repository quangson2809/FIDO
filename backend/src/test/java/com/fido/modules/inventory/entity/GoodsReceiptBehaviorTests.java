package com.fido.modules.inventory.entity;

import static org.junit.jupiter.api.Assertions.*;

import com.fido.common.exception.BusinessRuleException;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

class GoodsReceiptBehaviorTests {
    @Test
    void missingConfirmationFactsCannotLeaveADraftPartiallyConfirmed() {
        GoodsReceipt receipt = new GoodsReceipt();
        var now = LocalDateTime.of(2026, 11, 18, 0, 0);
        assertThrows(BusinessRuleException.class, () -> receipt.confirm(null, now));
        assertThrows(BusinessRuleException.class, () -> receipt.confirm(5L, null));
        assertEquals("DRAFT", receipt.getReceiptStatus());
        assertNull(receipt.getConfirmedByAccountId());
        assertNull(receipt.getConfirmedAt());
    }

    @Test
    void confirmedReceiptCannotChangeSupplierOrBeConfirmedOrCancelledAgain() {
        GoodsReceipt receipt = new GoodsReceipt();
        receipt.changeSupplier(3L);
        LocalDateTime now = LocalDateTime.of(2026, 11, 18, 0, 0);
        receipt.confirm(5L, now);
        assertThrows(BusinessRuleException.class, () -> receipt.changeSupplier(4L));
        assertThrows(BusinessRuleException.class, receipt::requireEditable);
        assertThrows(BusinessRuleException.class, () -> receipt.confirm(6L, now.plusDays(1)));
        assertThrows(BusinessRuleException.class, () -> receipt.cancel(now));
        assertEquals("CONFIRMED", receipt.getReceiptStatus());
        assertEquals(3L, receipt.getSupplierId());
        assertEquals(5L, receipt.getConfirmedByAccountId());
        assertEquals(now, receipt.getConfirmedAt());
    }

    @Test
    void cancelledReceiptCannotBeEditedOrConfirmed() {
        GoodsReceipt receipt = new GoodsReceipt();
        receipt.cancel(LocalDateTime.of(2026, 11, 18, 0, 0));
        assertThrows(BusinessRuleException.class, () -> receipt.changeSupplier(4L));
        assertThrows(BusinessRuleException.class, () -> receipt.confirm(5L, LocalDateTime.now()));
        assertEquals("CANCELLED", receipt.getReceiptStatus());
        assertNull(receipt.getConfirmedAt());
    }
}
