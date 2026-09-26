package com.fido.modules.inventory.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;
import java.util.List;

public class GoodsReceiptPatchRequest {

    @Positive
    private Long supplierId;

    private LocalDate receiptDate;
    private String note;

    @Valid
    private List<ItemInput> items;

    private boolean notePresent;
    private boolean itemsPresent;

    public Long getSupplierId() {
        return supplierId;
    }

    @JsonSetter(
            value = "supplier_id",
            nulls = Nulls.FAIL
    )
    public void setSupplierId(Long value) {
        supplierId = value;
    }

    public LocalDate getReceiptDate() {
        return receiptDate;
    }

    @JsonSetter(
            value = "receipt_date",
            nulls = Nulls.FAIL
    )
    public void setReceiptDate(LocalDate value) {
        receiptDate = value;
    }

    public String getNote() {
        return note;
    }

    @JsonSetter("note")
    public void setNote(String value) {
        note = value;
        notePresent = true;
    }

    public List<ItemInput> getItems() {
        return items;
    }

    @JsonSetter(
            value = "items",
            nulls = Nulls.FAIL
    )
    public void setItems(List<ItemInput> value) {
        items = value;
        itemsPresent = true;
    }

    @JsonIgnore
    public boolean isNotePresent() {
        return notePresent;
    }

    @JsonIgnore
    public boolean isItemsPresent() {
        return itemsPresent;
    }

    public record ItemInput(
            @NotNull @Positive Long variant_id,
            @NotNull @Positive Integer quantity
    ) {
    }
}
