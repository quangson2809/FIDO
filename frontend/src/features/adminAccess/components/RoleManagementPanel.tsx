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
  const [error, setError] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<RoleDraft>(emptyRole);
  const [editingRole, setEditingRole] = useState<RoleDetailDto | null>(null);
  const [editingRoleDraft, setEditingRoleDraft] = useState<RoleDraft>(emptyRole);

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
    if (busy || !window.confirm(`Xóa vai trò ${role.code}?`)) return;

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

  return (
    <div className="space-y-4">
      {error && (
        <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={createRole} className="space-y-4 border border-[#E8E9E3] bg-white p-5">
        <div>
          <h2 className="font-serif text-xl">Tạo vai trò</h2>
          <p className="mt-1 text-xs text-[#687069]">
            Role code chỉ được nhập khi tạo; cập nhật role không đổi code.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={roleDraft.code}
            onChange={(event) => setRoleDraft((current) => ({ ...current, code: event.target.value }))}
            placeholder="Code"
            maxLength={80}
            className="border border-[#D9DDD6] px-3 py-2 text-sm"
          />
          <input
            value={roleDraft.name}
            onChange={(event) => setRoleDraft((current) => ({ ...current, name: event.target.value }))}
            placeholder="Tên vai trò"
            maxLength={150}
            className="border border-[#D9DDD6] px-3 py-2 text-sm"
          />
          <input
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
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        {access.roles.map((role) => (
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={() => setEditingRole(null)}
        >
          <div
            className="w-full max-w-2xl bg-white p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-[#687069]">{editingRole.code}</p>
                <h2 className="font-serif text-2xl">Chỉnh sửa vai trò</h2>
              </div>
              <button type="button" onClick={() => setEditingRole(null)} className="text-2xl">×</button>
            </div>

            <div className="mt-4 space-y-3">
              <input
                value={editingRoleDraft.name}
                onChange={(event) => setEditingRoleDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Tên"
                maxLength={150}
                className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
              />
              <textarea
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
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveRole()}
                className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-40"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
