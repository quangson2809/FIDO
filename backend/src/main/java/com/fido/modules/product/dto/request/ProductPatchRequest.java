package com.fido.modules.product.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public class ProductPatchRequest {

    @Positive
    private Long categoryId;

    @Positive
    private Long brandId;

    @Positive
    private Long sizeSystemId;

    @Pattern(regexp = ".*\\S.*")
    @Size(max = 255)
    private String name;

    private String description;

    @Size(max = 50)
    private String gender;

    @Size(max = 80)
    private String season;

    @Size(max = 100)
    private String style;

    private String materialCare;

    @DecimalMin("0.0")
    private BigDecimal basePrice;

    @Pattern(regexp = "ON_SALE|STOPPED")
    private String saleStatus;

    @Valid
    private List<ProductImageInput> images;

    private boolean brandIdPresent;
    private boolean descriptionPresent;
    private boolean genderPresent;
    private boolean seasonPresent;
    private boolean stylePresent;
    private boolean materialCarePresent;
    private boolean imagesPresent;

    public Long getCategoryId() {
        return categoryId;
    }

    @JsonSetter(
            value = "category_id",
            nulls = Nulls.FAIL
    )
    public void setCategoryId(Long value) {
        categoryId = value;
    }

    public Long getBrandId() {
        return brandId;
    }

    @JsonSetter("brand_id")
    public void setBrandId(Long value) {
        brandId = value;
        brandIdPresent = true;
    }

    public Long getSizeSystemId() {
        return sizeSystemId;
    }

    @JsonSetter(
            value = "size_system_id",
            nulls = Nulls.FAIL
    )
    public void setSizeSystemId(Long value) {
        sizeSystemId = value;
    }

    public String getName() {
        return name;
    }

    @JsonSetter(
            value = "name",
            nulls = Nulls.FAIL
    )
    public void setName(String value) {
        name = value;
    }

    public String getDescription() {
        return description;
    }

    @JsonSetter("description")
    public void setDescription(String value) {
        description = value;
        descriptionPresent = true;
    }

    public String getGender() {
        return gender;
    }

    @JsonSetter("gender")
    public void setGender(String value) {
        gender = value;
        genderPresent = true;
    }

    public String getSeason() {
        return season;
    }

    @JsonSetter("season")
    public void setSeason(String value) {
        season = value;
        seasonPresent = true;
    }

    public String getStyle() {
        return style;
    }

    @JsonSetter("style")
    public void setStyle(String value) {
        style = value;
        stylePresent = true;
    }

    public String getMaterialCare() {
        return materialCare;
    }

    @JsonSetter("material_care")
    public void setMaterialCare(String value) {
        materialCare = value;
        materialCarePresent = true;
    }

    public BigDecimal getBasePrice() {
        return basePrice;
    }

    @JsonSetter(
            value = "base_price",
            nulls = Nulls.FAIL
    )
    public void setBasePrice(BigDecimal value) {
        basePrice = value;
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

    public List<ProductImageInput> getImages() {
        return images;
    }

    @JsonSetter(
            value = "images",
            nulls = Nulls.FAIL
    )
    public void setImages(List<ProductImageInput> value) {
        images = value;
        imagesPresent = true;
    }

    @JsonIgnore
    public boolean isBrandIdPresent() {
        return brandIdPresent;
    }

    @JsonIgnore
    public boolean isDescriptionPresent() {
        return descriptionPresent;
    }

    @JsonIgnore
    public boolean isGenderPresent() {
        return genderPresent;
    }

    @JsonIgnore
    public boolean isSeasonPresent() {
        return seasonPresent;
    }

    @JsonIgnore
    public boolean isStylePresent() {
        return stylePresent;
    }

    @JsonIgnore
    public boolean isMaterialCarePresent() {
        return materialCarePresent;
    }

    @JsonIgnore
    public boolean isImagesPresent() {
        return imagesPresent;
    }
}
