package com.fido.modules.product.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

public class ProductPatchRequest {
    @Positive private Long categoryId;
    @Positive private Long brandId;
    @Positive private Long sizeSystemId;
    @Pattern(regexp=".*\\S.*") @Size(max=255) private String name;
    private String description;
    @Size(max=50) private String gender;
    @Size(max=80) private String season;
    @Size(max=100) private String style;
    private String materialCare;
    @DecimalMin("0.0") private BigDecimal basePrice;
    @Pattern(regexp="ON_SALE|STOPPED") private String saleStatus;
    @Valid private List<ProductCreateRequest.ImageInput> images;

    private boolean brandIdPresent;
    private boolean descriptionPresent;
    private boolean genderPresent;
    private boolean seasonPresent;
    private boolean stylePresent;
    private boolean materialCarePresent;
    private boolean imagesPresent;

    public Long getCategoryId(){return categoryId;}
    @JsonSetter(value="category_id",nulls=Nulls.FAIL) public void setCategoryId(Long v){categoryId=v;}
    public Long getBrandId(){return brandId;}
    @JsonSetter("brand_id") public void setBrandId(Long v){brandId=v;brandIdPresent=true;}
    public Long getSizeSystemId(){return sizeSystemId;}
    @JsonSetter(value="size_system_id",nulls=Nulls.FAIL) public void setSizeSystemId(Long v){sizeSystemId=v;}
    public String getName(){return name;}
    @JsonSetter(value="name",nulls=Nulls.FAIL) public void setName(String v){name=v;}
    public String getDescription(){return description;}
    @JsonSetter("description") public void setDescription(String v){description=v;descriptionPresent=true;}
    public String getGender(){return gender;}
    @JsonSetter("gender") public void setGender(String v){gender=v;genderPresent=true;}
    public String getSeason(){return season;}
    @JsonSetter("season") public void setSeason(String v){season=v;seasonPresent=true;}
    public String getStyle(){return style;}
    @JsonSetter("style") public void setStyle(String v){style=v;stylePresent=true;}
    public String getMaterialCare(){return materialCare;}
    @JsonSetter("material_care") public void setMaterialCare(String v){materialCare=v;materialCarePresent=true;}
    public BigDecimal getBasePrice(){return basePrice;}
    @JsonSetter(value="base_price",nulls=Nulls.FAIL) public void setBasePrice(BigDecimal v){basePrice=v;}
    public String getSaleStatus(){return saleStatus;}
    @JsonSetter(value="sale_status",nulls=Nulls.FAIL) public void setSaleStatus(String v){saleStatus=v;}
    public List<ProductCreateRequest.ImageInput> getImages(){return images;}
    @JsonSetter(value="images",nulls=Nulls.FAIL) public void setImages(List<ProductCreateRequest.ImageInput> v){images=v;imagesPresent=true;}

    @JsonIgnore public boolean isBrandIdPresent(){return brandIdPresent;}
    @JsonIgnore public boolean isDescriptionPresent(){return descriptionPresent;}
    @JsonIgnore public boolean isGenderPresent(){return genderPresent;}
    @JsonIgnore public boolean isSeasonPresent(){return seasonPresent;}
    @JsonIgnore public boolean isStylePresent(){return stylePresent;}
    @JsonIgnore public boolean isMaterialCarePresent(){return materialCarePresent;}
    @JsonIgnore public boolean isImagesPresent(){return imagesPresent;}
}
