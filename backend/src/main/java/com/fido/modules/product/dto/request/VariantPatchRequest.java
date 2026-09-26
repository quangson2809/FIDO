package com.fido.modules.product.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;

public class VariantPatchRequest {

    @DecimalMin("0.0")
    private BigDecimal overridePrice;

    @Pattern(regexp = "ON_SALE|STOPPED")
    private String saleStatus;

    private boolean overridePricePresent;

    public BigDecimal getOverridePrice() {
        return overridePrice;
    }

    @JsonSetter("override_price")
    public void setOverridePrice(BigDecimal value) {
        overridePrice = value;
        overridePricePresent = true;
    }

    public String getSaleStatus() {
        return saleStatus;
    }

    @JsonSetter(
            value = "sale_status",
            nulls = Nulls.FAIL
    )
    public void setSaleStatus(String value) {
        saleStatus = value;
    }

    @JsonIgnore
    public boolean isOverridePricePresent() {
        return overridePricePresent;
    }
}
