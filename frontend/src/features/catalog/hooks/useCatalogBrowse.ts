import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { catalogService } from '../api/service';
import { useRemoteQuery } from '../../../shared/hooks/useRemoteQuery';
import { getStorefrontErrorMessage } from '../../../services/http/storefrontError';
import type { CatalogMetaDto, CatalogProductQuery } from '../types';
import {
  catalogQueryParams,
  catalogUrlParams,
  readCatalogQuery,
  type CatalogFilters,
  type CatalogFilterKey,
} from '../model/catalogQuery';

const toFilters = (query: CatalogProductQuery): CatalogFilters => ({
  category_id: query.category_id,
  brand_id: query.brand_id,
  min_price: query.min_price,
  max_price: query.max_price,
});

export const useCatalogBrowse = (meta: CatalogMetaDto | null, categoryId?: number) => {
  const [params, setParams] = useSearchParams();
  const query = readCatalogQuery(params, meta, categoryId);
  const queryKey = catalogQueryParams(query).toString();
  // A category route owns its category; URL filters may narrow it but never replace it.
  const urlKey = catalogUrlParams(query, categoryId).toString();
  const [draft, setDraft] = useState({
    key: queryKey,
    filters: toFilters(query),
    min: String(query.min_price ?? ''),
    max: String(query.max_price ?? ''),
    search: query.q ?? '',
  });
  const [priceError, setPriceError] = useState<string | null>(null);
  if (draft.key !== queryKey) {
    setDraft({
      key: queryKey,
      filters: toFilters(query),
      min: String(query.min_price ?? ''),
      max: String(query.max_price ?? ''),
      search: query.q ?? '',
    });
    setPriceError(null);
  }

  const results = useRemoteQuery(
    useCallback(
      () =>
        catalogService.listProducts({
          ...readCatalogQuery(new URLSearchParams(queryKey)),
          page_size: 12,
        }),
      [queryKey],
    ),
  );
  // Canonicalize malformed or unsupported URL parameters without creating a history entry.
  useEffect(() => {
    if (params.toString() !== urlKey) setParams(urlKey, { replace: true });
  }, [params, urlKey, setParams]);
  const updateFilter = <K extends CatalogFilterKey>(key: K, value: CatalogFilters[K]) =>
    setDraft((current) => ({ ...current, filters: { ...current.filters, [key]: value } }));
  const applyFilters = (): boolean => {
    const validPrice = (value: string) =>
      !value.trim() ||
      (/^\d+(?:\.\d{1,2})?$/.test(value.trim()) && Number(value) <= Number.MAX_SAFE_INTEGER);
    if (
      !validPrice(draft.min) ||
      !validPrice(draft.max) ||
      (draft.min.trim() && draft.max.trim() && Number(draft.min) > Number(draft.max))
    ) {
      setPriceError('Nhập giá không âm; giá từ phải nhỏ hơn hoặc bằng giá đến.');
      return false;
    }
    setPriceError(null);
    setParams(
      catalogUrlParams(
        {
          ...query,
          ...draft.filters,
          min_price: draft.min.trim() ? Number(draft.min) : undefined,
          max_price: draft.max.trim() ? Number(draft.max) : undefined,
          page: 1,
        },
        categoryId,
      ),
    );
    return true;
  };
  return {
    products: results.data?.items ?? [],
    meta,
    pagination: results.data?.meta ?? null,
    loading: results.loading,
    error: results.error
      ? getStorefrontErrorMessage(results.error, 'Không thể tải sản phẩm. Vui lòng thử lại.')
      : null,
    query,
    draft,
    priceError,
    activeFilterCount: Object.entries(query).filter(
      ([key, value]) =>
        key !== 'page' &&
        !(categoryId !== undefined && key === 'category_id') &&
        value !== undefined &&
        value !== '',
    ).length,
    hasDraftChanges:
      Object.entries(draft.filters).some(
        ([key, value]) => value !== query[key as CatalogFilterKey],
      ) ||
      draft.min.trim() !== String(query.min_price ?? '') ||
      draft.max.trim() !== String(query.max_price ?? ''),
    totalPages: results.data?.meta.total_pages ?? 0,
    updateFilter,
    applyFilters,
    setSearchInput: (search: string) => setDraft((current) => ({ ...current, search })),
    setMinPriceInput: (min: string) => setDraft((current) => ({ ...current, min })),
    setMaxPriceInput: (max: string) => setDraft((current) => ({ ...current, max })),
    submitSearch: () =>
      setParams(
        catalogUrlParams({ ...query, q: draft.search.trim() || undefined, page: 1 }, categoryId),
      ),
    clearFilters: () => {
      setPriceError(null);
      setParams({});
      setDraft({
        key: catalogQueryParams(
          categoryId === undefined ? { page: 1 } : { category_id: categoryId, page: 1 },
        ).toString(),
        filters: categoryId === undefined ? {} : { category_id: categoryId },
        min: '',
        max: '',
        search: '',
      });
    },
    removeFilter: (key: CatalogFilterKey | 'q') =>
      setParams(catalogUrlParams({ ...query, [key]: undefined, page: 1 }, categoryId)),
    setPage: (page: number) => setParams(catalogUrlParams({ ...query, page }, categoryId)),
    reload: results.reload,
  };
};
