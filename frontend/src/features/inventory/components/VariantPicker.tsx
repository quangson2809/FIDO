import { useCallback, useState } from 'react';
import { inventoryAdminService } from '../api/adminService';
import type { InventoryRowDto } from '../types';
import { useRemoteQuery } from '../../../shared/hooks/useRemoteQuery';
import { Modal } from '../../../shared/admin/Modal';
import { QueryFeedback } from '../../../shared/admin/QueryFeedback';
import { Pagination } from '../../../shared/admin/Pagination';

export function VariantPicker({ excludedIds, onSelect, onClose }: { excludedIds: readonly number[]; onSelect: (variant: InventoryRowDto) => void; onClose: () => void }) {
  const [draft, setDraft] = useState('');
  const [sku, setSku] = useState('');
  const [page, setPage] = useState(1);
  const query = useRemoteQuery(useCallback(() => inventoryAdminService.listInventory({ sku: sku || undefined, page, page_size: 20 }), [sku, page]));
  return <Modal title="Chọn sản phẩm / biến thể" onClose={onClose}>
    <form className="admin-filter" onSubmit={(event) => { event.preventDefault(); setSku(draft.trim()); setPage(1); query.reload(); }}>
      <label>SKU chính xác<input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Để trống để duyệt tất cả" /></label><button type="submit" className="admin-primary">Tìm biến thể</button>
    </form>
    <QueryFeedback loading={query.loading} error={query.error} empty={query.data?.data.length === 0} filtered={Boolean(sku)} onRetry={query.reload} />
    <div className="space-y-2">{query.data?.data.map((row) => <button type="button" key={row.variant_id} disabled={excludedIds.includes(row.variant_id)} onClick={() => onSelect(row)} className="admin-variant-option"><span><strong>{row.product_name}</strong><span className="block">{row.sku ?? `Biến thể #${row.variant_id}`} · {row.size} / {row.color}</span></span><span>{excludedIds.includes(row.variant_id) ? 'Đã chọn' : `Tồn: ${row.available_quantity}`}</span></button>)}</div>
    <Pagination meta={query.data?.meta} loading={query.loading} onPage={setPage} />
  </Modal>;
}

export function ReceiptVariantLabel({ variantId }: { variantId: number }) {
  const query = useRemoteQuery(useCallback(() => inventoryAdminService.listInventory({ variant_id: variantId, page_size: 1 }), [variantId]));
  const row = query.data?.data[0];
  return <div className="text-sm"><strong>{row?.product_name ?? `Biến thể #${variantId}`}</strong>{row && <p className="text-xs text-[#606863]">{row.sku ?? 'Chưa có SKU'} · {row.size} / {row.color}</p>}<QueryFeedback loading={query.loading} error={query.error} onRetry={query.reload} /></div>;
}
