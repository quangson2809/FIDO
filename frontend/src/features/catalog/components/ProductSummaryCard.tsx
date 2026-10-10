import { useCallback, useState } from 'react';
import { catalogService } from '../api/service';
import type { CatalogProductView } from '../types';
import { StorefrontImage } from '../../../shared/ui/storefront/StorefrontImage';
import { StorefrontDialog } from '../../../shared/ui/storefront/StorefrontDialog';
import { QueryFeedback } from '../../../shared/ui/storefront/QueryFeedback';
import { useRemoteQuery } from '../../../shared/hooks/useRemoteQuery';
import { getStorefrontErrorMessage } from '../../../services/http/storefrontError';

function ProductSummaryDetails({ productId }: { productId: number }) {
  const detail = useRemoteQuery(useCallback(() => catalogService.getProductDetail(productId), [productId]));
  const product = detail.data;
  const sizes = [...new Map(product?.variants.filter(variant => variant.sale_status === 'ON_SALE').map(variant => [variant.size.size_value_id, variant.size]) ?? []).values()].sort((a, b) => a.sort_order - b.sort_order);
  const colors = [...new Set(product?.variants.filter(variant => variant.sale_status === 'ON_SALE').map(variant => variant.color.name) ?? [])];
  return <>
    <QueryFeedback loading={detail.loading} error={detail.error ? getStorefrontErrorMessage(detail.error, 'Không thể tải thông tin sản phẩm.') : null} onRetry={detail.reload} />
    {product && <><dl className="space-y-4 text-sm">
      <div><dt className="font-semibold">Kích cỡ đang bán</dt><dd className="mt-1">{sizes.map(size => size.display_name).join(' · ') || 'Chưa có kích cỡ đang bán'}</dd></div>
      <div><dt className="font-semibold">Màu sắc đang bán</dt><dd className="mt-1">{colors.join(' · ') || 'Chưa có màu đang bán'}</dd></div>
      <div><dt className="font-semibold">Chất liệu & chăm sóc</dt><dd className="mt-1 whitespace-pre-wrap">{product.material_care || 'Chưa có thông tin chất liệu và chăm sóc'}</dd></div>
    </dl><p className="mt-4 text-sm text-muted-grey">Xem chi tiết để chọn size, màu và kiểm tra giá, số lượng khả dụng.</p>
    </>}
  </>;
}

export function ProductSummaryCard({ product, onOpenProduct }: { product: CatalogProductView; onOpenProduct: (id: string) => void }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  return <article className="group min-w-0">
    <button type="button" aria-label={`Xem chi tiết: ${product.name}`} onClick={() => onOpenProduct(product.id)} className="block w-full text-left">
      <div className="relative aspect-[3/4] overflow-hidden bg-[#F3F4EF] ring-1 ring-[#E8E9E3]">
        <StorefrontImage loading="lazy" src={product.imageUrl || undefined} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" />
        <span className="absolute left-2 top-2 bg-forest-deep px-2 py-1 text-xs font-semibold text-white">{product.sale_status === 'ON_SALE' ? 'Đang bán' : 'Ngừng bán'}</span>
      </div>
      <div className="pt-4">
        <div className="flex flex-wrap gap-x-3 text-xs text-muted-grey"><span>{product.category}</span>{product.brand && <span className="font-semibold text-forest-deep">{product.brand}</span>}</div>
        <h2 className="mt-2 line-clamp-2 min-h-12 font-serif text-[17px] leading-6">{product.name}</h2>
        <p className="mt-2 text-xs text-muted-grey">Giá cơ bản</p><p className="font-mono text-sm font-bold">{product.base_price.toLocaleString('vi-VN')}₫</p>
        <span className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline">Xem chi tiết</span>
      </div>
    </button>
    <button type="button" aria-haspopup="dialog" onClick={() => setDetailsOpen(true)} className="mt-1 min-h-11 w-full border border-border-subtle bg-white px-2 text-sm">Xem size & chất liệu<span className="sr-only">: {product.name}</span></button>
    {detailsOpen && <StorefrontDialog name={`Thông tin ${product.name}`} onClose={() => setDetailsOpen(false)} className="max-w-lg p-6">
      <header className="mb-5 flex items-start justify-between gap-4"><h2 className="font-serif text-2xl">{product.name}</h2><button autoFocus type="button" aria-label="Đóng thông tin sản phẩm" onClick={() => setDetailsOpen(false)} className="h-11 w-11 shrink-0">×</button></header>
      <ProductSummaryDetails productId={product.product_id} />
    </StorefrontDialog>}
  </article>;
}
