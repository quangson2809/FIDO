import { formatVietnamDateTime } from '../../shared/time/formatVietnamDateTime';
import { statusLabel } from '../../shared/admin/statusLabels';
import { useDirtyForm } from '../../shared/admin/dirtyFormContext';
import { useCallback } from 'react';
import { useRemoteQuery } from '../../shared/hooks/useRemoteQuery';
import { QueryFeedback } from '../../shared/admin/QueryFeedback';
import React, { useState } from 'react';
import { inventoryAdminService } from '../../features/inventory/api/adminService';
import { getApiErrorMessage } from '../../services/http/apiError';
import type {
  InventoryRowDto,
  InventoryTransactionType,
} from '../../features/inventory/types';

const transactionTypes: InventoryTransactionType[] = [
  'RECEIPT_IN',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'ORDER_CONFIRM_OUT',
  'ORDER_CANCEL_IN',
  'DELIVERY_RETURN_IN',
];

export const AdminInventoryView: React.FC<{ showToast: (msg: string) => void; canWrite: boolean }> = ({ showToast, canWrite }) => {
  const [skuInput, setSkuInput] = useState('');
  const [sku, setSku] = useState('');
  const [page, setPage] = useState(1);
  const list = useRemoteQuery(useCallback(() => inventoryAdminService.listInventory({ ...(sku ? { sku } : {}), page, page_size: 20 }), [page, sku]));
  const rows = list.data?.data ?? [];
  const meta = list.data?.meta ?? null;
  const loading = list.loading;
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<InventoryRowDto | null>(null);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [transactionType, setTransactionType] = useState<InventoryTransactionType | ''>('');
  const [transactionPage, setTransactionPage] = useState(1);

  const canDiscard = useDirtyForm(Boolean(selected && (delta || reason)));
  const refreshInventory = async () => { list.reload(); };



  const history = useRemoteQuery(useCallback(() => inventoryAdminService.listTransactions({ transaction_type: transactionType || undefined, page: transactionPage, page_size: 20 }), [transactionPage, transactionType]));
  const transactions = history.data?.data ?? [];
  const transactionMeta = history.data?.meta;

  const applySearch = (event: React.FormEvent) => {
    event.preventDefault();
    list.reload();
    setPage(1);
    setSku(skuInput.trim());
  };

  const changePage = (nextPage: number) => {
    list.reload();
    setPage(nextPage);
  };

  const adjust = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canWrite || !selected || saving) return;
    const parsedDelta = Number(delta);
    if (!Number.isSafeInteger(parsedDelta) || parsedDelta === 0 || selected.available_quantity + parsedDelta < 0 || !reason.trim()) {
      setError('Nhập số nguyên khác 0, số lượng sau điều chỉnh không âm và lý do cụ thể.');
      return;
    }
    if (!window.confirm(`Điều chỉnh ${selected.product_name} · ${selected.sku ?? selected.variant_id} (${selected.size} / ${selected.color}) từ ${selected.available_quantity} thành ${selected.available_quantity + parsedDelta}?\nLý do: ${reason.trim()}. Tồn kho được kiểm tra lại khi lưu.`)) return;
    setSaving(true);
    setError(null);
    try {
      await inventoryAdminService.adjustInventory({
        variant_id: selected.variant_id,
        quantity_delta: parsedDelta,
        reason: reason.trim(),
      });
      await refreshInventory();
      setSelected(null);
      setDelta('');
      setReason('');
      setTransactionPage(1);
      history.reload();
      showToast('Đã điều chỉnh tồn kho qua backend.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể điều chỉnh tồn kho. Backend có thể từ chối do quyền, variant hoặc số lượng khả dụng.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">Inventory</p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-[#0B2419]">Tồn kho theo biến thể</h1>
        <p className="mt-2 text-sm text-[#606863]">Số lượng khả dụng và transaction lấy trực tiếp từ backend; không suy diễn kho, reserved stock hay ngưỡng low-stock.</p>
      </header>

      <QueryFeedback error={list.error} onRetry={list.reload} />
      {error && <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <form onSubmit={applySearch} className="flex flex-wrap gap-3 rounded-lg border border-[#E2E5DE] bg-white p-4">
        <input value={skuInput} onChange={(event) => setSkuInput(event.target.value)} placeholder="Lọc theo SKU" className="min-w-64 flex-1 border border-[#D9DDD6] px-3 py-2 text-sm" />
        <button className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white">Tìm</button>
      </form>

      <section className="overflow-x-auto rounded-lg border border-[#E2E5DE] bg-white">
        {loading ? <div className="p-10 text-center text-sm text-[#606863]">Đang tải tồn kho...</div> : list.error ? null : rows.length === 0 ? <div className="p-10 text-center text-sm">Không có biến thể phù hợp.</div> : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#F5F6F2] text-xs uppercase text-[#606863]"><tr><th className="px-4 py-3">Variant / SKU</th><th className="px-4 py-3">Sản phẩm</th><th className="px-4 py-3">Quy cách</th><th className="px-4 py-3">Sale status</th><th className="px-4 py-3 text-right">Khả dụng</th><th className="px-4 py-3" /></tr></thead>
            <tbody className="divide-y divide-[#E2E5DE]">
              {rows.map((row) => <tr key={row.variant_id}><td className="px-4 py-3"><strong className="font-mono">#{row.variant_id}</strong><p className="text-xs text-[#606863]">{row.sku ?? 'Không có SKU'}</p></td><td className="px-4 py-3"><strong>{row.product_name}</strong><p className="text-xs text-[#606863]">Product #{row.product_id}</p></td><td className="px-4 py-3">{row.size} · {row.color}</td><td className="px-4 py-3">{statusLabel(row.sale_status)}</td><td className="px-4 py-3 text-right text-lg font-bold">{row.available_quantity}</td><td className="px-4 py-3 text-right">{canWrite && <button type="button" onClick={() => { if (saving || !canDiscard()) return; setSelected(row); setDelta(''); setReason(''); }} className="border border-[#0B2419] px-3 py-2 text-xs font-bold uppercase">Điều chỉnh</button>}</td></tr>)}
            </tbody>
          </table>
        )}
      </section>

      {meta && meta.total_pages > 1 && <div className="flex justify-center gap-3 text-sm"><button type="button" disabled={page <= 1 || loading} onClick={() => changePage(page - 1)} className="border border-[#D9DDD6] bg-white px-4 py-2 disabled:opacity-40">Trang trước</button><span className="py-2">{meta.page} / {meta.total_pages}</span><button type="button" disabled={page >= meta.total_pages || loading} onClick={() => changePage(page + 1)} className="border border-[#D9DDD6] bg-white px-4 py-2 disabled:opacity-40">Trang sau</button></div>}

      {canWrite && selected && <form onSubmit={adjust} className="rounded-lg border border-[#E2E5DE] bg-white p-5"><fieldset disabled={saving} className="contents"><h2 className="font-serif text-xl font-bold">Điều chỉnh {selected.product_name}</h2><p className="mt-1 text-xs text-[#606863]">Hiện khả dụng: {selected.available_quantity}. Delta dương tăng kho, delta âm giảm kho; backend kiểm tra invariant.</p><p className="mt-3 font-semibold">Dự kiến: {selected.available_quantity} → {Number.isInteger(Number(delta)) ? selected.available_quantity + Number(delta) : "—"}</p><div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr_auto]"><input type="number" step="1" required value={delta} onChange={(event) => setDelta(event.target.value)} aria-label="Số lượng điều chỉnh" placeholder="Tăng (+) / giảm (−)" className="border border-[#D9DDD6] px-3 py-2 text-sm" /><input required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Lý do điều chỉnh" className="border border-[#D9DDD6] px-3 py-2 text-sm" /><button disabled={saving} className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-40">{saving ? 'Đang lưu...' : 'Xác nhận'}</button></div></fieldset></form>}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-serif text-2xl font-bold">Inventory transactions</h2><p className="text-xs text-[#606863]">Lịch sử bất biến do backend tạo từ nhập kho, order và điều chỉnh tay.</p></div><select value={transactionType} onChange={(event) => { setTransactionPage(1); setTransactionType(event.target.value as InventoryTransactionType | ''); }} className="border border-[#D9DDD6] bg-white px-3 py-2 text-sm"><option value="">Tất cả loại</option>{transactionTypes.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</select></div>
        <QueryFeedback loading={history.loading} error={history.error} empty={!history.loading && !history.error && transactions.length === 0} onRetry={history.reload} />
        <div className="overflow-x-auto rounded-lg border border-[#E2E5DE] bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-[#F5F6F2] text-xs uppercase text-[#606863]"><tr><th className="px-4 py-3">Thời gian / Mã</th><th className="px-4 py-3">Variant</th><th className="px-4 py-3">Loại</th><th className="px-4 py-3 text-right">Delta</th><th className="px-4 py-3">Nguồn</th><th className="px-4 py-3">Lý do</th></tr></thead><tbody className="divide-y divide-[#E2E5DE]">{transactions.map((tx) => <tr key={tx.txn_id}><td className="px-4 py-3 font-mono">#{tx.txn_id}<p className="text-xs">{formatVietnamDateTime(tx.created_at)}</p></td><td className="px-4 py-3">#{tx.variant_id}</td><td className="px-4 py-3">{statusLabel(tx.transaction_type)}</td><td className="px-4 py-3 text-right font-bold">{tx.quantity_delta > 0 ? '+' : ''}{tx.quantity_delta}</td><td className="px-4 py-3 text-xs">{tx.order_id ? `Order #${tx.order_id}` : tx.goods_receipt_id ? `Receipt #${tx.goods_receipt_id}` : 'Manual'}</td><td className="max-w-sm px-4 py-3 text-xs">{tx.reason ?? '—'}</td></tr>)}</tbody></table></div>
        {transactionMeta && transactionMeta.total_pages > 1 && <div className="flex justify-center gap-3 text-sm"><button type="button" disabled={transactionPage <= 1} onClick={() => setTransactionPage((value) => value - 1)} className="border border-[#D9DDD6] bg-white px-4 py-2 disabled:opacity-40">Trang trước</button><span className="py-2">{transactionMeta.page} / {transactionMeta.total_pages}</span><button type="button" disabled={transactionPage >= transactionMeta.total_pages} onClick={() => setTransactionPage((value) => value + 1)} className="border border-[#D9DDD6] bg-white px-4 py-2 disabled:opacity-40">Trang sau</button></div>}
      </section>
    </div>
  );
};
