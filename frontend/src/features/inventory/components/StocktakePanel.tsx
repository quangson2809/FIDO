import { useCallback, useRef, useState, type FormEvent } from 'react';
import { useRemoteQuery } from '../../../shared/hooks/useRemoteQuery';
import { QueryFeedback } from '../../../shared/admin/QueryFeedback';
import { formatVietnamDateTime } from '../../../shared/time/formatVietnamDateTime';
import { getApiErrorMessage } from '../../../services/http/apiError';
import { operationsService } from '../api/operationsService';
import type { InventoryRowDto } from '../types';
export function StocktakePanel({ rows, canWrite, onChanged }: { rows: InventoryRowDto[]; canWrite: boolean; onChanged: () => void }) {
  const query = useRemoteQuery(useCallback(() => operationsService.counts(), []));
  const [counted, setCounted] = useState<Record<number, { value: string; version: number; sku: string }>>({}); const [reason, setReason] = useState('');
  const [source, setSource] = useState(() => crypto.randomUUID()); const [busy, setBusy] = useState(false); const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (pending.current || !canWrite) return;
    const items = Object.entries(counted).map(([id, line]) => ({ product_id: Number(id), expected_version: line.version, counted_quantity: Number(line.value) }));
    if (!items.length || !reason.trim() || items.some(line => !Number.isSafeInteger(line.counted_quantity) || line.counted_quantity < 0)) { setError('Nhập số đếm nguyên không âm và lý do cho ít nhất một sản phẩm.'); return; }
    pending.current = true; setBusy(true); setError(null);
    try { await operationsService.createCount({ source_operation_id: source, reason: reason.trim(), items }); setSource(crypto.randomUUID()); setCounted({}); setReason(''); query.reload(); }
    catch (cause: unknown) { setError(getApiErrorMessage(cause, 'Không thể lưu kiểm kê. Nếu tồn kho vừa thay đổi, tải lại và đếm lại.')); }
    finally { pending.current = false; setBusy(false); }
  };
  const act = async (id: number, action: 'CONFIRM' | 'CANCEL') => {
    if (pending.current) return;
    if (!window.confirm(action === 'CONFIRM' ? 'Xác nhận số đếm thực tế? Chênh lệch sẽ ghi vào tồn kho và sổ kho.' : 'Hủy bản kiểm kê này?')) return;
    pending.current = true; setBusy(true); setError(null);
    try { await operationsService.countAction(id, action); query.reload(); onChanged(); }
    catch (cause: unknown) { setError(getApiErrorMessage(cause, 'Không thể xác nhận. Kiểm kê phải được thực hiện lại nếu có biến động tồn.')); }
    finally { pending.current = false; setBusy(false); }
  };
  return <section className="space-y-4 border bg-white p-5" aria-label="Kiểm kê hàng thực tế">
    <h2 className="font-serif text-2xl">Kiểm kê hàng thực tế</h2><p className="text-sm">Nhập số đã đếm ở kho, không sao chép số hệ thống. Lưu bản nháp trước, rồi đối chiếu và xác nhận. Mọi biến động sau lúc đếm sẽ chặn xác nhận.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <QueryFeedback loading={query.loading} error={query.error} onRetry={query.reload} />
    {canWrite && <form onSubmit={save}><fieldset disabled={busy} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">{rows.map(row => <label key={row.product_id}>{row.sku} · hệ thống: {row.available_quantity}<input className="field-input" aria-label={'Số đếm ' + row.sku} type="number" min="0" max="2147483647" step="1" value={counted[row.product_id]?.value ?? ''} placeholder="Chưa đếm" onChange={e => {
        const value = e.target.value;
        setCounted(current => {
          const next = { ...current };
          if (value === '') delete next[row.product_id];
          else next[row.product_id] = { value, version: current[row.product_id]?.version ?? row.version, sku: row.sku };
          return next;
        });
      }} /></label>)}</div>
      {Object.keys(counted).length > 0 && <div className="space-y-2 text-sm"><p>Số đếm sẽ lưu (gồm các trang đã chọn):</p>{Object.entries(counted).map(([id, line]) => <p key={id}>{line.sku}: {line.value} <button type="button" className="underline" aria-label={'Bỏ số đếm ' + line.sku} onClick={() => setCounted(current => { const next = { ...current }; delete next[Number(id)]; return next; })}>Bỏ số đếm</button></p>)}</div>}
      <label>Nguyên nhân / ghi chú kiểm kê<textarea className="field-input" required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>
      <button type="submit" className="admin-primary">Lưu số đếm, chưa điều chỉnh kho</button>
    </fieldset></form>}
    {(query.data ?? []).map(count => <article key={count.id} className="space-y-2 border p-3">
      <h3>Kiểm kê #{count.id} · {count.status}</h3><p>{count.reason} · Người đếm #{count.created_by} · {formatVietnamDateTime(count.created_at)}</p>
      {count.items.map(line => <p key={line.product_id}>Sản phẩm #{line.product_id}: hệ thống {line.expected_quantity}, đếm {line.counted_quantity}, chênh lệch {line.difference > 0 ? '+' : ''}{line.difference}</p>)}
      {count.confirmed_by != null && <p>Xác nhận bởi #{count.confirmed_by} · {formatVietnamDateTime(count.confirmed_at)}</p>}
      {canWrite && count.status === 'DRAFT' && <div className="flex flex-wrap gap-3"><button type="button" className="admin-primary" disabled={busy} onClick={() => void act(count.id, 'CONFIRM')}>Xác nhận kiểm kê #{count.id}</button><button type="button" className="admin-secondary" disabled={busy} onClick={() => void act(count.id, 'CANCEL')}>Hủy kiểm kê #{count.id}</button></div>}
    </article>)}
  </section>;
}
