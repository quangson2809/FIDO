import React, { useEffect, useState } from 'react';
import { inventoryAdminService } from '../../features/inventory/api/adminService';
import type {
  InventoryRowDto,
  InventoryTransactionDto,
  InventoryTransactionType,
} from '../../features/inventory/types';
import type { PaginationMeta } from '../../types/api';

const transactionTypes: InventoryTransactionType[] = [
  'RECEIPT_IN',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'ORDER_CONFIRM_OUT',
  'ORDER_CANCEL_IN',
  'DELIVERY_RETURN_IN',
];

export const AdminInventoryView: React.FC<{ showToast: (msg: string) => void }> = ({ showToast }) => {
  const [skuInput, setSkuInput] = useState('');
  const [sku, setSku] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<InventoryRowDto[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<InventoryRowDto | null>(null);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [transactionType, setTransactionType] = useState<InventoryTransactionType | ''>('');
  const [transactions, setTransactions] = useState<InventoryTransactionDto[]>([]);
  const [transactionMeta, setTransactionMeta] = useState<PaginationMeta | null>(null);
  const [transactionPage, setTransactionPage] = useState(1);

  const refreshInventory = async () => {
    const response = await inventoryAdminService.listInventory({
      ...(sku ? { sku } : {}),
      page,
      page_size: 20,
    });
    setRows(response.data);
    setMeta(response.meta);
  };

  useEffect(() => {
    let active = true;
    void inventoryAdminService.listInventory({
      ...(sku ? { sku } : {}),
      page,
      page_size: 20,
    }).then((response) => {
      if (!active) return;
      setRows(response.data);
      setMeta(response.meta);
      setError(null);
    }).catch(() => {
      if (active) setError('Không thể tải tồn kho hoặc tài khoản thiếu INVENTORY_READ.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [page, sku]);

  useEffect(() => {
    let active = true;
    void inventoryAdminService.listTransactions({
      ...(transactionType ? { transaction_type: transactionType } : {}),
      page: transactionPage,
      page_size: 20,
    }).then((response) => {
      if (!active) return;
      setTransactions(response.data);
      setTransactionMeta(response.meta);
    }).catch(() => {
      if (active) setError('Không thể tải lịch sử giao dịch kho.');
    });
    return () => { active = false; };
  }, [transactionPage, transactionType]);

  const applySearch = (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setPage(1);
    setSku(skuInput.trim());
  };

  const changePage = (nextPage: number) => {
    setLoading(true);
    setPage(nextPage);
  };

  const adjust = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || saving) return;
    const parsedDelta = Number(delta);
    if (!Number.isInteger(parsedDelta) || parsedDelta === 0 || !reason.trim()) {
      setError('Điều chỉnh kho cần quantity_delta là số nguyên khác 0 và lý do không rỗng.');
      return;
    }
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
      const tx = await inventoryAdminService.listTransactions({
        ...(transactionType ? { transaction_type: transactionType } : {}),
        page: 1,
        page_size: 20,
      });
      setTransactions(tx.data);
      setTransactionMeta(tx.meta);
      showToast('Đã điều chỉnh tồn kho qua backend.');
    } catch {
      setError('Không thể điều chỉnh tồn kho. Backend có thể từ chối do quyền, variant hoặc số lượng khả dụng.');
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

      {error && <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <form onSubmit={applySearch} className="flex flex-wrap gap-3 rounded-lg border border-[#E2E5DE] bg-white p-4">
        <input value={skuInput} onChange={(event) => setSkuInput(event.target.value)} placeholder="Lọc theo SKU" className="min-w-64 flex-1 border border-[#D9DDD6] px-3 py-2 text-sm" />
        <button className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white">Tìm</button>
      </form>

      <section className="overflow-x-auto rounded-lg border border-[#E2E5DE] bg-white">
        {loading ? <div className="p-10 text-center text-sm text-[#606863]">Đang tải tồn kho...</div> : rows.length === 0 ? <div className="p-10 text-center text-sm">Không có biến thể phù hợp.</div> : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#F5F6F2] text-xs uppercase text-[#606863]"><tr><th className="px-4 py-3">Variant / SKU</th><th className="px-4 py-3">Sản phẩm</th><th className="px-4 py-3">Quy cách</th><th className="px-4 py-3">Sale status</th><th className="px-4 py-3 text-right">Khả dụng</th><th className="px-4 py-3" /></tr></thead>
            <tbody className="divide-y divide-[#E2E5DE]">
              {rows.map((row) => <tr key={row.variant_id}><td className="px-4 py-3"><strong className="font-mono">#{row.variant_id}</strong><p className="text-xs text-[#606863]">{row.sku ?? 'Không có SKU'}</p></td><td className="px-4 py-3"><strong>{row.product_name}</strong><p className="text-xs text-[#606863]">Product #{row.product_id}</p></td><td className="px-4 py-3">{row.size} · {row.color}</td><td className="px-4 py-3">{row.sale_status}</td><td className="px-4 py-3 text-right text-lg font-bold">{row.available_quantity}</td><td className="px-4 py-3 text-right"><button type="button" onClick={() => { setSelected(row); setDelta(''); setReason(''); }} className="border border-[#0B2419] px-3 py-2 text-xs font-bold uppercase">Điều chỉnh</button></td></tr>)}
            </tbody>
          </table>
        )}
      </section>

      {meta && meta.total_pages > 1 && <div className="flex justify-center gap-3 text-sm"><button type="button" disabled={page <= 1 || loading} onClick={() => changePage(page - 1)} className="border border-[#D9DDD6] bg-white px-4 py-2 disabled:opacity-40">Trang trước</button><span className="py-2">{meta.page} / {meta.total_pages}</span><button type="button" disabled={page >= meta.total_pages || loading} onClick={() => changePage(page + 1)} className="border border-[#D9DDD6] bg-white px-4 py-2 disabled:opacity-40">Trang sau</button></div>}

      {selected && <form onSubmit={adjust} className="rounded-lg border border-[#E2E5DE] bg-white p-5"><h2 className="font-serif text-xl font-bold">Điều chỉnh Variant #{selected.variant_id}</h2><p className="mt-1 text-xs text-[#606863]">Hiện khả dụng: {selected.available_quantity}. Delta dương tăng kho, delta âm giảm kho; backend kiểm tra invariant.</p><div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr_auto]"><input type="number" step="1" required value={delta} onChange={(event) => setDelta(event.target.value)} placeholder="quantity_delta" className="border border-[#D9DDD6] px-3 py-2 text-sm" /><input required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Lý do điều chỉnh" className="border border-[#D9DDD6] px-3 py-2 text-sm" /><button disabled={saving} className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-40">{saving ? 'Đang lưu...' : 'Xác nhận'}</button></div></form>}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-serif text-2xl font-bold">Inventory transactions</h2><p className="text-xs text-[#606863]">Lịch sử bất biến do backend tạo từ nhập kho, order và điều chỉnh tay.</p></div><select value={transactionType} onChange={(event) => { setTransactionPage(1); setTransactionType(event.target.value as InventoryTransactionType | ''); }} className="border border-[#D9DDD6] bg-white px-3 py-2 text-sm"><option value="">Tất cả loại</option>{transactionTypes.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="overflow-x-auto rounded-lg border border-[#E2E5DE] bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-[#F5F6F2] text-xs uppercase text-[#606863]"><tr><th className="px-4 py-3">Txn</th><th className="px-4 py-3">Variant</th><th className="px-4 py-3">Loại</th><th className="px-4 py-3 text-right">Delta</th><th className="px-4 py-3">Nguồn</th><th className="px-4 py-3">Lý do</th></tr></thead><tbody className="divide-y divide-[#E2E5DE]">{transactions.map((tx) => <tr key={tx.txn_id}><td className="px-4 py-3 font-mono">#{tx.txn_id}</td><td className="px-4 py-3">#{tx.variant_id}</td><td className="px-4 py-3">{tx.transaction_type}</td><td className="px-4 py-3 text-right font-bold">{tx.quantity_delta > 0 ? '+' : ''}{tx.quantity_delta}</td><td className="px-4 py-3 text-xs">{tx.order_id ? `Order #${tx.order_id}` : tx.goods_receipt_id ? `Receipt #${tx.goods_receipt_id}` : 'Manual'}</td><td className="max-w-sm px-4 py-3 text-xs">{tx.reason ?? '—'}</td></tr>)}</tbody></table></div>
        {transactionMeta && transactionMeta.total_pages > 1 && <div className="flex justify-center gap-3 text-sm"><button type="button" disabled={transactionPage <= 1} onClick={() => setTransactionPage((value) => value - 1)} className="border border-[#D9DDD6] bg-white px-4 py-2 disabled:opacity-40">Trang trước</button><span className="py-2">{transactionMeta.page} / {transactionMeta.total_pages}</span><button type="button" disabled={transactionPage >= transactionMeta.total_pages} onClick={() => setTransactionPage((value) => value + 1)} className="border border-[#D9DDD6] bg-white px-4 py-2 disabled:opacity-40">Trang sau</button></div>}
      </section>
    </div>
  );
};
