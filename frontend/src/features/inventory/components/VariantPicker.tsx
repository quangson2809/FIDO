import { useCallback, useState } from 'react';
import { inventoryAdminService } from '../api/adminService';
import type { InventoryRowDto } from '../types';
import { useRemoteQuery } from '../../../shared/hooks/useRemoteQuery';
import { Modal } from '../../../shared/admin/Modal';
import { QueryFeedback } from '../../../shared/admin/QueryFeedback';
import { Pagination } from '../../../shared/admin/Pagination';

export function ProductPicker({
  excludedIds,
  onSelect,
  onClose,
}: {
  excludedIds: readonly number[];
  onSelect: (product: InventoryRowDto) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [sku, setSku] = useState('');
  const [page, setPage] = useState(1);
  const query = useRemoteQuery(
    useCallback(
      () => inventoryAdminService.listInventory({ sku: sku || undefined, page, page_size: 20 }),
      [sku, page],
    ),
  );
  const products = (query.data?.data ?? []).filter(
    (row, index, rows) => rows.findIndex((candidate) => candidate.product_id === row.product_id) === index,
  );

  return (
    <Modal title="Chọn Product" onClose={onClose}>
      <form
        className="admin-filter"
        onSubmit={(event) => {
          event.preventDefault();
          setSku(draft.trim());
          setPage(1);
          query.reload();
        }}
      >
        <label>
          SKU
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Để trống để duyệt tất cả"
          />
        </label>
        <button type="submit" className="admin-primary">Tìm Product</button>
      </form>
      <QueryFeedback
        loading={query.loading}
        error={query.error}
        empty={products.length === 0}
        filtered={Boolean(sku)}
        onRetry={query.reload}
      />
      <div className="space-y-2">
        {products.map((row) => (
          <button
            type="button"
            key={row.product_id}
            disabled={excludedIds.includes(row.product_id)}
            onClick={() => onSelect(row)}
            className="admin-variant-option"
          >
            <span>
              <strong>{row.product_name ?? row.sku}</strong>
              <span className="block">Product #{row.product_id} · {row.sku}</span>
            </span>
            <span>
              {excludedIds.includes(row.product_id)
                ? 'Đã chọn'
                : `Tồn: ${row.available_quantity}`}
            </span>
          </button>
        ))}
      </div>
      <Pagination meta={query.data?.meta} loading={query.loading} onPage={setPage} />
    </Modal>
  );
}

export function ReceiptProductLabel({ productId }: { productId: number }) {
  const query = useRemoteQuery(
    useCallback(
      () => inventoryAdminService.listInventory({ product_id: productId, page_size: 1 }),
      [productId],
    ),
  );
  const row = query.data?.data[0];
  return (
    <div className="text-sm">
      <strong>{row?.product_name ?? `Product #${productId}`}</strong>
      {row && <p className="text-xs text-[#606863]">SKU: {row.sku} · Kho #{row.warehouse_id}</p>}
      <QueryFeedback loading={query.loading} error={query.error} onRetry={query.reload} />
    </div>
  );
}
