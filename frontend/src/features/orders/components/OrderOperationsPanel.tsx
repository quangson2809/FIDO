import { useCallback, useRef, useState, type FormEvent } from 'react';
import { apiClient } from '../../../services/http/apiClient';
import type { ApiResponse } from '../../../types/api';
import type { AdminOrderDetailDto } from '../types';
import { useRemoteQuery } from '../../../shared/hooks/useRemoteQuery';
import { QueryFeedback } from '../../../shared/admin/QueryFeedback';
import { getApiErrorMessage } from '../../../services/http/apiError';
import { formatVietnamDateTime } from '../../../shared/time/formatVietnamDateTime';
interface ReturnLine { order_item_id: number; received_quantity: number; sellable_quantity: number; condition_code: string; disposition: string }
interface ReturnReceipt { id: number; received_by: number; reason: string; created_at: string; items: ReturnLine[] }
interface Operation { id: number; actor_account_id: number | null; action: string; created_at: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null }
export function OrderOperationsPanel({ order, canReceive }: { order: AdminOrderDetailDto; canReceive: boolean }) {
  const receipts = useRemoteQuery(useCallback(async () => (await apiClient.get<ApiResponse<ReturnReceipt[]>>(`/admin/orders/${order.order_id}/return-receipts`)).data, [order.order_id]));
  const history = useRemoteQuery(useCallback(async () => (await apiClient.get<ApiResponse<Operation[]>>(`/admin/orders/${order.order_id}/history`)).data, [order.order_id]));
  const [draft, setDraft] = useState<Record<number, { received: string; sellable: string }>>({});
  const [reason, setReason] = useState(''); const [source, setSource] = useState(() => crypto.randomUUID()); const [busy, setBusy] = useState(false); const pending = useRef(false); const [error, setError] = useState<string | null>(null);
  const receive = async (event: FormEvent) => {
    event.preventDefault(); if (pending.current || !canReceive || !receipts.data) return;
    const items = order.items.filter(item => draft[item.order_item_id]?.received && Number(draft[item.order_item_id].received) > 0).map(item => ({ order_item_id: item.order_item_id, received_quantity: Number(draft[item.order_item_id].received), sellable_quantity: Number(draft[item.order_item_id].sellable || 0) }));
    if (!items.length || items.some(line => !Number.isSafeInteger(line.received_quantity) || !Number.isSafeInteger(line.sellable_quantity) || line.sellable_quantity < 0 || line.sellable_quantity > line.received_quantity)) { setError('Nhập số thực nhận và số đủ điều kiện bán lại hợp lệ.'); return; }
    pending.current = true; setBusy(true); setError(null);
    try { await apiClient.post(`/admin/orders/${order.order_id}/return-receipts`, { source_operation_id: source, reason: reason.trim(), items }); setSource(crypto.randomUUID()); setDraft({}); setReason(''); receipts.reload(); history.reload(); }
    catch (cause: unknown) { setError(getApiErrorMessage(cause, 'Không thể tiếp nhận. Kiểm tra đơn nguồn, lượng đã nhận và hàng thực tế.')); }
    finally { pending.current = false; setBusy(false); }
  };
  return <section className="space-y-5" aria-label="Tiếp nhận hàng quay về và lịch sử xử lý">
    <div className="space-y-3 border bg-white p-5"><h2 className="font-serif text-2xl">Tiếp nhận hàng quay về</h2><p className="text-sm">Hủy giao dịch hoặc hoàn tiền không chứng minh hàng đã về. Chỉ nhập số hàng thực nhận sau kiểm tra; phần không bán được sẽ cách ly và không cộng tồn bán được.</p>
      <QueryFeedback loading={receipts.loading} error={receipts.error} onRetry={receipts.reload} />{error && <p role="alert" className="text-red-700">{error}</p>}
      {canReceive && ['CANCELLED', 'RETURNED'].includes(order.order_status) && <form onSubmit={receive}><fieldset disabled={busy || receipts.loading || !receipts.data} className="space-y-3">
        {order.items.map(item => { const received = (receipts.data ?? []).flatMap(r => r.items).filter(l => l.order_item_id === item.order_item_id).reduce((sum, l) => sum + l.received_quantity, 0); return <div key={item.order_item_id} className="grid gap-3 border p-3 sm:grid-cols-2"><p className="sm:col-span-2">{item.product_name} · đã nhận {received}/{item.quantity}. Hệ thống kiểm tra cả bút toán đã hoàn trước đây.</p>
          <label>Thực nhận · {item.sku}<input className="field-input" type="number" min="0" max={item.quantity - received} step="1" value={draft[item.order_item_id]?.received ?? ''} onChange={e => setDraft(current => ({ ...current, [item.order_item_id]: { received: e.target.value, sellable: current[item.order_item_id]?.sellable ?? '0' } }))} /></label>
          <label>Đủ điều kiện bán lại · {item.sku}<input className="field-input" type="number" min="0" max={Number(draft[item.order_item_id]?.received || 0)} step="1" value={draft[item.order_item_id]?.sellable ?? '0'} onChange={e => setDraft(current => ({ ...current, [item.order_item_id]: { sellable: e.target.value, received: current[item.order_item_id]?.received ?? '' } }))} /></label>
        </div>; })}
        <label>Kết quả kiểm tra / lý do tiếp nhận<textarea className="field-input" maxLength={500} required value={reason} onChange={e => setReason(e.target.value)} /></label><button type="submit" className="admin-primary">Xác nhận hàng thực nhận</button>
      </fieldset></form>}
      {(receipts.data ?? []).map(receipt => <article key={receipt.id} className="border p-3"><h3>Biên nhận #{receipt.id} · {formatVietnamDateTime(receipt.created_at)} · Người nhận #{receipt.received_by}</h3><p>{receipt.reason}</p>{receipt.items.map(line => <p key={line.order_item_id}>Dòng #{line.order_item_id}: nhận {line.received_quantity}, bán lại {line.sellable_quantity}, cách ly {line.received_quantity - line.sellable_quantity}</p>)}</article>)}
    </div>
    <div className="space-y-3 border bg-white p-5"><h2 className="font-serif text-2xl">Lịch sử xử lý đơn</h2><QueryFeedback loading={history.loading} error={history.error} onRetry={history.reload} />
      {(history.data ?? []).map(event => <article key={event.id} className="border-b py-3"><h3>{event.action} · {formatVietnamDateTime(event.created_at)} · {event.actor_account_id == null ? 'Hệ thống' : `Người thực hiện #${event.actor_account_id}`}</h3>{typeof event.after?.reason === 'string' && <p>{event.after.reason}</p>}<p>{String(event.before?.status ?? '')} → {String(event.after?.status ?? '')}</p></article>)}
    </div>
  </section>;
}
