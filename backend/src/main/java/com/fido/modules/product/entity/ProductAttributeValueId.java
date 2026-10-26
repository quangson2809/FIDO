package com.fido.modules.product.entity;

import java.io.Serializable;
import java.util.Objects;

public class ProductAttributeValueId implements Serializable {
    private Long productId;
    private Long attributeId;

    public ProductAttributeValueId() {}

    public ProductAttributeValueId(Long productId, Long attributeId) {
        this.productId = productId;
        this.attributeId = attributeId;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof ProductAttributeValueId that)) return false;
        return Objects.equals(productId, that.productId)
                && Objects.equals(attributeId, that.attributeId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(productId, attributeId);
    }
}
