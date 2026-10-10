import { useCallback, useState } from 'react';
import { catalogService } from '../api/service';
import type { CatalogProductView } from '../types';
import { StorefrontImage } from '../../../shared/ui/storefront/StorefrontImage';
import { StorefrontDialog } from '../../../shared/ui/storefront/StorefrontDialog';
import { QueryFeedback } from '../../../shared/ui/storefront/QueryFeedback';
import { useRemoteQuery } from '../../../shared/hooks/useRemoteQuery';
import { getStorefrontErrorMessage } from '../../../services/http/storefrontError';
import { productSummaryMetadata, productSummarySizes } from '../model/productSummary';

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
  const metadata = productSummaryMetadata(product);
  const sizes = productSummarySizes(product.sizes);

  return (
    <article className="product-summary-card">
      <button
        type="button"
        aria-label={`Xem chi tiết: ${product.name}`}
        onClick={() => onOpenProduct(product.id)}
        className="product-summary-open"
      >
        <span className="product-summary-photo">
          <StorefrontImage
            loading="lazy"
            src={product.imageUrl || undefined}
            alt={product.name}
            className="product-summary-image"
          />
        </span>
      </button>
      <div className="product-summary-content">
        <span className="product-summary-metadata" title={metadata?.label} aria-label={metadata?.label}>{metadata?.text || '\u00a0'}</span>
        <h2 className="product-summary-title" title={product.name}>{product.name}</h2>
        <span className="product-summary-footer">
          <span className="product-summary-price" title="Giá cơ bản. Giá từng biến thể được xác nhận khi chọn size và màu.">
            <span>{product.base_price.toLocaleString('vi-VN')} đ</span>
            <span className="product-summary-price-label">cơ bản</span>
          </span>
          <span className="product-summary-sizes" title={sizes}>{sizes}</span>
        </span>
      </div>
      <button
        type="button"
        aria-label={`Xem size & chất liệu: ${product.name}`}
        aria-haspopup="dialog"
        aria-expanded={detailsOpen}
        title="Xem size, màu, chất liệu & chăm sóc"
        onClick={() => setDetailsOpen(true)}
        className="product-summary-info"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6" />
          <circle cx="12" cy="7.5" r=".8" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {detailsOpen && (
        <StorefrontDialog name={`Thông tin ${product.name}`} onClose={() => setDetailsOpen(false)} className="product-summary-dialog">
          <header className="mb-5 flex items-start justify-between gap-4">
            <h2 className="font-serif text-2xl">{product.name}</h2>
            <button autoFocus type="button" aria-label="Đóng thông tin sản phẩm" onClick={() => setDetailsOpen(false)} className="h-11 w-11 shrink-0">×</button>
          </header>
          <ProductSummaryDetails productId={product.product_id} />
        </StorefrontDialog>
      )}
    </article>
  );
}
