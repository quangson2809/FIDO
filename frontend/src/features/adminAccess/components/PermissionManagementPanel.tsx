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
  refreshAccess: () => Promise<void>;
  showToast: (message: string) => void;
}> = ({ access, refreshAccess, showToast }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<PermissionDraft>(emptyPermission);
  const [editingPermission, setEditingPermission] = useState<PermissionDto | null>(null);
  const [editingDraft, setEditingDraft] = useState<PermissionDraft>(emptyPermission);

  const createPermission = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !draft.code.trim() || !draft.name.trim()) return;

    setBusy(true);
    setError(null);
    try {
      await adminAccessService.createPermission({
        code: draft.code.trim(),
        name: draft.name.trim(),
      });
      setDraft(emptyPermission);
      await refreshAccess();
      showToast('Đã tạo permission.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể tạo permission.'));
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (permission: PermissionDto) => {
    setEditingPermission(permission);
    setEditingDraft({ code: permission.code, name: permission.name });
  };

  const savePermission = async () => {
    if (
      !editingPermission
      || busy
      || !editingDraft.code.trim()
      || !editingDraft.name.trim()
    ) return;

    setBusy(true);
    setError(null);
    try {
      await adminAccessService.updatePermission(editingPermission.permission_id, {
        code: editingDraft.code.trim(),
        name: editingDraft.name.trim(),
      });
      setEditingPermission(null);
      await refreshAccess();
      showToast('Đã cập nhật permission.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể cập nhật permission.'));
    } finally {
      setBusy(false);
    }
  };

  const deletePermission = async (permission: PermissionDto) => {
    if (busy || !window.confirm(`Xóa permission ${permission.code}?`)) return;

    setBusy(true);
    setError(null);
    try {
      await adminAccessService.deletePermission(permission.permission_id);
      await refreshAccess();
      showToast('Đã xóa permission.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể xóa permission.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-[#E8E9E3] bg-white p-5">
      <h2 className="font-serif text-xl">Permission catalog</h2>

      {error && (
        <div className="mt-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={createPermission}
        className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]"
      >
        <input
          value={draft.code}
          onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}
          placeholder="Permission code"
          maxLength={120}
          className="border border-[#D9DDD6] px-3 py-2 text-sm"
        />
        <input
          value={draft.name}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          placeholder="Tên permission"
          maxLength={200}
          className="border border-[#D9DDD6] px-3 py-2 text-sm"
        />
        <button
          disabled={busy}
          className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-40"
        >
          Thêm
        </button>
      </form>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {access.permissions.map((permission) => (
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={() => setEditingPermission(null)}
        >
          <div
            className="w-full max-w-lg bg-white p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex justify-between">
              <h2 className="font-serif text-2xl">Chỉnh sửa permission</h2>
              <button
                type="button"
                onClick={() => setEditingPermission(null)}
                className="text-2xl"
              >
                ×
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <input
                value={editingDraft.code}
                onChange={(event) => setEditingDraft((current) => ({ ...current, code: event.target.value }))}
                maxLength={120}
                className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
              />
              <input
                value={editingDraft.name}
                onChange={(event) => setEditingDraft((current) => ({ ...current, name: event.target.value }))}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
