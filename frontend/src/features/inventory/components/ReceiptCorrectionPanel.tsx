import { useCallback, useRef, useState, type FormEvent } from 'react';
import type { GoodsReceiptDetailDto } from '../types';
import { operationsService } from '../api/operationsService';
import { useRemoteQuery } from '../../../shared/hooks/useRemoteQuery';
import { QueryFeedback } from '../../../shared/admin/QueryFeedback';
import { getApiErrorMessage } from '../../../services/http/apiError';
import { formatVietnamDateTime } from '../../../shared/time/formatVietnamDateTime';
export function ReceiptCorrectionPanel({ receipt, canWrite, onChanged }: { receipt: GoodsReceiptDetailDto; canWrite: boolean; onChanged: () => void }) {
  const query = useRemoteQuery(useCallback(() => operationsService.corrections(receipt.receipt_id), [receipt.receipt_id]));
  const [draft, setDraft] = useState<Record<number, { quantity: string; cost: string }>>({});
  const [reason, setReason] = useState(''); const [source, setSource] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false); const pending = useRef(false); const [error, setError] = useState<string | null>(null);
  const currentItems = receipt.items.map(item => { const corrections = (query.data ?? []).flatMap(c => c.items).filter(line => line.receipt_item_id === item.receipt_item_id); const last = corrections.at(-1); return { ...item, quantity_received: last?.corrected_quantity ?? item.quantity_received, unit_cost: last?.corrected_unit_cost ?? item.unit_cost }; });
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (pending.current || !query.data || !canWrite) return;
    const items = currentItems.map(item => ({ receipt_item_id: item.receipt_item_id, corrected_quantity: Number(draft[item.receipt_item_id]?.quantity ?? item.quantity_received), corrected_unit_cost: Number(draft[item.receipt_item_id]?.cost ?? item.unit_cost) }));
    if (items.some(i => !Number.isSafeInteger(i.corrected_quantity) || i.corrected_quantity < 0 || !Number.isSafeInteger(i.corrected_unit_cost) || i.corrected_unit_cost < 0)) { setError('Số lượng và giá vốn phải là số nguyên không âm.'); return; }
    pending.current = true; setBusy(true); setError(null);
    try { await operationsService.correct(receipt.receipt_id, { source_operation_id: source, expected_correction_id: query.data.at(-1)?.id ?? null, reason: reason.trim(), items }); setSource(crypto.randomUUID()); setDraft({}); setReason(''); query.reload(); onChanged(); }
    catch (cause: unknown) { setError(getApiErrorMessage(cause, 'Không thể sửa sai phiếu. Hãy tải lại nếu đã có điều chỉnh mới.')); }
    finally { pending.current = false; setBusy(false); }
  };
  return <section className="mt-5 space-y-4 border p-4" aria-label="Sửa sai phiếu nhập đã xác nhận"><h2 className="font-serif text-xl">Sửa sai phiếu đã xác nhận</h2>
    <p className="text-sm">Chứng từ gốc giữ nguyên. Chỉ chênh lệch được ghi bằng chứng từ mới; sửa số lượng về 0 để đảo một dòng nhập sai. Sản phẩm thiếu nhập bằng phiếu mới.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}<QueryFeedback loading={query.loading} error={query.error} onRetry={query.reload} />
    {canWrite && <form onSubmit={save}><fieldset disabled={busy || query.loading || !query.data} className="space-y-3">
      {currentItems.map(item => <div key={item.receipt_item_id} className="grid gap-3 sm:grid-cols-2"><p className="sm:col-span-2">Sản phẩm #{item.product_id} · hiện ghi nhận {item.quantity_received} × {item.unit_cost.toLocaleString('vi-VN')}₫</p>
        <label>Số lượng đúng dòng #{item.receipt_item_id}<input className="field-input" type="number" min="0" max="2147483647" step="1" required value={draft[item.receipt_item_id]?.quantity ?? item.quantity_received} onChange={e => setDraft(current => ({ ...current, [item.receipt_item_id]: { quantity: e.target.value, cost: current[item.receipt_item_id]?.cost ?? String(item.unit_cost) } }))} /></label>
        <label>Giá vốn đúng dòng #{item.receipt_item_id}<input className="field-input" type="number" min="0" step="1" required value={draft[item.receipt_item_id]?.cost ?? item.unit_cost} onChange={e => setDraft(current => ({ ...current, [item.receipt_item_id]: { cost: e.target.value, quantity: current[item.receipt_item_id]?.quantity ?? String(item.quantity_received) } }))} /></label>
      </div>)}
      <label>Lý do sửa sai<textarea className="field-input" required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label><button className="admin-primary" type="submit">Ghi chứng từ điều chỉnh</button>
    </fieldset></form>}
    {(query.data ?? []).map(correction => <article key={correction.id} className="border p-3"><h3>Điều chỉnh #{correction.id} · {formatVietnamDateTime(correction.created_at)} · Người ghi #{correction.created_by}</h3><p>{correction.reason}</p>{correction.items.map(line => <p key={line.receipt_item_id}>Dòng #{line.receipt_item_id}: {line.before_quantity} × {line.before_unit_cost.toLocaleString('vi-VN')}₫ → {line.corrected_quantity} × {line.corrected_unit_cost.toLocaleString('vi-VN')}₫; chênh lệch kho {line.quantity_delta}, giá trị {line.value_delta.toLocaleString('vi-VN')}₫</p>)}</article>)}
  </section>;
}
