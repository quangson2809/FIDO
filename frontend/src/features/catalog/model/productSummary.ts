import type { CatalogProductView } from '../types';

export function productSummaryMetadata(product: CatalogProductView) {
  const text = product.brand
    ? `Thương hiệu: ${product.brand}`
    : product.category
      ? `Danh mục: ${product.category}`
      : '';
  return text ? { text, label: text } : null;
}
