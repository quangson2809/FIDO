package com.fido.modules.account.dto.request;
import jakarta.validation.constraints.*;
import com.fasterxml.jackson.annotation.*;
import java.util.List;

public class RolePatchRequest {
    @Pattern(regexp=".*\\S.*") @Size(max=150) private String name;
    @Size(max=500) private String description;
    private List<@NotNull Long> permissionIds;
    private boolean descriptionPresent;
    public String getName() { return name; }
    @JsonSetter(nulls=Nulls.FAIL) public void setName(String value) { name=value; }
    public String getDescription() { return description; }
    @JsonSetter public void setDescription(String value) { description=value; descriptionPresent=true; }
    public List<Long> getPermissionIds() { return permissionIds; }
    @JsonSetter(value="permission_ids",nulls=Nulls.FAIL) public void setPermissionIds(List<Long> value) { permissionIds=value; }
    @JsonIgnore public boolean isDescriptionPresent() { return descriptionPresent; }
}
