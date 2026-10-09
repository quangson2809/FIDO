import { useCallback, useEffect, useMemo, useState } from 'react';
import { catalogService } from '../../catalog/api/service';
import type { CatalogProductView, CategoryDto } from '../../catalog/types';
import { QueryFeedback } from '../../../shared/admin/QueryFeedback';
import { Pagination } from '../../../shared/admin/Pagination';
import { useRemoteQuery } from '../../../shared/hooks/useRemoteQuery';

interface PickerProps {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled: boolean;
}

const toggle = (ids: number[], id: number): number[] =>
  ids.includes(id) ? ids.filter((selected) => selected !== id) : [...ids, id];

const categoryLabel = (category: CategoryDto, categoriesById: Map<number, CategoryDto>): string => {
  const names = [category.name];
  const visited = new Set([category.category_id]);
  let parentId = category.parent_category_id;
  while (parentId !== null && !visited.has(parentId)) {
    const parent = categoriesById.get(parentId);
    if (!parent) break;
    names.unshift(parent.name);
    visited.add(parentId);
    parentId = parent.parent_category_id;
  }
  return names.join(' › ');
};

export function VoucherCategoryPicker({ selectedIds, onChange, disabled }: PickerProps) {
  const [search, setSearch] = useState('');
  const query = useRemoteQuery(useCallback(() => catalogService.getMeta(), []));
  const categories = query.data?.categories ?? [];
  const byId = new Map(categories.map((category) => [category.category_id, category]));
  const visible = categories
    .filter((category) => categoryLabel(category, byId).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    .sort((a, b) => categoryLabel(a, byId).localeCompare(categoryLabel(b, byId), 'vi'));
  const missing = selectedIds.filter((id) => !byId.has(id));

  return <div className="sm:col-span-2 space-y-3">
    <div>
      <p className="text-sm font-semibold">Chọn danh mục áp dụng</p>
      <p className="text-xs text-[#606863]">Có thể chọn nhiều danh mục. Danh mục con được áp dụng theo chính sách Voucher.</p>
    </div>
    <label className="block text-sm">Tìm danh mục
      <input className="field-input mt-1" value={search} onChange={(event) => setSearch(event.target.value)}
        placeholder="Tìm theo tên danh mục" disabled={disabled || query.loading || Boolean(query.error)} />
    </label>
    <QueryFeedback loading={query.loading} error={query.error} onRetry={query.reload}
      empty={!query.loading && !query.error && categories.length === 0} />
    {!query.loading && !query.error && <>
      <div className="max-h-60 space-y-2 overflow-y-auto rounded border border-[#D9DDD6] p-3">
        {visible.length === 0 && <p className="text-sm text-[#606863]">Không tìm thấy danh mục phù hợp.</p>}
        {visible.map((category) => <label key={category.category_id} className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={selectedIds.includes(category.category_id)}
            disabled={disabled} onChange={() => onChange(toggle(selectedIds, category.category_id))} />
          <span>{categoryLabel(category, byId)}</span>
        </label>)}
      </div>
      <p className="text-xs text-[#606863]">Đã chọn: {selectedIds.length} danh mục.</p>
      {missing.length > 0 && <p role="alert" className="text-sm text-red-700">
        {missing.length} danh mục đã chọn không còn trong dữ liệu Catalog. Vui lòng kiểm tra trước khi lưu.
      </p>}
    </>}
  </div>;
}

export function VoucherProductPicker({ selectedIds, onChange, disabled }: PickerProps) {
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [labels, setLabels] = useState<Record<number, string>>({});
  const [failedIds, setFailedIds] = useState<number[]>([]);
  const results = useRemoteQuery(useCallback(() =>
    catalogService.listProducts({ q: search || undefined, page, page_size: 20 }), [search, page]));
  const missingIds = useMemo(() => selectedIds.filter((id) =>
    !Object.hasOwn(labels, id) && !failedIds.includes(id)), [selectedIds, labels, failedIds]);

  // Resolve saved references through Catalog detail: stopped products need labels too.
  // Failed lookups are retried only by explicit user action, not in a request loop.
  useEffect(() => {
    if (missingIds.length === 0) return;
    let active = true;
    void Promise.allSettled(missingIds.map((id) => catalogService.getProductDetail(id))).then((found) => {
      if (!active) return;
      const names: Record<number, string> = {};
      const failures: number[] = [];
      found.forEach((result, index) => {
        const id = missingIds[index];
        if (result.status === 'fulfilled') names[id] = result.value.name;
        else failures.push(id);
      });
      if (Object.keys(names).length > 0) setLabels((current) => ({ ...current, ...names }));
      if (failures.length > 0) setFailedIds((current) => [...new Set([...current, ...failures])]);
    });
    return () => { active = false; };
  }, [missingIds]);

  const searchProducts = () => {
    setSearch(draft.trim());
    setPage(1);
    results.reload();
  };

  const selectProduct = (product: CatalogProductView) => {
    if (selectedIds.includes(product.product_id)) return;
    setLabels((current) => ({ ...current, [product.product_id]: product.name }));
    onChange([...selectedIds, product.product_id]);
  };

  return <div className="sm:col-span-2 space-y-3">
    <div>
      <p className="text-sm font-semibold">Chọn sản phẩm áp dụng</p>
      <p className="text-xs text-[#606863]">Tìm và chọn nhiều sản phẩm theo tên. Danh sách tìm kiếm gồm các sản phẩm đang bán.</p>
    </div>
    {selectedIds.length > 0 && <div className="flex flex-wrap gap-2" aria-label="Sản phẩm đã chọn">
      {selectedIds.map((id) => <span key={id} className="inline-flex items-center gap-2 rounded border border-[#D9DDD6] bg-[#F5F6F2] px-3 py-1.5 text-sm">
        {labels[id] ?? `Sản phẩm #${id} (chưa tải tên)`}
        {!disabled && <button type="button" className="font-semibold underline" aria-label={`Bỏ chọn sản phẩm ${labels[id] ?? id}`}
          onClick={() => onChange(selectedIds.filter((selected) => selected !== id))}>Bỏ</button>}
      </span>)}
    </div>}
    {missingIds.length > 0 && <p role="status" className="text-sm text-[#606863]">Đang tải tên sản phẩm đã chọn…</p>}
    {selectedIds.some((id) => failedIds.includes(id)) && <div role="alert" className="text-sm text-red-700">
      Không tải được tên một số sản phẩm đã chọn.
      <button type="button" className="ml-2 underline" onClick={() => setFailedIds([])}>Thử lại</button>
    </div>}
    <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-0 flex-1 text-sm">Tên sản phẩm
        <input className="field-input mt-1 w-full" value={draft} onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); searchProducts(); } }}
          placeholder="Tìm theo tên sản phẩm" disabled={disabled} />
      </label>
      <button type="button" className="admin-secondary" disabled={disabled} onClick={searchProducts}>Tìm sản phẩm</button>
    </div>
    <QueryFeedback loading={results.loading} error={results.error} onRetry={results.reload}
      empty={!results.loading && !results.error && results.data?.items.length === 0} filtered={Boolean(search)} />
    {!results.loading && !results.error && <div className="max-h-64 divide-y overflow-y-auto rounded border border-[#D9DDD6]">
      {results.data?.items.map((product) => {
        const selected = selectedIds.includes(product.product_id);
        return <div key={product.product_id} className="flex items-center justify-between gap-3 p-3 text-sm">
          <div className="min-w-0"><p className="font-semibold">{product.name}</p>
            <p className="text-xs text-[#606863]">{product.category}{product.brand ? ` · ${product.brand}` : ''}</p>
          </div>
          <button type="button" className="admin-secondary shrink-0" disabled={disabled || selected}
            onClick={() => selectProduct(product)}>{selected ? 'Đã chọn' : 'Chọn'}</button>
        </div>;
      })}
    </div>}
    <Pagination meta={results.data?.meta} loading={results.loading} onPage={setPage} />
    <p className="text-xs text-[#606863]">Đã chọn: {selectedIds.length} sản phẩm.</p>
  </div>;
}
