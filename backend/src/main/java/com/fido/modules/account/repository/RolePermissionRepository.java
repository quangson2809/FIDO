package com.fido.modules.account.repository;

import com.fido.modules.account.entity.RolePermission;
import com.fido.modules.account.entity.RolePermissionId;

import org.springframework.data.repository.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Chỉ cung cấp thao tác gán/gỡ quyền có chủ đích; không mở toàn bộ API xóa mặc định. */
public interface RolePermissionRepository extends Repository<RolePermission, RolePermissionId> {
    Optional<RolePermission> findById(RolePermissionId id);

    RolePermission save(RolePermission entity);

    List<RolePermission> findAllByRoleIdIn(Collection<Long> roleIds);

    List<RolePermission> findAllByPermissionId(Long permissionId);

    void deleteByRoleId(Long roleId);

    void deleteByRoleIdAndPermissionId(Long roleId, Long permissionId);
}
