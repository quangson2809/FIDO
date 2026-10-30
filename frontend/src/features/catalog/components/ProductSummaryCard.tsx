import { useCallback, useState } from 'react';
import { catalogService } from '../api/service';
import type { CatalogProductView, ProductAttributeValueDto } from '../types';
import { StorefrontImage } from '../../../shared/ui/storefront/StorefrontImage';
import { StorefrontDialog } from '../../../shared/ui/storefront/StorefrontDialog';
import { QueryFeedback } from '../../../shared/ui/storefront/QueryFeedback';
import { useRemoteQuery } from '../../../shared/hooks/useRemoteQuery';
import { getStorefrontErrorMessage } from '../../../services/http/storefrontError';
import { productSummaryMetadata } from '../model/productSummary';

const attributeValueText = (value: ProductAttributeValueDto): string | null =>
  value.label.trim() || value.value.trim() || null;

function ProductSummaryDetails({ productId }: { productId: number }) {
  const detail = useRemoteQuery(
    useCallback(() => catalogService.getProductDetail(productId), [productId]),
  );
  const product = detail.data;
  const attributes = (product?.attribute_values ?? [])
    .map((attribute) => ({ attribute, text: attributeValueText(attribute) }))
    .filter((item): item is { attribute: ProductAttributeValueDto; text: string } =>
      item.text !== null && item.text.trim() !== '',
    );

  return (
    <>
      <QueryFeedback
        loading={detail.loading}
        error={
          detail.error
            ? getStorefrontErrorMessage(detail.error, 'Không thể tải thông tin sản phẩm.')
            : null
        }
        onRetry={detail.reload}
      />
      {product && (
        <>
          <dl className="space-y-4 text-sm">
            {attributes.map(({ attribute, text }) => (
              <div key={attribute.attribute_id}>
                <dt className="font-semibold">{attribute.attribute_name}</dt>
                <dd className="mt-1 whitespace-pre-wrap">{text}</dd>
              </div>
            ))}
          </dl>
          {attributes.length === 0 && (
            <p className="text-sm text-muted-grey">Sản phẩm chưa có thuộc tính mô tả.</p>
          )}
          <p className="mt-4 text-sm text-muted-grey">
            Giá, trạng thái và thuộc tính được lấy từ thông tin sản phẩm hiện hành.
          </p>
        </>
      )}
    </>
  );
}

export function ProductSummaryCard({
  product,
  onOpenProduct,
}: {
  product: CatalogProductView;
  onOpenProduct: (id: string) => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const metadata = productSummaryMetadata(product);

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
        <span
          className="product-summary-metadata"
          title={metadata?.label}
          aria-label={metadata?.label}
        >
          {metadata?.text || '\u00a0'}
        </span>
        <h2 className="product-summary-title" title={product.name}>
          {product.name}
        </h2>
        <span className="product-summary-footer">
          <span className="product-summary-price" title="Giá bán của sản phẩm">
            <span>{product.selling_price.toLocaleString('vi-VN')} đ</span>
            <span className="product-summary-price-label">{product.status}</span>
          </span>
          <span className="product-summary-sku" title={product.sku}>
            SKU {product.sku}
          </span>
        </span>
        <span className="product-summary-cta" aria-hidden="true">
          Xem chi tiết <span>→</span>
        </span>
      </div>
      <button
        type="button"
        aria-label={`Xem thuộc tính: ${product.name}`}
        aria-haspopup="dialog"
        aria-expanded={detailsOpen}
        title="Xem thuộc tính sản phẩm"
        onClick={() => setDetailsOpen(true)}
        className="product-summary-info"
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6" />
          <circle cx="12" cy="7.5" r=".8" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {detailsOpen && (
        <StorefrontDialog
          name={`Thuộc tính ${product.name}`}
          onClose={() => setDetailsOpen(false)}
          className="product-summary-dialog"
        >
          <header className="mb-5 flex items-start justify-between gap-4">
            <h2 className="font-serif text-2xl">{product.name}</h2>
            <button
              autoFocus
              type="button"
              aria-label="Đóng thông tin sản phẩm"
              onClick={() => setDetailsOpen(false)}
              className="h-11 w-11 shrink-0"
            >
              ×
            </button>
          </header>
          <ProductSummaryDetails productId={product.product_id} />
        </StorefrontDialog>
      )}
    </article>
  );
}
