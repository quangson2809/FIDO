package com.fido.modules.product.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public class AttributePatchRequest {
    @Pattern(regexp = ".*\\S.*")
    @Size(max = 150)
    private String name;
    private Boolean required;
    private Boolean variantDefining;
    @PositiveOrZero
    private Integer sortOrder;
    private boolean namePresent;
    private boolean requiredPresent;
    private boolean variantDefiningPresent;
    private boolean sortOrderPresent;

    public String getName() { return name; }

    @JsonSetter(value = "name", nulls = Nulls.FAIL)
    public void setName(String value) {
        name = value;
        namePresent = true;
    }

    public Boolean getRequired() { return required; }

    @JsonSetter(value = "is_required", nulls = Nulls.FAIL)
    public void setRequired(Boolean value) {
        required = value;
        requiredPresent = true;
    }

    public Boolean getVariantDefining() { return variantDefining; }

    @JsonSetter(value = "is_variant_defining", nulls = Nulls.FAIL)
    public void setVariantDefining(Boolean value) {
        variantDefining = value;
        variantDefiningPresent = true;
    }

    public Integer getSortOrder() { return sortOrder; }

    @JsonSetter(value = "sort_order", nulls = Nulls.FAIL)
    public void setSortOrder(Integer value) {
        sortOrder = value;
        sortOrderPresent = true;
    }

    @JsonIgnore public boolean isNamePresent() { return namePresent; }
    @JsonIgnore public boolean isRequiredPresent() { return requiredPresent; }
    @JsonIgnore public boolean isVariantDefiningPresent() { return variantDefiningPresent; }
    @JsonIgnore public boolean isSortOrderPresent() { return sortOrderPresent; }

    @JsonIgnore
    public boolean hasChanges() {
        return namePresent || requiredPresent || variantDefiningPresent || sortOrderPresent;
    }
}
