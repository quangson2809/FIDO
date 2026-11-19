import { StatusBadge } from '../../shared/admin/StatusBadge';
import { Modal } from '../../shared/admin/Modal';
import { statusLabel } from '../../shared/admin/statusLabels';
import { useDirtyForm } from '../../shared/admin/dirtyFormContext';
import React, { useCallback, useState } from 'react';
import { useRemoteQuery } from '../../shared/hooks/useRemoteQuery';
import { QueryFeedback } from '../../shared/admin/QueryFeedback';
import { inventoryAdminService } from '../../features/inventory/api/adminService';
import type { SupplierCreateInput, SupplierDto, SupplierStatus } from '../../features/inventory/types';
import { getApiErrorMessage } from '../../services/http/apiError';

const blankForm: SupplierCreateInput = { name: '', phone: null, email: null, status: 'ACTIVE' };

export const AdminSuppliersView: React.FC<{
  showToast: (msg: string) => void;
  onNavigateTab?: (tab: string, breadcrumb: string) => void;
  canWrite: boolean;
}> = ({ showToast, onNavigateTab, canWrite }) => {
  const [queryInput, setQueryInput] = useState('');
  const [queryText, setQueryText] = useState('');
  const [status, setStatus] = useState<SupplierStatus | ''>('');
  const [page, setPage] = useState(1);
  const list = useRemoteQuery(useCallback(
    () => inventoryAdminService.listSuppliers({
      ...(queryText ? { q: queryText } : {}),
      ...(status ? { status } : {}),
      page,
      page_size: 20,
    }),
    [page, queryText, status],
  ));
  const rows = list.data?.data ?? [];
  const meta = list.data?.meta ?? null;
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierCreateInput>(blankForm);
  const [detail, setDetail] = useState<SupplierDto | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedForm, setSavedForm] = useState<SupplierCreateInput>(blankForm);
  const canDiscard = useDirtyForm(JSON.stringify(form) !== JSON.stringify(savedForm));

  const setField = <K extends keyof SupplierCreateInput>(key: K, value: SupplierCreateInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const startEdit = (supplier: SupplierDto) => {
    if (!canWrite || saving || !canDiscard()) return;
    const nextForm: SupplierCreateInput = {
      name: supplier.name, phone: supplier.phone, email: supplier.email, status: supplier.status,
    };
    setEditingId(supplier.supplier_id);
    setForm(nextForm);
    setSavedForm(nextForm);
  };
  const resetForm = () => {
    setEditingId(null);
    setForm(blankForm);
    setSavedForm(blankForm);
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWrite || !form.name.trim() || saving) return;
    const normalized: SupplierCreateInput = {
      name: form.name.trim(), phone: form.phone?.trim() || null,
      email: form.email?.trim() || null, status: form.status,
    };
    setSaving(true);
    setError(null);
    try {
      const updated = editingId === null
        ? await inventoryAdminService.createSupplier(normalized)
        : await inventoryAdminService.updateSupplier(editingId, normalized);
      setDetail((current) => current?.supplier_id === updated.supplier_id ? updated : current);
      list.reload();
      resetForm();
      showToast(editingId === null ? 'Đã tạo nhà cung cấp.' : 'Đã cập nhật nhà cung cấp.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể lưu nhà cung cấp. Kiểm tra dữ liệu và quyền INVENTORY_WRITE.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)}>
          <dl className="space-y-3">
            <div><dt>Mã nhà cung cấp</dt><dd className="font-mono">{detail.code}</dd></div>
            <div><dt>Điện thoại</dt><dd>{detail.phone ?? '—'}</dd></div>
            <div><dt>Email</dt><dd>{detail.email ?? '—'}</dd></div>
            <div><dt>Trạng thái</dt><dd><StatusBadge status={detail.status} /></dd></div>
          </dl>
        </Modal>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">Suppliers</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Nhà cung cấp</h1>
          <p className="mt-2 text-sm text-[#606863]">Quản lý mã, thông tin liên hệ và trạng thái sử dụng.</p>
        </div>
        {onNavigateTab && <button type="button" onClick={() => onNavigateTab('inward', 'Phiếu nhập')}
          className="border border-[#0B2419] px-4 py-2 text-xs font-bold uppercase">Phiếu nhập</button>}
      </div>
      <QueryFeedback loading={list.loading} error={list.error} onRetry={list.reload} />
      {error && <div role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <form onSubmit={(event) => { event.preventDefault(); setPage(1); setQueryText(queryInput.trim()); }}
        className="flex flex-wrap gap-3 rounded-lg border border-[#E2E5DE] bg-white p-4">
        <input aria-label="Mã, tên, email hoặc điện thoại" value={queryInput}
          onChange={(event) => setQueryInput(event.target.value)} placeholder="Mã, tên, email hoặc điện thoại"
          className="min-w-64 flex-1 border border-[#D9DDD6] px-3 py-2 text-sm" />
        <select aria-label="Trạng thái nhà cung cấp" value={status}
          onChange={(event) => { setPage(1); setStatus(event.target.value as SupplierStatus | ''); }}
          className="border border-[#D9DDD6] px-3 py-2 text-sm">
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">{statusLabel('ACTIVE')}</option>
          <option value="INACTIVE">{statusLabel('INACTIVE')}</option>
        </select>
        <button className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white">Tìm</button>
      </form>

      {canWrite && (
        <form onSubmit={save} className="space-y-4 rounded-lg border border-[#E2E5DE] bg-white p-5">
          <fieldset disabled={saving} className="contents">
            <div className="flex justify-between">
              <h2 className="font-serif text-xl font-bold">
                {editingId === null ? 'Thêm nhà cung cấp' : 'Sửa Supplier #' + editingId}
              </h2>
              {editingId !== null && <button type="button" onClick={() => { if (!saving && canDiscard()) resetForm(); }}
                className="text-xs font-bold uppercase underline">Hủy sửa</button>}
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-1"><span className="text-xs font-semibold">Tên *</span>
                <input required maxLength={255} value={form.name} onChange={(event) => setField('name', event.target.value)}
                  className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" />
              </label>
              <label className="space-y-1"><span className="text-xs font-semibold">Điện thoại</span>
                <input maxLength={20} value={form.phone ?? ''} onChange={(event) => setField('phone', event.target.value || null)}
                  className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" />
              </label>
              <label className="space-y-1"><span className="text-xs font-semibold">Email</span>
                <input type="email" maxLength={254} value={form.email ?? ''} onChange={(event) => setField('email', event.target.value || null)}
                  className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" />
              </label>
              <label className="space-y-1"><span className="text-xs font-semibold">Trạng thái</span>
                <select required value={form.status} onChange={(event) => setField('status', event.target.value as SupplierStatus)}
                  className="w-full border border-[#D9DDD6] px-3 py-2 text-sm">
                  <option value="ACTIVE">{statusLabel('ACTIVE')}</option>
                  <option value="INACTIVE">{statusLabel('INACTIVE')}</option>
                </select>
              </label>
            </div>
            <button disabled={saving} className="bg-[#0B2419] px-5 py-2.5 text-xs font-bold uppercase text-white disabled:opacity-40">
              {saving ? 'Đang lưu...' : editingId === null ? 'Tạo nhà cung cấp' : 'Lưu thay đổi'}
            </button>
          </fieldset>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border border-[#E2E5DE] bg-white">
        {list.loading ? <div className="p-10 text-center text-sm">Đang tải...</div> : list.error ? null : rows.length === 0 ? (
          <QueryFeedback empty filtered={Boolean(queryText || status)} />
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#F5F6F2] text-xs uppercase text-[#606863]">
              <tr><th className="px-4 py-3">Mã</th><th className="px-4 py-3">Nhà cung cấp</th><th className="px-4 py-3">Liên hệ</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-[#E2E5DE]">
              {rows.map((supplier) => (
                <tr key={supplier.supplier_id}>
                  <td className="px-4 py-3 font-mono">{supplier.code}</td>
                  <td className="px-4 py-3"><strong>{supplier.name}</strong><p className="text-xs text-[#606863]">#{supplier.supplier_id}</p></td>
                  <td className="px-4 py-3 text-xs">{supplier.phone ?? '—'}<br />{supplier.email ?? '—'}</td>
                  <td className="px-4 py-3 font-bold"><StatusBadge status={supplier.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="admin-secondary" onClick={() => setDetail(supplier)}>Chi tiết</button>
                    {canWrite && <button type="button" onClick={() => startEdit(supplier)} className="ml-2 border border-[#0B2419] px-3 py-2 text-xs font-bold uppercase">Sửa</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {meta && meta.total_pages > 1 && (
        <div className="flex justify-center gap-3 text-sm">
          <button type="button" disabled={page <= 1 || list.loading} onClick={() => setPage((value) => value - 1)}
            className="border border-[#D9DDD6] bg-white px-4 py-2 disabled:opacity-40">Trang trước</button>
          <span className="py-2">{meta.page} / {meta.total_pages}</span>
          <button type="button" disabled={page >= meta.total_pages || list.loading} onClick={() => setPage((value) => value + 1)}
            className="border border-[#D9DDD6] bg-white px-4 py-2 disabled:opacity-40">Trang sau</button>
        </div>
      )}
    </div>
  );
};
