package com.fido.modules.product.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import tools.jackson.databind.annotation.JsonDeserialize;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;

public class ProductPatchRequest {
    @Positive private Long parentProductId;
    @Positive private Long categoryId;
    @Positive private Long brandId;
    @Size(max = 255) private String name;
    @Size(max = 200) private String slug;
    @Pattern(regexp = ".*\\S.*") @Size(max = 100) private String sku;
    private String description;
    @PositiveOrZero private Long sellingPrice;
    @PositiveOrZero private Long costPrice;
    @Pattern(regexp = "DRAFT|ACTIVE|INACTIVE|ARCHIVED") private String status;
    @Valid private List<@jakarta.validation.constraints.NotNull ProductImageInput> images;

    private boolean parentProductIdPresent, categoryIdPresent, brandIdPresent, namePresent,
            slugPresent, skuPresent, descriptionPresent, sellingPricePresent, costPricePresent,
            statusPresent, imagesPresent;

    public Long getParentProductId() { return parentProductId; }
    @JsonSetter(value = "parent_product_id", nulls = Nulls.SET)
    public void setParentProductId(Long value) { parentProductId = value; parentProductIdPresent = true; }

    public Long getCategoryId() { return categoryId; }
    @JsonSetter(value = "category_id", nulls = Nulls.SET)
    public void setCategoryId(Long value) { categoryId = value; categoryIdPresent = true; }

    public Long getBrandId() { return brandId; }
    @JsonSetter(value = "brand_id", nulls = Nulls.SET)
    public void setBrandId(Long value) { brandId = value; brandIdPresent = true; }

    public String getName() { return name; }
    @JsonSetter(value = "name", nulls = Nulls.SET)
    public void setName(String value) { name = value; namePresent = true; }

    public String getSlug() { return slug; }
    @JsonSetter(value = "slug", nulls = Nulls.SET)
    public void setSlug(String value) { slug = value; slugPresent = true; }

    public String getSku() { return sku; }
    @JsonSetter(value = "sku", nulls = Nulls.FAIL)
    public void setSku(String value) { sku = value; skuPresent = true; }

    public String getDescription() { return description; }
    @JsonSetter(value = "description", nulls = Nulls.SET)
    public void setDescription(String value) { description = value; descriptionPresent = true; }

    public Long getSellingPrice() { return sellingPrice; }
    @JsonSetter(value = "selling_price", nulls = Nulls.FAIL)
    @JsonDeserialize(using = IntegerVndDeserializer.class)
    public void setSellingPrice(Long value) { sellingPrice = value; sellingPricePresent = true; }

    public Long getCostPrice() { return costPrice; }
    @JsonSetter(value = "cost_price", nulls = Nulls.SET)
    @JsonDeserialize(using = IntegerVndDeserializer.class)
    public void setCostPrice(Long value) { costPrice = value; costPricePresent = true; }

    public String getStatus() { return status; }
    @JsonSetter(value = "status", nulls = Nulls.FAIL)
    public void setStatus(String value) { status = value; statusPresent = true; }

    public List<ProductImageInput> getImages() { return images; }
    @JsonSetter(value = "images", nulls = Nulls.FAIL)
    public void setImages(List<ProductImageInput> value) { images = value; imagesPresent = true; }

    @JsonIgnore public boolean isParentProductIdPresent() { return parentProductIdPresent; }
    @JsonIgnore public boolean isCategoryIdPresent() { return categoryIdPresent; }
    @JsonIgnore public boolean isBrandIdPresent() { return brandIdPresent; }
    @JsonIgnore public boolean isNamePresent() { return namePresent; }
    @JsonIgnore public boolean isSlugPresent() { return slugPresent; }
    @JsonIgnore public boolean isSkuPresent() { return skuPresent; }
    @JsonIgnore public boolean isDescriptionPresent() { return descriptionPresent; }
    @JsonIgnore public boolean isSellingPricePresent() { return sellingPricePresent; }
    @JsonIgnore public boolean isCostPricePresent() { return costPricePresent; }
    @JsonIgnore public boolean isStatusPresent() { return statusPresent; }
    @JsonIgnore public boolean isImagesPresent() { return imagesPresent; }
}
