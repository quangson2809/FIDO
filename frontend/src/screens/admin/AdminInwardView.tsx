import { useRemoteQuery } from '../../shared/hooks/useRemoteQuery';
import { QueryFeedback } from '../../shared/admin/QueryFeedback';
import { useDirtyForm } from '../../shared/admin/dirtyFormContext';
import React, { useCallback, useState } from 'react';
import { inventoryAdminService } from '../../features/inventory/api/adminService';
import { getApiErrorMessage } from '../../services/http/apiError';
import type {
  GoodsReceiptDetailDto,
  GoodsReceiptItemInput,
  GoodsReceiptStatus,
} from '../../features/inventory/types';
import { getVietnamToday } from '../../shared/time/vietnamCalendar';

const emptyItem = (): GoodsReceiptItemInput => ({ variant_id: 0, quantity: 1 });

export const AdminInwardView: React.FC<{
  showToast: (msg: string) => void;
  onNavigateTab: (tab: string, breadcrumb: string) => void;
  canWrite: boolean;
}> = ({ showToast, onNavigateTab, canWrite }) => {
  const [status, setStatus] = useState<GoodsReceiptStatus | ''>('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GoodsReceiptDetailDto | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [receiptDate, setReceiptDate] = useState(getVietnamToday());
  const [note, setNote] = useState('');
  const [items, setItems] = useState<GoodsReceiptItemInput[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);

  const [savedDraft, setSavedDraft] = useState('');
  const draftKey = JSON.stringify({ supplierId, receiptDate, note, items });
  const dirty = selected ? draftKey !== savedDraft : Boolean(supplierId || note || items.length > 1 || items[0]?.variant_id || items[0]?.quantity !== 1);
  const canDiscard = useDirtyForm(dirty);
  const list = useRemoteQuery(useCallback(() => inventoryAdminService.listReceipts({ receipt_status: status || undefined, page, page_size: 20 }), [page, status]));
  const supplierQuery = useRemoteQuery(useCallback(() => inventoryAdminService.listSuppliers({ usage_status: 'ACTIVE', page: 1, page_size: 100 }), []));
  const receipts = list.data?.data ?? [];
  const meta = list.data?.meta;
  const suppliers = supplierQuery.data?.data ?? [];
  const loading = list.loading;
  const loadList = async () => { list.reload(); };

  const resetDraftForm = () => {
    setSelected(null);
    setSupplierId('');
    setReceiptDate(getVietnamToday());
    setNote('');
    setItems([emptyItem()]);
  };

  const editDetail = (detail: GoodsReceiptDetailDto) => {
    setSelected(detail);
    setSupplierId(String(detail.supplier_id));
    setReceiptDate(detail.receipt_date);
    setNote(detail.note ?? '');
    const nextItems = detail.items.map((item) => ({ variant_id: item.variant_id, quantity: item.quantity }));
    setItems(nextItems);
    setSavedDraft(JSON.stringify({ supplierId: String(detail.supplier_id), receiptDate: detail.receipt_date, note: detail.note ?? '', items: nextItems }));
  };

  const openDetail = async (receiptId: number) => {
    if (saving || !canDiscard()) return;
    setSaving(true);
    setError(null);
    try {
      editDetail(await inventoryAdminService.getReceipt(receiptId));
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể tải chi tiết phiếu nhập.'));
    } finally { setSaving(false); }
  };

  const setItem = (index: number, patch: Partial<GoodsReceiptItemInput>) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const normalizedItems = (): GoodsReceiptItemInput[] | null => {
    if (items.length === 0) return null;
    const normalized = items.map((item) => ({
      variant_id: Number(item.variant_id),
      quantity: Number(item.quantity),
    }));
    if (normalized.some((item) => !Number.isInteger(item.variant_id) || item.variant_id <= 0 || !Number.isInteger(item.quantity) || item.quantity <= 0)) return null;
    if (new Set(normalized.map((item) => item.variant_id)).size !== normalized.length) return null;
    return normalized;
  };

  const saveReceipt = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canWrite || saving) return;
    const parsedSupplier = Number(supplierId);
    const normalized = normalizedItems();
    if (!Number.isInteger(parsedSupplier) || parsedSupplier <= 0 || !receiptDate || !normalized) {
      setError('Phiếu nhập cần supplier ACTIVE, ngày nhập và ít nhất một variant hợp lệ; không được trùng variant.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const detail = selected
        ? await inventoryAdminService.updateReceipt(selected.receipt_id, {
            supplier_id: parsedSupplier,
            receipt_date: receiptDate,
            note: note.trim() || null,
            items: normalized,
          })
        : await inventoryAdminService.createReceipt({
            supplier_id: parsedSupplier,
            receipt_date: receiptDate,
            note: note.trim() || null,
            items: normalized,
          });
      editDetail(detail);
      await loadList();
      showToast(selected ? 'Đã cập nhật phiếu nhập DRAFT.' : 'Đã tạo phiếu nhập DRAFT.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể lưu phiếu nhập. Chỉ DRAFT được sửa; backend cũng kiểm tra supplier, variant và duplicate.'));
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action: 'CONFIRM' | 'CANCEL') => {
    if (!canWrite || !selected || saving) return;
    if (dirty) { setError('Phiếu có thay đổi chưa lưu. Hãy lưu bản nháp trước khi xác nhận hoặc hủy.'); return; }
    if (!window.confirm(`${action === 'CONFIRM' ? 'Xác nhận' : 'Hủy'} phiếu ${selected.receipt_code}?\n${action === 'CONFIRM' ? `${selected.items.length} dòng, tổng ${selected.items.reduce((total, item) => total + item.quantity, 0)} sản phẩm sẽ được cộng vào kho. Phiếu đã xác nhận không sửa được.` : 'Phiếu sẽ bị hủy và không cộng tồn kho.'}`)) return;
    setSaving(true);
    setError(null);
    try {
      const detail = await inventoryAdminService.receiptAction(selected.receipt_id, action);
      editDetail(detail);
      await loadList();
      showToast(action === 'CONFIRM' ? 'Đã xác nhận nhập kho.' : 'Đã hủy phiếu nhập.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể thực hiện action. Chỉ DRAFT có thể CONFIRM/CANCEL; backend giữ transaction và concurrency boundary.'));
    } finally {
      setSaving(false);
    }
  };

  const isDraft = selected?.receipt_status === 'DRAFT';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">Goods receipts</p><h1 className="mt-1 font-serif text-3xl font-bold">Phiếu nhập kho</h1><p className="mt-2 text-sm text-[#606863]">DRAFT → CONFIRMED/CANCELLED. CONFIRM tăng inventory đúng một lần ở backend.</p></div><div className="flex gap-2">{canWrite && <button type="button" onClick={() => { if (!saving && canDiscard()) resetDraftForm(); }} className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white">Phiếu mới</button>}<button type="button" onClick={() => onNavigateTab('suppliers', 'Nhà cung cấp')} className="border border-[#0B2419] px-4 py-2 text-xs font-bold uppercase">Nhà cung cấp</button></div></div>
      <QueryFeedback error={list.error} onRetry={list.reload} />
      <QueryFeedback error={supplierQuery.error} onRetry={supplierQuery.reload} />
      {error && <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}<button type="button" onClick={() => { list.reload(); supplierQuery.reload(); }}>Thử tải lại</button></div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3"><select value={status} onChange={(event) => { list.reload(); setPage(1); setStatus(event.target.value as GoodsReceiptStatus | ''); }} className="border border-[#D9DDD6] bg-white px-3 py-2 text-sm"><option value="">Tất cả trạng thái</option><option value="DRAFT">DRAFT</option><option value="CONFIRMED">CONFIRMED</option><option value="CANCELLED">CANCELLED</option></select></div>
          <div className="overflow-x-auto rounded-lg border border-[#E2E5DE] bg-white">{loading ? <div className="p-10 text-center text-sm">Đang tải...</div> : list.error ? null : receipts.length === 0 ? <div className="p-10 text-center text-sm">Chưa có phiếu nhập.</div> : <table className="min-w-full text-left text-sm"><thead className="bg-[#F5F6F2] text-xs uppercase text-[#606863]"><tr><th className="px-4 py-3">Phiếu</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Ngày nhập</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-[#E2E5DE]">{receipts.map((receipt) => <tr key={receipt.receipt_id}><td className="px-4 py-3"><strong className="font-mono">{receipt.receipt_code}</strong><p className="text-xs text-[#606863]">#{receipt.receipt_id}</p></td><td className="px-4 py-3">#{receipt.supplier_id}</td><td className="px-4 py-3">{receipt.receipt_date}</td><td className="px-4 py-3 font-bold">{receipt.receipt_status}</td><td className="px-4 py-3 text-right"><button type="button" onClick={() => void openDetail(receipt.receipt_id)} className="border border-[#0B2419] px-3 py-2 text-xs font-bold uppercase">Chi tiết</button></td></tr>)}</tbody></table>}</div>
          {meta && meta.total_pages > 1 && <div className="flex justify-center gap-3 text-sm"><button type="button" disabled={page <= 1 || loading} onClick={() => { list.reload(); setPage((value) => value - 1); }} className="border border-[#D9DDD6] bg-white px-4 py-2 disabled:opacity-40">Trang trước</button><span className="py-2">{meta.page} / {meta.total_pages}</span><button type="button" disabled={page >= meta.total_pages || loading} onClick={() => { list.reload(); setPage((value) => value + 1); }} className="border border-[#D9DDD6] bg-white px-4 py-2 disabled:opacity-40">Trang sau</button></div>}
        </section>

        <aside className="rounded-lg border border-[#E2E5DE] bg-white p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-serif text-xl font-bold">{selected ? selected.receipt_code : canWrite ? 'Tạo phiếu DRAFT' : 'Chi tiết phiếu nhập'}</h2>{selected && <p className="mt-1 text-xs font-bold">{selected.receipt_status}</p>}</div>{selected && canWrite && <button type="button" onClick={() => { if (!saving && canDiscard()) resetDraftForm(); }} className="text-xs font-bold uppercase underline">Phiếu mới</button>}</div>
          {(canWrite || selected) ? <form onSubmit={saveReceipt} className="mt-5 space-y-4"><fieldset disabled={saving} className="contents"><label className="block space-y-1"><span className="text-xs font-semibold">Supplier ACTIVE *</span><select required disabled={!canWrite || (selected !== null && !isDraft)} value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm disabled:bg-[#F5F6F2]"><option value="">Chọn supplier</option>{suppliers.map((supplier) => <option key={supplier.supplier_id} value={supplier.supplier_id}>#{supplier.supplier_id} {supplier.name}</option>)}</select></label><label className="block space-y-1"><span className="text-xs font-semibold">Ngày nhập *</span><input type="date" required disabled={!canWrite || (selected !== null && !isDraft)} value={receiptDate} onChange={(event) => setReceiptDate(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm disabled:bg-[#F5F6F2]" /></label><label className="block space-y-1"><span className="text-xs font-semibold">Ghi chú</span><textarea rows={2} disabled={!canWrite || (selected !== null && !isDraft)} value={note} onChange={(event) => setNote(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm disabled:bg-[#F5F6F2]" /></label>
            <div className="space-y-2"><div className="flex items-center justify-between"><span className="text-xs font-semibold">Items *</span>{canWrite && (selected === null || isDraft) && <button type="button" onClick={() => setItems((current) => [...current, emptyItem()])} className="text-xs font-bold uppercase underline">+ Dòng</button>}</div>{items.map((item, index) => <div key={index} className="grid grid-cols-[1fr_100px_auto] gap-2"><input type="number" min="1" step="1" disabled={!canWrite || (selected !== null && !isDraft)} value={item.variant_id || ''} onChange={(event) => setItem(index, { variant_id: Number(event.target.value) })} placeholder="Variant ID" className="border border-[#D9DDD6] px-3 py-2 text-sm disabled:bg-[#F5F6F2]" /><input type="number" min="1" step="1" disabled={!canWrite || (selected !== null && !isDraft)} value={item.quantity} onChange={(event) => setItem(index, { quantity: Number(event.target.value) })} className="border border-[#D9DDD6] px-3 py-2 text-sm disabled:bg-[#F5F6F2]" />{canWrite && (selected === null || isDraft) && <button type="button" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="px-2 text-red-700 disabled:opacity-30">×</button>}</div>)}</div>
            {canWrite && (selected === null || isDraft) && <button disabled={saving} className="w-full bg-[#0B2419] px-4 py-2.5 text-xs font-bold uppercase text-white disabled:opacity-40">{saving ? 'Đang lưu...' : selected ? 'Lưu DRAFT' : 'Tạo DRAFT'}</button>}
          </fieldset></form> : <p className="mt-5 text-sm text-[#606863]">Chọn một phiếu trong danh sách để xem chi tiết. Cần INVENTORY_WRITE để tạo hoặc thay đổi phiếu.</p>}
          {selected && <div className="mt-4 border-t border-[#E2E5DE] pt-4 text-xs text-[#606863]"><p>Created by account #{selected.created_by_account_id}</p><p>Confirmed by: {selected.confirmed_by_account_id ? `#${selected.confirmed_by_account_id}` : '—'}</p></div>}
          {canWrite && isDraft && <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" disabled={saving} onClick={() => void runAction('CONFIRM')} className="bg-[#0B2419] px-3 py-2 text-xs font-bold uppercase text-white disabled:opacity-40">CONFIRM</button><button type="button" disabled={saving} onClick={() => void runAction('CANCEL')} className="border border-red-300 px-3 py-2 text-xs font-bold uppercase text-red-700 disabled:opacity-40">CANCEL</button></div>}
        </aside>
      </div>
    </div>
  );
};
