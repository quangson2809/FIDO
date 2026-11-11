import type { CatalogMetaDto, CatalogProductQuery } from '../types';

export const filterKeys = [
  'category_id',
  'brand_id',
  'min_price',
  'max_price',
] as const;

export type CatalogFilterKey = (typeof filterKeys)[number];
export type CatalogFilters = Partial<Pick<CatalogProductQuery, CatalogFilterKey>>;

const positiveInteger = (
  value: string | null,
  maximum = Number.MAX_SAFE_INTEGER,
): number | undefined => {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maximum ? parsed : undefined;
};

const price = (value: string | null): number | undefined => {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
};

export function readCatalogQuery(
  params: URLSearchParams,
  meta?: CatalogMetaDto | null,
  categoryId?: number,
): CatalogProductQuery {
  const query: CatalogProductQuery = {
    page: positiveInteger(params.get('page'), 2_147_483_647) ?? 1,
  };
  const q = params.get('q')?.trim();
  if (q) query.q = q;

  const category = positiveInteger(params.get('category_id'));
  const categoryIds = meta?.categories.map((item) => item.category_id);
  if (category !== undefined && (!categoryIds || categoryIds.includes(category))) {
    query.category_id = category;
  }

  const brand = positiveInteger(params.get('brand_id'));
  const brandIds = meta?.brands.map((item) => item.brand_id);
  if (brand !== undefined && (!brandIds || brandIds.includes(brand))) {
    query.brand_id = brand;
  }

  const min = price(params.get('min_price'));
  const max = price(params.get('max_price'));
  if (min === undefined || max === undefined || min <= max) {
    if (min !== undefined) query.min_price = min;
    if (max !== undefined) query.max_price = max;
  }

  if (categoryId !== undefined) query.category_id = categoryId;
  return query;
}

export function catalogQueryParams(query: CatalogProductQuery): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of ['q', ...filterKeys, 'page'] as const) {
    const value = query[key];
    if (value !== undefined && value !== '' && !(key === 'page' && value === 1)) {
      params.set(key, String(value));
    }
  }
  return params;
}

export function catalogUrlParams(query: CatalogProductQuery, categoryId?: number): URLSearchParams {
  return catalogQueryParams(categoryId === undefined ? query : { ...query, category_id: undefined });
}

export const filterLabels: Record<CatalogFilterKey, string> = {
  category_id: 'Danh mục',
  brand_id: 'Thương hiệu',
  min_price: 'Giá từ',
  max_price: 'Giá đến',
};

export function catalogFilterLabel(
  key: CatalogFilterKey,
  value: string | number,
  meta: CatalogMetaDto | null,
): string {
  if (key === 'category_id') {
    return meta?.categories.find((item) => item.category_id === value)?.name ?? String(value);
  }
  if (key === 'brand_id') {
    return meta?.brands.find((item) => item.brand_id === value)?.name ?? String(value);
  }
  return `${Number(value).toLocaleString('vi-VN')}₫`;
}
