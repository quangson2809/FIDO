import { StatusBadge } from '../../shared/admin/StatusBadge';
import { useSearchParams } from 'react-router-dom';
import { Pagination } from '../../shared/admin/Pagination';
import { statusLabel } from '../../shared/admin/statusLabels';
import { useRemoteQuery } from '../../shared/hooks/useRemoteQuery';
import { QueryFeedback } from '../../shared/admin/QueryFeedback';
import { useDirtyForm } from '../../shared/admin/dirtyFormContext';
import React, { useCallback, useState } from 'react';
import { inventoryAdminService } from '../../features/inventory/api/adminService';
import { getApiErrorMessage } from '../../services/http/apiError';
import type { GoodsReceiptDetailDto, GoodsReceiptItemInput, GoodsReceiptStatus } from '../../features/inventory/types';
import { formatVietnamDateTime } from '../../shared/time/formatVietnamDateTime';

const emptyItem = (): GoodsReceiptItemInput => ({ product_id: 0, quantity_received: 1, unit_cost: 0 });

export const AdminInwardView: React.FC<{
  showToast: (msg: string) => void;
  onNavigateTab: (tab: string, breadcrumb: string) => void;
  canWrite: boolean;
}> = ({ showToast, onNavigateTab, canWrite }) => {
  const [params, setParams] = useSearchParams();
  const statuses = ['DRAFT', 'CONFIRMED', 'CANCELLED'] as const;
  const statusParam = params.get('status');
  const status: GoodsReceiptStatus | '' =
    statusParam === 'DRAFT' || statusParam === 'CONFIRMED' || statusParam === 'CANCELLED'
      ? statusParam
      : '';
  const setStatus = (value: string) => setParams(value ? { status: value } : {});
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GoodsReceiptDetailDto | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<GoodsReceiptItemInput[]>([emptyItem()]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierPage, setSupplierPage] = useState(1);
  const [saving, setSaving] = useState(false);

  const draftKey = JSON.stringify({ supplierId, items });
  const [savedDraft, setSavedDraft] = useState(draftKey);
  const dirty = draftKey !== savedDraft;
  const canDiscard = useDirtyForm(dirty);
  const loadReceipts = useCallback(
    () => inventoryAdminService.listReceipts({
      receipt_status: status || undefined,
      page,
      page_size: 20,
    }),
    [page, status],
  );
  const loadSuppliers = useCallback(
    () => inventoryAdminService.listSuppliers({
      status: 'ACTIVE',
      q: supplierSearch || undefined,
      page: supplierPage,
      page_size: 20,
    }),
    [supplierSearch, supplierPage],
  );
  const list = useRemoteQuery(loadReceipts);
  const supplierQuery = useRemoteQuery(loadSuppliers);
  const receipts = list.data?.data ?? [];
  const meta = list.data?.meta;
  const suppliers = supplierQuery.data?.data ?? [];
  const isDraft = selected?.receipt_status === 'DRAFT';

  const resetDraftForm = () => {
    setSelected(null);
    setSupplierId('');
    setItems([emptyItem()]);
    setSavedDraft(JSON.stringify({ supplierId: '', items: [emptyItem()] }));
    setError(null);
  };
  const editDetail = (detail: GoodsReceiptDetailDto) => {
    const nextItems = detail.items.map((item) => ({
      product_id: item.product_id, quantity_received: item.quantity_received, unit_cost: item.unit_cost,
    }));
    const nextSupplierId = String(detail.supplier_id);
    setSelected(detail);
    setSupplierId(nextSupplierId);
    setItems(nextItems);
    setSavedDraft(JSON.stringify({ supplierId: nextSupplierId, items: nextItems }));
  };
  const openDetail = async (receiptId: number) => {
    if (saving || !canDiscard()) return;
    setSaving(true);
    setError(null);
    try { editDetail(await inventoryAdminService.getReceipt(receiptId)); }
    catch (requestError: unknown) { setError(getApiErrorMessage(requestError, 'Không thể tải chi tiết phiếu nhập.')); }
    finally { setSaving(false); }
  };
  const setItem = (index: number, patch: Partial<GoodsReceiptItemInput>) =>
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));

  const normalizedItems = (): GoodsReceiptItemInput[] | null => {
    if (items.length === 0) return null;
    const normalized = items.map((item) => ({
      product_id: Number(item.product_id), quantity_received: Number(item.quantity_received), unit_cost: Number(item.unit_cost),
    }));
    if (normalized.some((item) =>
      !Number.isSafeInteger(item.product_id) || item.product_id <= 0 ||
      !Number.isSafeInteger(item.quantity_received) || item.quantity_received <= 0 ||
      !Number.isSafeInteger(item.unit_cost) || item.unit_cost < 0
    )) return null;
    if (new Set(normalized.map((item) => item.product_id)).size !== normalized.length) return null;
    return normalized;
  };

  const saveReceipt = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWrite || saving) return;
    const parsedSupplier = Number(supplierId);
    const normalized = normalizedItems();
    if (!Number.isSafeInteger(parsedSupplier) || parsedSupplier <= 0 || !normalized) {
      setError('Chọn nhà cung cấp ACTIVE và nhập Product ID, số lượng nhận, giá vốn hợp lệ; không được trùng Product ID.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const detail = selected
        ? await inventoryAdminService.updateReceipt(selected.receipt_id, { supplier_id: parsedSupplier, items: normalized })
        : await inventoryAdminService.createReceipt({ supplier_id: parsedSupplier, items: normalized });
      editDetail(detail);
      list.reload();
      showToast(selected ? 'Đã cập nhật phiếu nhập DRAFT.' : 'Đã tạo phiếu nhập DRAFT.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể lưu phiếu nhập. Kiểm tra trạng thái DRAFT, nhà cung cấp và Product ID.'));
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action: 'CONFIRM' | 'CANCEL') => {
    if (!canWrite || !selected || saving) return;
    if (dirty) { setError('Phiếu có thay đổi chưa lưu. Hãy lưu bản nháp trước khi xác nhận hoặc hủy.'); return; }
    const message = action === 'CONFIRM'
      ? 'Xác nhận phiếu ' + selected.receipt_code + '? ' + selected.items.length + ' dòng với tổng ' +
        selected.items.reduce((total, item) => total + item.quantity_received, 0) + ' sản phẩm sẽ được cộng vào kho.'
      : 'Hủy phiếu ' + selected.receipt_code + '? Phiếu sẽ không cộng tồn kho.';
    if (!window.confirm(message)) return;
    setSaving(true);
    setError(null);
    try {
      const detail = await inventoryAdminService.receiptAction(selected.receipt_id, action);
      editDetail(detail);
      list.reload();
      showToast(action === 'CONFIRM' ? 'Đã xác nhận nhập kho.' : 'Đã hủy phiếu nhập.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể thao tác. Chỉ phiếu DRAFT mới có thể xác nhận hoặc hủy.'));
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">Goods receipts</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Phiếu nhập kho</h1>
          <p className="mt-2 text-sm text-[#606863]">Tạo bản nháp và xác nhận nhập kho bằng Product ID, số lượng nhận, giá vốn VND và nhà cung cấp.</p>
        </div>
        <div className="flex gap-2">
          {canWrite && <button type="button" disabled={saving} onClick={() => { if (canDiscard()) resetDraftForm(); }} className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white">Phiếu mới</button>}
          <button type="button" onClick={() => onNavigateTab('suppliers', 'Nhà cung cấp')} className="border border-[#0B2419] px-4 py-2 text-xs font-bold uppercase">Nhà cung cấp</button>
        </div>
      </header>

      <QueryFeedback loading={list.loading} error={list.error} onRetry={list.reload} />
      <QueryFeedback loading={supplierQuery.loading} error={supplierQuery.error} onRetry={supplierQuery.reload} />
      {error && <div role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error} <button type="button" className="ml-2 underline" onClick={() => { list.reload(); supplierQuery.reload(); }}>Thử tải lại</button>
      </div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="min-w-0 space-y-4">
          <select aria-label="Trạng thái phiếu nhập" value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }} className="border border-[#D9DDD6] bg-white px-3 py-2 text-sm">
            <option value="">Tất cả trạng thái</option>
            {statuses.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
          </select>
          <div className="overflow-x-auto rounded-lg border border-[#E2E5DE] bg-white">
            {list.loading ? <div className="p-10 text-center text-sm">Đang tải...</div> : list.error ? null : receipts.length === 0 ? (
              <div className="p-10 text-center text-sm">Chưa có phiếu nhập.</div>
            ) : (
              <table className="min-w-full text-left text-sm"><thead className="bg-[#F5F6F2] text-xs uppercase text-[#606863]">
                <tr><th className="px-4 py-3">Phiếu</th><th className="px-4 py-3">Nhà cung cấp</th><th className="px-4 py-3">Tạo lúc</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3" /></tr>
              </thead><tbody className="divide-y divide-[#E2E5DE]">
                {receipts.map((receipt) => <tr key={receipt.receipt_id}>
                  <td className="px-4 py-3"><strong className="font-mono">{receipt.receipt_code}</strong><p className="text-xs text-[#606863]">#{receipt.receipt_id}</p></td>
                  <td className="px-4 py-3">{suppliers.find((supplier) => supplier.supplier_id === receipt.supplier_id)?.name ?? 'Nhà cung cấp #' + receipt.supplier_id}</td>
                  <td className="px-4 py-3">{formatVietnamDateTime(receipt.created_at)}</td>
                  <td className="px-4 py-3 font-bold"><StatusBadge status={receipt.receipt_status} /></td>
                  <td className="px-4 py-3 text-right"><button type="button" disabled={saving} onClick={() => void openDetail(receipt.receipt_id)} className="border border-[#0B2419] px-3 py-2 text-xs font-bold uppercase">Chi tiết</button></td>
                </tr>)}
              </tbody></table>
            )}
          </div>
          <Pagination meta={meta} loading={list.loading} onPage={setPage} />
        </section>

        <aside className="min-w-0 rounded-lg border border-[#E2E5DE] bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="font-serif text-xl font-bold">{selected?.receipt_code ?? (canWrite ? 'Tạo phiếu nháp' : 'Chi tiết phiếu nhập')}</h2>
              {selected && <p className="mt-1 text-xs font-bold">{statusLabel(selected.receipt_status)}</p>}</div>
            {selected && canWrite && <button type="button" disabled={saving} onClick={() => { if (canDiscard()) resetDraftForm(); }} className="text-xs font-bold uppercase underline">Phiếu mới</button>}
          </div>
          {canWrite || selected ? (
            <form onSubmit={saveReceipt} className="mt-5 space-y-4">
              <fieldset disabled={saving} className="contents">
                <label className="block space-y-1"><span className="text-xs font-semibold">Nhà cung cấp ACTIVE *</span>
                  <input aria-label="Tìm nhà cung cấp" disabled={!canWrite || (selected !== null && !isDraft)} value={supplierSearch}
                    onChange={(event) => { setSupplierSearch(event.target.value); setSupplierPage(1); }}
                    placeholder="Tìm tên hoặc mã nhà cung cấp" className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" />
                  <select aria-label="Chọn nhà cung cấp" required disabled={!canWrite || (selected !== null && !isDraft)}
                    value={supplierId} onChange={(event) => setSupplierId(event.target.value)}
                    className="w-full border border-[#D9DDD6] px-3 py-2 text-sm disabled:bg-[#F5F6F2]">
                    <option value="">Chọn nhà cung cấp</option>
                    {supplierId && !suppliers.some((supplier) => supplier.supplier_id === Number(supplierId)) && <option value={supplierId}>Nhà cung cấp #{supplierId} (đang chọn)</option>}
                    {suppliers.map((supplier) => <option key={supplier.supplier_id} value={supplier.supplier_id}>#{supplier.supplier_id} · {supplier.code} · {supplier.name}</option>)}
                  </select>
                </label>
                <Pagination meta={supplierQuery.data?.meta} loading={supplierQuery.loading} onPage={setSupplierPage} />
                {selected && <div className="rounded bg-[#F5F6F2] p-3 text-sm">
                  <p>Kho vận hành: #{selected.warehouse_id}</p><p>Tạo lúc: {formatVietnamDateTime(selected.created_at)}</p>
                  <p>Người tạo: #{selected.created_by_account_id}</p>
                  <p>Người xác nhận: {selected.confirmed_by_account_id ? '#' + selected.confirmed_by_account_id : '—'}</p>
                </div>}
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><span className="text-xs font-semibold">Product ID, số lượng nhận và giá vốn VND *</span>
                    {canWrite && (selected === null || isDraft) && <button type="button" disabled={saving} onClick={() => setItems((current) => [...current, emptyItem()])} className="text-xs font-bold uppercase underline">+ Dòng</button>}
                  </div>
                  {items.map((item, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_76px_104px_auto] gap-2">
                    <input type="number" min="1" step="1" required disabled={!canWrite || (selected !== null && !isDraft)}
                      aria-label={'Product ID dòng ' + (index + 1)} value={item.product_id || ''}
                      onChange={(event) => setItem(index, { product_id: Number(event.target.value) })}
                      placeholder="Product ID" className="min-w-0 w-full border border-[#D9DDD6] px-2 py-2 text-sm disabled:bg-[#F5F6F2]" />
                    <input type="number" min="1" step="1" required disabled={!canWrite || (selected !== null && !isDraft)}
                      aria-label={'Số lượng nhận dòng ' + (index + 1)} value={item.quantity_received}
                      onChange={(event) => setItem(index, { quantity_received: Number(event.target.value) })}
                      className="w-full border border-[#D9DDD6] px-2 py-2 text-sm disabled:bg-[#F5F6F2]" />
                    <input type="number" min="0" step="1" required disabled={!canWrite || (selected !== null && !isDraft)}
                      aria-label={'Giá vốn VND dòng ' + (index + 1)} value={item.unit_cost}
                      onChange={(event) => setItem(index, { unit_cost: Number(event.target.value) })}
                      placeholder="Giá vốn" className="w-full border border-[#D9DDD6] px-2 py-2 text-sm disabled:bg-[#F5F6F2]" />
                    {canWrite && (selected === null || isDraft) && <button type="button" disabled={items.length === 1 || saving}
                      onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      aria-label={'Xóa dòng ' + (index + 1)} className="px-2 text-red-700 disabled:opacity-30">×</button>}
                  </div>)}
                </div>
                {selected && <div className="rounded-lg bg-[#FAF4DF] p-3 text-sm"><h3 className="font-semibold">Đối chiếu phiếu nhập</h3>
                  <p>{items.length} dòng · Tổng {items.reduce((sum, item) => sum + item.quantity_received, 0)} sản phẩm</p>
                  <p>{dirty ? 'Có thay đổi chưa lưu. Lưu bản nháp trước khi xác nhận.' : 'Đang xem dữ liệu đã lưu.'}</p>
                </div>}
                {canWrite && (selected === null || isDraft) && <button disabled={saving} className="w-full bg-[#0B2419] px-4 py-2.5 text-xs font-bold uppercase text-white disabled:opacity-40">
                  {saving ? 'Đang lưu...' : selected ? 'Lưu bản nháp' : 'Tạo bản nháp'}</button>}
              </fieldset>
            </form>
          ) : <p className="mt-5 text-sm text-[#606863]">Chọn phiếu trong danh sách để xem chi tiết. Bạn đang ở chế độ chỉ đọc.</p>}
          {canWrite && selected && isDraft && <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" disabled={saving} onClick={() => void runAction('CONFIRM')} className="bg-[#0B2419] px-3 py-2 text-xs font-bold uppercase text-white disabled:opacity-40">Xác nhận nhập kho</button>
            <button type="button" disabled={saving} onClick={() => void runAction('CANCEL')} className="border border-red-300 px-3 py-2 text-xs font-bold uppercase text-red-700 disabled:opacity-40">Hủy phiếu</button>
          </div>}
        </aside>
      </div>
    </div>
  );
};
