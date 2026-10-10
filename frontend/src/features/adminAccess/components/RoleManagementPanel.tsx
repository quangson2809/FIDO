import { AccessChangePreview } from './AccessChangePreview';
import { ListSearch } from '../../../shared/admin/ListSearch';
import { useDirtyForm } from '../../../shared/admin/dirtyFormContext';
import { Modal } from '../../../shared/admin/Modal';
import React, { useState } from 'react';
import { adminAccessService } from '../api/service';
import type { AccessControlDto, RoleDetailDto } from '../types';
import { getApiErrorMessage } from '../../../services/http/apiError';

interface RoleDraft {
  code: string;
  name: string;
  description: string;
  permissionIds: number[];
}

const emptyRole: RoleDraft = {
  code: '',
  name: '',
  description: '',
  permissionIds: [],
};

const togglePermission = (draft: RoleDraft, permissionId: number): RoleDraft => ({
  ...draft,
  permissionIds: draft.permissionIds.includes(permissionId)
    ? draft.permissionIds.filter((id) => id !== permissionId)
    : [...draft.permissionIds, permissionId],
});

export const RoleManagementPanel: React.FC<{
  access: AccessControlDto;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  refreshAccess: () => Promise<void>;
  showToast: (message: string) => void;
}> = ({ access, busy, onBusyChange, refreshAccess, showToast }) => {
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<RoleDraft>(emptyRole);
  const [editingRole, setEditingRole] = useState<RoleDetailDto | null>(null);
  const [editingRoleDraft, setEditingRoleDraft] = useState<RoleDraft>(emptyRole);

  const editDirty = Boolean(editingRole && (editingRoleDraft.name !== editingRole.name || editingRoleDraft.description !== (editingRole.description ?? '') || JSON.stringify([...editingRoleDraft.permissionIds].sort()) !== JSON.stringify(editingRole.permissions.map((permission) => permission.permission_id).sort())));
  const canDiscard = useDirtyForm(editDirty || JSON.stringify(roleDraft) !== JSON.stringify(emptyRole));
  const closeEdit = () => { if (!busy && canDiscard()) setEditingRole(null); };

  const createRole = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !roleDraft.code.trim() || !roleDraft.name.trim()) return;

    onBusyChange(true);
    setError(null);
    try {
      await adminAccessService.createRole({
        code: roleDraft.code.trim(),
        name: roleDraft.name.trim(),
        description: roleDraft.description.trim() || null,
        permission_ids: roleDraft.permissionIds,
      });
      setRoleDraft(emptyRole);
      await refreshAccess();
      showToast('Đã tạo vai trò.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể tạo vai trò.'));
    } finally {
      onBusyChange(false);
    }
  };

  const startEdit = (role: RoleDetailDto) => {
    setEditingRole(role);
    setEditingRoleDraft({
      code: role.code,
      name: role.name,
      description: role.description ?? '',
      permissionIds: role.permissions.map((permission) => permission.permission_id),
    });
  };

  const saveRole = async () => {
    if (!editingRole || busy || !editingRoleDraft.name.trim()) return;

    if (!window.confirm(`Lưu vai trò ${editingRole.code}?\nQuyền hiện tại: ${editingRole.permissions.map((permission) => permission.code).join(', ') || 'Không có'}\nQuyền sau khi lưu: ${access.permissions.filter((permission) => editingRoleDraft.permissionIds.includes(permission.permission_id)).map((permission) => permission.code).join(', ') || 'Không có'}\nThay đổi ảnh hưởng đến tài khoản đang dùng vai trò này.`)) return;
    onBusyChange(true);
    setError(null);
    try {
      await adminAccessService.updateRole(editingRole.role_id, {
        name: editingRoleDraft.name.trim(),
        description: editingRoleDraft.description.trim() || null,
        permission_ids: editingRoleDraft.permissionIds,
      });
      setEditingRole(null);
      await refreshAccess();
      showToast('Đã cập nhật vai trò.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể cập nhật vai trò.'));
    } finally {
      onBusyChange(false);
    }
  };

  const deleteRole = async (role: RoleDetailDto) => {
    if (busy || !window.confirm(`Xóa vai trò ${role.code}? Thao tác loại bỏ mục này khỏi danh mục phân quyền; hệ thống sẽ kiểm tra các ràng buộc đang sử dụng.`)) return;

    onBusyChange(true);
    setError(null);
    try {
      await adminAccessService.deleteRole(role.role_id);
      await refreshAccess();
      showToast('Đã xóa vai trò.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể xóa vai trò.'));
    } finally {
      onBusyChange(false);
    }
  };

  const filtered = access.roles.filter(role => [role.code, role.name, role.description ?? '', ...role.permissions.map(permission => `${permission.code} ${permission.name}`)].join(' ').toLocaleLowerCase('vi-VN').includes(search.trim().toLocaleLowerCase('vi-VN')));

  return (
    <div className="space-y-4">
      {error && (
        <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={createRole} className="space-y-4 border border-[#E8E9E3] bg-white p-5"><fieldset disabled={busy} className="contents">
        <div>
          <h2 className="font-serif text-xl">Tạo vai trò</h2>
          <p className="mt-1 text-xs text-[#687069]">
            Mã vai trò không thể đổi sau khi tạo.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <input aria-label="Code"
            value={roleDraft.code}
            onChange={(event) => setRoleDraft((current) => ({ ...current, code: event.target.value }))}
            placeholder="Code"
            maxLength={80}
            className="border border-[#D9DDD6] px-3 py-2 text-sm"
          />
          <input aria-label="Tên vai trò"
            value={roleDraft.name}
            onChange={(event) => setRoleDraft((current) => ({ ...current, name: event.target.value }))}
            placeholder="Tên vai trò"
            maxLength={150}
            className="border border-[#D9DDD6] px-3 py-2 text-sm"
          />
          <input aria-label="Mô tả"
            value={roleDraft.description}
            onChange={(event) => setRoleDraft((current) => ({ ...current, description: event.target.value }))}
            placeholder="Mô tả"
            maxLength={500}
            className="border border-[#D9DDD6] px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {access.permissions.map((permission) => (
            <label
              key={permission.permission_id}
              className="flex items-center gap-2 border border-[#D9DDD6] px-2 py-1 text-xs"
            >
              <input
                type="checkbox"
                checked={roleDraft.permissionIds.includes(permission.permission_id)}
                onChange={() => setRoleDraft((current) => togglePermission(current, permission.permission_id))}
              />
              {permission.code}
            </label>
          ))}
        </div>

        <button
          type="submit"
          disabled={busy}
          className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-40"
        >
          Tạo vai trò
        </button>
      </fieldset></form>

      <ListSearch label="Tìm vai trò" value={search} onChange={setSearch} count={filtered.length} />
      {filtered.length === 0 && <p role="status" className="admin-state">Không có vai trò khớp tìm kiếm.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((role) => (
          <article key={role.role_id} className="border border-[#E8E9E3] bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs text-[#687069]">#{role.role_id}</p>
                <h2 className="font-serif text-xl">{role.code}</h2>
                <p className="mt-1 text-sm text-[#606863]">{role.name}</p>
                {role.description && (
                  <p className="mt-2 text-xs leading-5 text-[#687069]">{role.description}</p>
                )}
              </div>
              <span className="rounded bg-[#0B2419] px-2 py-1 text-xs font-bold text-white">
                {role.permissions.length} quyền
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {role.permissions.map((permission) => (
                <span
                  key={permission.permission_id}
                  title={permission.name}
                  className="border border-[#D9DDD6] bg-[#F8FAF4] px-2 py-1 text-xs"
                >
                  {permission.code}
                </span>
              ))}
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => startEdit(role)}
                className="text-xs font-semibold underline"
              >
                Chỉnh sửa
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void deleteRole(role)}
                className="text-xs font-semibold text-red-700 underline"
              >
                Xóa
              </button>
            </div>
          </article>
        ))}
      </div>

      {editingRole && (
        <Modal title="Chỉnh sửa vai trò" onClose={closeEdit} busy={busy}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-[#687069]">{editingRole.code}</p>
                <h2 className="font-serif text-2xl">Chỉnh sửa vai trò</h2>
              </div>
              <button type="button" onClick={closeEdit} className="text-2xl">×</button>
            </div>

            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <fieldset disabled={busy} className="mt-4 space-y-3">
              <input aria-label="Tên"
                value={editingRoleDraft.name}
                onChange={(event) => setEditingRoleDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Tên"
                maxLength={150}
                className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
              />
              <textarea aria-label="Mô tả"
                rows={3}
                value={editingRoleDraft.description}
                onChange={(event) => setEditingRoleDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Mô tả"
                maxLength={500}
                className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                {access.permissions.map((permission) => (
                  <label
                    key={permission.permission_id}
                    className="flex items-center gap-2 border border-[#D9DDD6] px-2 py-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={editingRoleDraft.permissionIds.includes(permission.permission_id)}
                      onChange={() => setEditingRoleDraft((current) => togglePermission(current, permission.permission_id))}
                    />
                    {permission.code}
                  </label>
                ))}
              </div>
              <AccessChangePreview label="quyền" before={editingRole.permissions.map((permission) => permission.permission_id)} after={editingRoleDraft.permissionIds} items={access.permissions.map((permission) => ({ id: permission.permission_id, name: permission.code }))} />
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveRole()}
                className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-40"
              >
                Lưu
              </button>
            </fieldset>
        </Modal>
      )}
    </div>
  );
};
