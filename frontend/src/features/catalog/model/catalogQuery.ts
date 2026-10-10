import type { CatalogMetaDto, CatalogProductQuery } from '../types';
export const filterKeys = ['category_id', 'brand_id', 'size_value_id', 'color_id', 'gender', 'season', 'style', 'min_price', 'max_price'] as const;
export type CatalogFilterKey = typeof filterKeys[number];
export type CatalogFilters = Partial<Pick<CatalogProductQuery, CatalogFilterKey>>;
const positiveInteger = (value: string | null, maximum = Number.MAX_SAFE_INTEGER): number | undefined => {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maximum ? parsed : undefined;
};
const price = (value: string | null): number | undefined => {
  if (!value || !/^\d+(?:\.\d{1,2})?$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed <= Number.MAX_SAFE_INTEGER ? parsed : undefined;
};
export function readCatalogQuery(params: URLSearchParams, meta?: CatalogMetaDto | null): CatalogProductQuery {
  // The existing controller binds page to a Java Integer, while filter IDs are Longs.
  const query: CatalogProductQuery = { page: positiveInteger(params.get('page'), 2_147_483_647) ?? 1 };
  const q = params.get('q')?.trim();
  if (q) query.q = q;
  for (const key of ['category_id', 'brand_id', 'size_value_id', 'color_id'] as const) {
    const id = positiveInteger(params.get(key));
    const choices = !meta ? null : key === 'category_id' ? meta.categories.map(item => item.category_id)
      : key === 'brand_id' ? meta.brands.map(item => item.brand_id)
      : key === 'color_id' ? meta.colors.map(item => item.color_id)
      : meta.size_systems.flatMap(system => system.size_values.map(item => item.size_value_id));
    if (id !== undefined && (!choices || choices.includes(id))) query[key] = id;
  }
  for (const key of ['gender', 'season', 'style'] as const) {
    const value = params.get(key)?.trim();
    const choices = !meta ? null : key === 'gender' ? meta.genders : key === 'season' ? meta.seasons : meta.styles;
    if (value && (!choices || choices.includes(value))) query[key] = value;
  }
  const min = price(params.get('min_price'));
  const max = price(params.get('max_price'));
  if (min === undefined || max === undefined || min <= max) {
    if (min !== undefined) query.min_price = min;
    if (max !== undefined) query.max_price = max;
  }
  return query;
}
export function catalogQueryParams(query: CatalogProductQuery): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of ['q', ...filterKeys, 'page'] as const) {
    const value = query[key];
    if (value !== undefined && value !== '' && !(key === 'page' && value === 1)) params.set(key, String(value));
  }
  return params;
}
export const filterLabels: Record<CatalogFilterKey, string> = {
  category_id: 'Danh mục', brand_id: 'Thương hiệu', size_value_id: 'Size', color_id: 'Màu',
  gender: 'Giới tính', season: 'Mùa', style: 'Phong cách', min_price: 'Giá từ', max_price: 'Giá đến',
};
export function catalogFilterLabel(key: CatalogFilterKey, value: string | number, meta: CatalogMetaDto | null): string {
  if (key === 'category_id') return meta?.categories.find(item => item.category_id === value)?.name ?? String(value);
  if (key === 'brand_id') return meta?.brands.find(item => item.brand_id === value)?.name ?? String(value);
  if (key === 'color_id') return meta?.colors.find(item => item.color_id === value)?.name ?? String(value);
  if (key === 'size_value_id') return meta?.size_systems.flatMap(system => system.size_values).find(item => item.size_value_id === value)?.display_name ?? String(value);
  if (key === 'min_price' || key === 'max_price') return `${Number(value).toLocaleString('vi-VN')}₫`;
  return String(value);
}
