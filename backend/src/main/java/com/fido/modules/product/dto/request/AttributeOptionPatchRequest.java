package com.fido.modules.product.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public class AttributeOptionPatchRequest {
    @Pattern(regexp = ".*\\S.*")
    @Size(max = 150)
    private String label;
    @PositiveOrZero
    private Integer sortOrder;
    private boolean labelPresent;
    private boolean sortOrderPresent;

    public String getLabel() { return label; }

    @JsonSetter(value = "label", nulls = Nulls.FAIL)
    public void setLabel(String value) {
        label = value;
        labelPresent = true;
    }

    public Integer getSortOrder() { return sortOrder; }

    @JsonSetter(value = "sort_order", nulls = Nulls.FAIL)
    public void setSortOrder(Integer value) {
        sortOrder = value;
        sortOrderPresent = true;
    }

    @JsonIgnore public boolean isLabelPresent() { return labelPresent; }
    @JsonIgnore public boolean isSortOrderPresent() { return sortOrderPresent; }

    @JsonIgnore
    public boolean hasChanges() {
        return labelPresent || sortOrderPresent;
    }
}
