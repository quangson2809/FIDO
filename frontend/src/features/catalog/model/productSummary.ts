import type { CatalogProductView, SizeValueDto } from '../types';

export function productSummaryMetadata(product: CatalogProductView) {
  const materialCare = product.materialCare?.trim();
  if (materialCare) return { text: materialCare, label: `Chất liệu & chăm sóc: ${materialCare}` };
  const text = product.brand ? `Thương hiệu: ${product.brand}`
    : product.category ? `Danh mục: ${product.category}` : '';
  return text ? { text, label: text } : null;
}

export function productSummarySizes(sizes: readonly SizeValueDto[] | null): string {
  if (sizes === null) return 'Size: xem chi tiết';
  if (!sizes.length) return 'Chưa có size đang bán';
  // Managed size codes keep the summary compact; the dialog retains full display names.
  const labels = sizes.map(size => size.code || size.display_name);
  // Only exact, consecutive integer labels can represent an inclusive range.
  const values = labels.map(label => /^(0|[1-9]\d*)$/.test(label) ? Number(label) : NaN);
  const consecutive = values.length > 1 && values.every((value, index) =>
    Number.isSafeInteger(value) && (index === 0 || value === values[index - 1] + 1));
  return `Size ${consecutive ? `${labels[0]} – ${labels[labels.length - 1]}` : labels.join(' · ')}`;
}
