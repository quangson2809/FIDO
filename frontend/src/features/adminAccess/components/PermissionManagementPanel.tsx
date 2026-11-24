import { ListSearch } from '../../../shared/admin/ListSearch';
import { useDirtyForm } from '../../../shared/admin/dirtyFormContext';
import { Modal } from '../../../shared/admin/Modal';
import React, { useState } from 'react';
import { adminAccessService } from '../api/service';
import type { AccessControlDto } from '../types';
import type { PermissionDto } from '../../auth/types';
import { getApiErrorMessage } from '../../../services/http/apiError';

interface PermissionDraft {
  code: string;
  name: string;
}

const emptyPermission: PermissionDraft = { code: '', name: '' };

export const PermissionManagementPanel: React.FC<{
  access: AccessControlDto;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  refreshAccess: () => Promise<void>;
  showToast: (message: string) => void;
}> = ({ access, busy, onBusyChange, refreshAccess, showToast }) => {
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingPermission, setEditingPermission] = useState<PermissionDto | null>(null);
  const [editingDraft, setEditingDraft] = useState<PermissionDraft>(emptyPermission);

  const editDirty = Boolean(
    editingPermission &&
      (editingDraft.code !== editingPermission.code ||
        editingDraft.name !== editingPermission.name),
  );
  const canDiscard = useDirtyForm(
    editDirty,
  );
  const closeEdit = () => {
    if (!busy && canDiscard()) setEditingPermission(null);
  };

  const startEdit = (permission: PermissionDto) => {
    setEditingPermission(permission);
    setEditingDraft({ code: permission.code, name: permission.name });
  };

  const savePermission = async () => {
    if (!editingPermission || busy || !editingDraft.code.trim() || !editingDraft.name.trim())
      return;

    onBusyChange(true);
    setError(null);
    try {
      await adminAccessService.updatePermission(editingPermission.permission_id, {
        name: editingDraft.name.trim(),
      });
      setEditingPermission(null);
      await refreshAccess();
      showToast('Đã cập nhật permission.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể cập nhật permission.'));
    } finally {
      onBusyChange(false);
    }
  };

  const deletePermission = async (permission: PermissionDto) => {
    if (
      busy ||
      !window.confirm(
        `Xóa quyền ${permission.code}? Thao tác loại bỏ mục này khỏi danh mục phân quyền; hệ thống sẽ kiểm tra các ràng buộc đang sử dụng.`,
      )
    )
      return;

    onBusyChange(true);
    setError(null);
    try {
      await adminAccessService.deletePermission(permission.permission_id);
      await refreshAccess();
      showToast('Đã xóa permission.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể xóa permission.'));
    } finally {
      onBusyChange(false);
    }
  };

  const filtered = access.permissions.filter((permission) =>
    [permission.code, permission.name]
      .join(' ')
      .toLocaleLowerCase('vi-VN')
      .includes(search.trim().toLocaleLowerCase('vi-VN')),
  );

  return (
    <div className="border border-[#E8E9E3] bg-white p-5">
      <h2 className="font-serif text-xl">Danh mục quyền</h2>

      {error && (
        <div className="mt-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <p className="mt-3 text-sm">Quyền gắn với các thao tác được hệ thống hỗ trợ. Tạo vai trò và chọn quyền ở bảng vai trò; không tạo mã quyền tùy ý.</p>


      <ListSearch label="Tìm quyền" value={search} onChange={setSearch} count={filtered.length} />
      {filtered.length === 0 && (
        <p role="status" className="admin-state">
          Không có quyền khớp tìm kiếm.
        </p>
      )}
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((permission) => (
          <div key={permission.permission_id} className="border border-[#E8E9E3] p-3">
            <p className="font-mono text-xs font-bold">{permission.code}</p>
            <p className="mt-1 text-xs text-[#687069]">{permission.name}</p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => startEdit(permission)}
                className="text-xs font-semibold underline"
              >
                Sửa
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void deletePermission(permission)}
                className="text-xs font-semibold text-red-700 underline"
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingPermission && (
        <Modal title="Chỉnh sửa quyền" onClose={closeEdit} busy={busy}>
          <div className="flex justify-between">
            <h2 className="font-serif text-2xl">Chỉnh sửa quyền</h2>
            <button type="button" onClick={closeEdit} className="text-2xl">
              ×
            </button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <fieldset disabled={busy} className="mt-4 space-y-3">
            <input
              aria-label="Mã quyền"
              value={editingDraft.code}
              readOnly
              maxLength={120}
              className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
            />
            <input
              aria-label="Tên quyền"
              value={editingDraft.name}
              onChange={(event) =>
                setEditingDraft((current) => ({ ...current, name: event.target.value }))
              }
              maxLength={200}
              className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void savePermission()}
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
