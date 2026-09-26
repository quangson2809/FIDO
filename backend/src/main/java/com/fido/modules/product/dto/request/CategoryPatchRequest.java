package com.fido.modules.product.dto.request;
import com.fasterxml.jackson.annotation.*;
import jakarta.validation.constraints.*;
public class CategoryPatchRequest {
    @Positive private Long parentCategoryId;
    @Pattern(regexp=".*\\S.*") @Size(max=150) private String name;
    private boolean parentPresent;
    public Long getParentCategoryId(){return parentCategoryId;}
    @JsonSetter("parent_category_id") public void setParentCategoryId(Long v){parentCategoryId=v;parentPresent=true;}
    public String getName(){return name;}
    @JsonSetter(value="name",nulls=Nulls.FAIL) public void setName(String v){name=v;}
    @JsonIgnore public boolean isParentPresent(){return parentPresent;}
}
