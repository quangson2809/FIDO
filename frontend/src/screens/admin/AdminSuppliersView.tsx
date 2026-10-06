import React, { useEffect, useState } from 'react';
import { inventoryAdminService } from '../../features/inventory/api/adminService';
import type { SupplierCreateInput, SupplierDto, SupplierUsageStatus } from '../../features/inventory/types';
import type { PaginationMeta } from '../../types/api';

const blankForm: SupplierCreateInput = {
  name: '', phone: null, email: null, address: null, usage_status: 'ACTIVE', note: null,
};

export const AdminSuppliersView: React.FC<{
  showToast: (msg: string) => void;
  onNavigateTab?: (tab: string, breadcrumb: string) => void;
}> = ({ showToast, onNavigateTab }) => {
  const [rows, setRows] = useState<SupplierDto[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<SupplierUsageStatus | ''>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierCreateInput>(blankForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const response = await inventoryAdminService.listSuppliers({
      ...(query ? { q: query } : {}),
      ...(status ? { usage_status: status } : {}),
      page,
      page_size: 20,
    });
    setRows(response.data);
    setMeta(response.meta);
  };

  useEffect(() => {
    let active = true;
    void inventoryAdminService.listSuppliers({
      ...(query ? { q: query } : {}),
      ...(status ? { usage_status: status } : {}),
      page,
      page_size: 20,
    }).then((response) => {
      if (!active) return;
      setRows(response.data);
      setMeta(response.meta);
      setError(null);
    }).catch(() => {
      if (active) setError('Không thể tải nhà cung cấp hoặc tài khoản thiếu INVENTORY_READ.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, query, status]);

  const setField = <K extends keyof SupplierCreateInput>(key: K, value: SupplierCreateInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const startEdit = (supplier: SupplierDto) => {
    setEditingId(supplier.supplier_id);
    setForm({
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      usage_status: supplier.usage_status,
      note: supplier.note,
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(blankForm);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || saving) return;
    setSaving(true);
    setError(null);
    const normalized: SupplierCreateInput = {
      ...form,
      name: form.name.trim(),
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
      address: form.address?.trim() || null,
      note: form.note?.trim() || null,
    };
    try {
      if (editingId === null) await inventoryAdminService.createSupplier(normalized);
      else await inventoryAdminService.updateSupplier(editingId, normalized);
      await load();
      resetForm();
      showToast(editingId === null ? 'Đã tạo nhà cung cấp.' : 'Đã cập nhật nhà cung cấp.');
    } catch {
      setError('Không thể lưu nhà cung cấp. Kiểm tra dữ liệu và quyền INVENTORY_WRITE.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">Suppliers</p><h1 className="mt-1 font-serif text-3xl font-bold">Nhà cung cấp</h1><p className="mt-2 text-sm text-[#606863]">Trạng thái contract chỉ gồm ACTIVE và INACTIVE.</p></div>{onNavigateTab && <button type="button" onClick={() => onNavigateTab('inward', 'Phiếu nhập')} className="border border-[#0B2419] px-4 py-2 text-xs font-bold uppercase">Phiếu nhập</button>}</div>
      {error && <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <form onSubmit={(event) => { event.preventDefault(); setLoading(true); setPage(1); setQuery(queryInput.trim()); }} className="flex flex-wrap gap-3 rounded-lg border border-[#E2E5DE] bg-white p-4"><input value={queryInput} onChange={(event) => setQueryInput(event.target.value)} placeholder="Tên, email, địa chỉ..." className="min-w-64 flex-1 border border-[#D9DDD6] px-3 py-2 text-sm" /><select value={status} onChange={(event) => { setLoading(true); setPage(1); setStatus(event.target.value as SupplierUsageStatus | ''); }} className="border border-[#D9DDD6] px-3 py-2 text-sm"><option value="">Tất cả trạng thái</option><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select><button className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white">Tìm</button></form>

      <form onSubmit={save} className="space-y-4 rounded-lg border border-[#E2E5DE] bg-white p-5"><div className="flex justify-between"><h2 className="font-serif text-xl font-bold">{editingId === null ? 'Thêm nhà cung cấp' : `Sửa Supplier #${editingId}`}</h2>{editingId !== null && <button type="button" onClick={resetForm} className="text-xs font-bold uppercase underline">Hủy sửa</button>}</div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"><label className="space-y-1"><span className="text-xs font-semibold">Tên *</span><input required maxLength={255} value={form.name} onChange={(event) => setField('name', event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-semibold">Điện thoại</span><input maxLength={20} value={form.phone ?? ''} onChange={(event) => setField('phone', event.target.value || null)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-semibold">Email</span><input type="email" maxLength={254} value={form.email ?? ''} onChange={(event) => setField('email', event.target.value || null)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-semibold">Địa chỉ</span><input maxLength={500} value={form.address ?? ''} onChange={(event) => setField('address', event.target.value || null)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-semibold">Trạng thái</span><select value={form.usage_status} onChange={(event) => setField('usage_status', event.target.value as SupplierUsageStatus)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select></label><label className="space-y-1"><span className="text-xs font-semibold">Ghi chú</span><input maxLength={500} value={form.note ?? ''} onChange={(event) => setField('note', event.target.value || null)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label></div><button disabled={saving} className="bg-[#0B2419] px-5 py-2.5 text-xs font-bold uppercase text-white disabled:opacity-40">{saving ? 'Đang lưu...' : editingId === null ? 'Tạo nhà cung cấp' : 'Lưu thay đổi'}</button></form>

      <div className="overflow-x-auto rounded-lg border border-[#E2E5DE] bg-white">{loading ? <div className="p-10 text-center text-sm">Đang tải...</div> : <table className="min-w-full text-left text-sm"><thead className="bg-[#F5F6F2] text-xs uppercase text-[#606863]"><tr><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Liên hệ</th><th className="px-4 py-3">Địa chỉ</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-[#E2E5DE]">{rows.map((supplier) => <tr key={supplier.supplier_id}><td className="px-4 py-3"><strong>{supplier.name}</strong><p className="text-xs text-[#606863]">#{supplier.supplier_id}</p></td><td className="px-4 py-3 text-xs">{supplier.phone ?? '—'}<br />{supplier.email ?? '—'}</td><td className="max-w-xs px-4 py-3 text-xs">{supplier.address ?? '—'}</td><td className="px-4 py-3 font-bold">{supplier.usage_status}</td><td className="px-4 py-3 text-right"><button type="button" onClick={() => startEdit(supplier)} className="border border-[#0B2419] px-3 py-2 text-xs font-bold uppercase">Sửa</button></td></tr>)}</tbody></table>}</div>
      {meta && meta.total_pages > 1 && <div className="flex justify-center gap-3 text-sm"><button type="button" disabled={page <= 1 || loading} onClick={() => { setLoading(true); setPage((value) => value - 1); }} className="border border-[#D9DDD6] bg-white px-4 py-2 disabled:opacity-40">Trang trước</button><span className="py-2">{meta.page} / {meta.total_pages}</span><button type="button" disabled={page >= meta.total_pages || loading} onClick={() => { setLoading(true); setPage((value) => value + 1); }} className="border border-[#D9DDD6] bg-white px-4 py-2 disabled:opacity-40">Trang sau</button></div>}
    </div>
  );
};
