import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { catalogService } from '../api/service';
import { useRemoteQuery } from '../../../shared/hooks/useRemoteQuery';
import { getStorefrontErrorMessage } from '../../../services/http/storefrontError';
import type { CatalogProductQuery } from '../types';
import { catalogQueryParams, readCatalogQuery, type CatalogFilters, type CatalogFilterKey } from '../model/catalogQuery';

const toFilters = (query: CatalogProductQuery): CatalogFilters => ({ category_id: query.category_id, brand_id: query.brand_id, size_value_id: query.size_value_id, color_id: query.color_id, gender: query.gender, season: query.season, style: query.style });

export const useCatalogBrowse = () => {
  const [params, setParams] = useSearchParams();
  const metadata = useRemoteQuery(useCallback(() => catalogService.getMeta(), []));
  const meta = metadata.data;
  const query = readCatalogQuery(params, meta);
  const queryKey = catalogQueryParams(query).toString();
  const [draft, setDraft] = useState({ key: queryKey, filters: toFilters(query), min: String(query.min_price ?? ''), max: String(query.max_price ?? ''), search: query.q ?? '' });
  const [priceError, setPriceError] = useState<string | null>(null);
  if (draft.key !== queryKey) {
    setDraft({ key: queryKey, filters: toFilters(query), min: String(query.min_price ?? ''), max: String(query.max_price ?? ''), search: query.q ?? '' });
    setPriceError(null);
  }

  const results = useRemoteQuery(useCallback(() => catalogService.listProducts({ ...readCatalogQuery(new URLSearchParams(queryKey)), page_size: 12 }), [queryKey]));
  // Canonicalize malformed or unsupported URL parameters without creating a history entry.
  useEffect(() => { if (params.toString() !== queryKey) setParams(queryKey, { replace: true }); }, [params, queryKey, setParams]);
  const updateFilter = <K extends CatalogFilterKey>(key: K, value: CatalogFilters[K]) => setDraft(current => ({ ...current, filters: { ...current.filters, [key]: value } }));
  const applyFilters = (): boolean => {
    const validPrice = (value: string) => !value.trim() || /^\d+(?:\.\d{1,2})?$/.test(value.trim()) && Number(value) <= Number.MAX_SAFE_INTEGER;
    if (!validPrice(draft.min) || !validPrice(draft.max) || (draft.min.trim() && draft.max.trim() && Number(draft.min) > Number(draft.max))) {
      setPriceError('Nhập giá không âm; giá từ phải nhỏ hơn hoặc bằng giá đến.'); return false;
    }
    setPriceError(null);
    setParams(catalogQueryParams({ ...query, ...draft.filters, min_price: draft.min.trim() ? Number(draft.min) : undefined, max_price: draft.max.trim() ? Number(draft.max) : undefined, page: 1 }));
    return true;
  };
  return {
    products: results.data?.items ?? [], meta, pagination: results.data?.meta ?? null, loading: results.loading, metaLoading: metadata.loading,
    error: results.error ? getStorefrontErrorMessage(results.error, 'Không thể tải sản phẩm. Vui lòng thử lại.') : null,
    metaError: metadata.error ? getStorefrontErrorMessage(metadata.error, 'Không thể tải bộ lọc. Vui lòng thử lại.') : null, query, draft, priceError,
    activeFilterCount: Object.entries(query).filter(([key, value]) => key !== 'page' && value !== undefined && value !== '').length,
    totalPages: results.data?.meta.total_pages ?? 0,
    updateFilter, applyFilters,
    setSearchInput: (search: string) => setDraft(current => ({ ...current, search })),
    setMinPriceInput: (min: string) => setDraft(current => ({ ...current, min })),
    setMaxPriceInput: (max: string) => setDraft(current => ({ ...current, max })),
    submitSearch: () => setParams(catalogQueryParams({ ...query, q: draft.search.trim() || undefined, page: 1 })),
    clearFilters: () => { setPriceError(null); setParams({}); setDraft({ key: '', filters: {}, min: '', max: '', search: '' }); },
    removeFilter: (key: CatalogFilterKey | 'q') => setParams(catalogQueryParams({ ...query, [key]: undefined, page: 1 })),
    setPage: (page: number) => setParams(catalogQueryParams({ ...query, page })),
    reload: results.reload,
    reloadMetadata: metadata.reload,
  };
};
