package com.fido.modules.promotion.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/** Presence-aware partial update. Nullable cap, window bounds and usage_limit can be cleared explicitly. */
public class VoucherPatchRequest {
    @Size(max = 80)
    @Pattern(regexp = ".*\\S.*")
    private String code;
    @Pattern(regexp = "FIXED|PERCENT")
    private String discountType;
    @Positive
    private Long discountValue;
    @PositiveOrZero
    private Long minimumOrderValue;
    @PositiveOrZero
    private Long maximumDiscount;
    private Instant startsAt;
    private Instant endsAt;
    @Positive
    private Integer usageLimit;
    @Pattern(regexp = "DRAFT|ACTIVE|INACTIVE|EXPIRED")
    private String status;

    private boolean codePresent;
    private boolean discountTypePresent;
    private boolean discountValuePresent;
    private boolean minimumOrderValuePresent;
    private boolean maximumDiscountPresent;
    private boolean startsAtPresent;
    private boolean endsAtPresent;
    private boolean usageLimitPresent;
    private boolean statusPresent;

    public String getCode() { return code; }
    @JsonSetter(value = "code", nulls = Nulls.FAIL)
    public void setCode(String value) { code = value; codePresent = true; }

    public String getDiscountType() { return discountType; }
    @JsonSetter(value = "discount_type", nulls = Nulls.FAIL)
    public void setDiscountType(String value) { discountType = value; discountTypePresent = true; }

    public Long getDiscountValue() { return discountValue; }
    @JsonSetter(value = "discount_value", nulls = Nulls.FAIL)
    public void setDiscountValue(Long value) { discountValue = value; discountValuePresent = true; }

    public Long getMinimumOrderValue() { return minimumOrderValue; }
    @JsonSetter(value = "minimum_order_value", nulls = Nulls.FAIL)
    public void setMinimumOrderValue(Long value) { minimumOrderValue = value; minimumOrderValuePresent = true; }

    public Long getMaximumDiscount() { return maximumDiscount; }
    @JsonSetter("maximum_discount")
    public void setMaximumDiscount(Long value) { maximumDiscount = value; maximumDiscountPresent = true; }

    public Instant getStartsAt() { return startsAt; }
    @JsonSetter("starts_at")
    public void setStartsAt(Instant value) { startsAt = value; startsAtPresent = true; }

    public Instant getEndsAt() { return endsAt; }
    @JsonSetter("ends_at")
    public void setEndsAt(Instant value) { endsAt = value; endsAtPresent = true; }

    public Integer getUsageLimit() { return usageLimit; }
    @JsonSetter("usage_limit")
    public void setUsageLimit(Integer value) { usageLimit = value; usageLimitPresent = true; }

    public String getStatus() { return status; }
    @JsonSetter(value = "status", nulls = Nulls.FAIL)
    public void setStatus(String value) { status = value; statusPresent = true; }

    @JsonIgnore public boolean isCodePresent() { return codePresent; }
    @JsonIgnore public boolean isDiscountTypePresent() { return discountTypePresent; }
    @JsonIgnore public boolean isDiscountValuePresent() { return discountValuePresent; }
    @JsonIgnore public boolean isMinimumOrderValuePresent() { return minimumOrderValuePresent; }
    @JsonIgnore public boolean isMaximumDiscountPresent() { return maximumDiscountPresent; }
    @JsonIgnore public boolean isStartsAtPresent() { return startsAtPresent; }
    @JsonIgnore public boolean isEndsAtPresent() { return endsAtPresent; }
    @JsonIgnore public boolean isUsageLimitPresent() { return usageLimitPresent; }
    @JsonIgnore public boolean isStatusPresent() { return statusPresent; }

    public boolean isEmpty() {
        return !(codePresent || discountTypePresent || discountValuePresent
                || minimumOrderValuePresent || maximumDiscountPresent || startsAtPresent
                || endsAtPresent || usageLimitPresent || statusPresent);
    }
}
