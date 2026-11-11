package com.fido.modules.inventory.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.util.List;

public class GoodsReceiptPatchRequest {
    @Positive private Long supplierId;
    @Valid private List<ItemInput> items;
    private boolean itemsPresent;

    public Long getSupplierId() { return supplierId; }

    @JsonSetter(value = "supplier_id", nulls = Nulls.FAIL)
    public void setSupplierId(Long value) { supplierId = value; }

    public List<ItemInput> getItems() { return items; }

    @JsonSetter(value = "items", nulls = Nulls.FAIL)
    public void setItems(List<ItemInput> value) {
        items = value;
        itemsPresent = true;
    }

    @JsonIgnore
    public boolean isItemsPresent() { return itemsPresent; }

    public record ItemInput(
            @NotNull @Positive Long product_id,
            @NotNull @Positive Integer quantity_received,
            @NotNull @PositiveOrZero Long unit_cost) {}
}
