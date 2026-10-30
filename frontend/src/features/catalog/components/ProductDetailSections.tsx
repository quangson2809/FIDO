import React from 'react';
import { StorefrontIcon } from '../../../components/StorefrontIcon';
import { StorefrontImage } from '../../../shared/ui/storefront/StorefrontImage';
import { QueryFeedback } from '../../../shared/ui/storefront/QueryFeedback';
import type {
  AttributeDto,
  CatalogProductView,
  ProductAttributeValueDto,
  ProductDetailDto,
} from '../types';
import { ProductSummaryCard } from './ProductSummaryCard';

const productName = (product: ProductDetailDto): string => product.name ?? product.sku;

const attributeValueLabel = (
  value: ProductAttributeValueDto,
  definitions: readonly AttributeDto[],
): string => {
  const definition = definitions.find((item) => item.id === value.attribute_id);
  const dataType = definition?.data_type ?? value.data_type;

  switch (dataType) {
    case 'OPTION':
      return (
        definition?.options.find((option) => option.id === value.option_id)?.label ??
        value.option_label ??
        value.option_value ??
        '—'
      );
    case 'TEXT':
      return value.text_value ?? '—';
    case 'NUMBER':
      return value.number_value === null
        ? '—'
        : value.number_value.toLocaleString('vi-VN', { maximumFractionDigits: 4 });
    case 'BOOLEAN':
      return value.boolean_value === null ? '—' : value.boolean_value ? 'Có' : 'Không';
    default:
      return '—';
  }
};

export const ProductGallerySection: React.FC<{
  product: ProductDetailDto;
  gallery: readonly string[];
  activeImageIndex: number;
  onSelectImage: (index: number) => void;
  onMoveImage: (offset: -1 | 1) => void;
  onZoom?: () => void;
}> = ({ product, gallery, activeImageIndex, onSelectImage, onMoveImage, onZoom }) => (
  <div className="min-w-0 flex flex-col-reverse gap-4 md:flex-row md:items-start">
    {gallery.length > 1 && (
      <div className="flex max-w-full gap-3 overflow-x-auto p-1 md:max-h-[640px] md:w-28 md:shrink-0 md:flex-col md:overflow-y-auto">
        {gallery.map((image, index) => (
          <button
            key={image + '-' + index}
            type="button"
            aria-label={'Xem ảnh ' + (index + 1)}
            aria-pressed={activeImageIndex === index}
            onClick={() => onSelectImage(index)}
            className={
              'group h-28 w-20 shrink-0 overflow-hidden bg-[#F3F4EF] transition md:w-24 ' +
              (activeImageIndex === index
                ? 'ring-2 ring-[#0B2419] ring-offset-2'
                : 'ring-1 ring-[#E8E9E3] hover:ring-[#687069]')
            }
          >
            <StorefrontImage
              src={image}
              alt={productName(product) + ' ' + (index + 1)}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          </button>
        ))}
      </div>
    )}
    <div className="group relative aspect-[4/5] min-w-0 flex-1 overflow-hidden bg-[#F3F4EF] shadow-sm">
      {gallery.length > 0 ? (
        <StorefrontImage
          loading="eager"
          src={gallery[activeImageIndex] ?? gallery[0]}
          alt={productName(product)}
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-[#606863]">
          Chưa có ảnh
        </div>
      )}
      {gallery.length > 0 && onZoom && (
        <button
          type="button"
          onClick={onZoom}
          className="absolute bottom-4 right-4 min-h-11 bg-white px-4 text-sm shadow-sm"
        >
          Phóng to ảnh
        </button>
      )}
      {gallery.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Ảnh trước"
            onClick={() => onMoveImage(-1)}
            className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#0B2419] shadow-md backdrop-blur transition hover:bg-white"
          >
            <StorefrontIcon name="chevron_left" className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Ảnh tiếp theo"
            onClick={() => onMoveImage(1)}
            className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#0B2419] shadow-md backdrop-blur transition hover:bg-white"
          >
            <StorefrontIcon name="chevron_right" className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  </div>
);

export const ProductSpecsSection: React.FC<{
  items: readonly { label: string; value: string }[];
}> = ({ items }) =>
  items.length > 0 ? (
    <div className="grid grid-cols-2 gap-px overflow-hidden border border-[#E8E9E3] bg-[#E8E9E3] sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-[#FFFDF5] p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#687069]">
            {item.label}
          </p>
          <p className="mt-1 break-words text-sm font-semibold text-[#0B2419]">{item.value}</p>
        </div>
      ))}
    </div>
  ) : null;

export const ProductPurchasePanel: React.FC<{
  product: ProductDetailDto;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onAddToCart: () => void;
  attributeDefinitions?: readonly AttributeDto[];
}> = ({ product, quantity, onQuantityChange, onAddToCart, attributeDefinitions = [] }) => {
  const canPurchase = product.status === 'ACTIVE';
  const displayName = productName(product);

  return (
    <aside className="flex min-w-0 flex-col gap-6 lg:col-span-5 xl:col-span-4">
      <div className="space-y-4 border-b border-[#E8E9E3] pb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#1B5038]">
          FIDO / CATALOG
        </p>
        <h1 className="font-serif text-3xl leading-tight sm:text-4xl">{displayName}</h1>
        <p className="break-words font-mono text-xs text-[#687069]">SKU: {product.sku}</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-serif text-2xl font-bold">
            {product.selling_price.toLocaleString('vi-VN')}₫
          </p>
          <span
            className={
              'border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ' +
              (canPurchase
                ? 'border-[#C8DDCC] bg-[#EEF6EE] text-[#245A32]'
                : 'border-[#E2E5DE] bg-[#F3F4EF] text-[#687069]')
            }
          >
            {product.status}
          </span>
        </div>
      </div>

      {product.description ? (
        <p className="whitespace-pre-line text-sm leading-7 text-[#606863]">
          {product.description}
        </p>
      ) : (
        <p className="text-sm text-[#687069]">Sản phẩm chưa có mô tả.</p>
      )}

      <section aria-label="Thuộc tính sản phẩm" className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.16em]">
          Thông tin thuộc tính
        </h2>
        {product.attribute_values.length > 0 ? (
          <dl className="divide-y divide-[#E8E9E3] border-y border-[#E8E9E3]">
            {product.attribute_values.map((value) => {
              const definition = attributeDefinitions.find(
                (item) => item.id === value.attribute_id,
              );
              return (
                <div
                  key={value.attribute_id}
                  className="flex items-start justify-between gap-5 py-3 text-sm"
                >
                  <dt className="text-[#687069]">{definition?.name ?? value.attribute_name}</dt>
                  <dd className="max-w-[62%] whitespace-pre-wrap break-words text-right font-semibold">
                    {attributeValueLabel(value, attributeDefinitions)}
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : (
          <p className="border-y border-[#E8E9E3] py-4 text-sm text-[#687069]">
            Sản phẩm chưa có thuộc tính mô tả.
          </p>
        )}
      </section>

      {!canPurchase && (
        <p className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Sản phẩm hiện chưa khả dụng để mua.
        </p>
      )}

      <div className="border-t border-[#E8E9E3] pt-5">
        <div className="flex flex-col items-stretch gap-3 sm:flex-row">
          <div className="flex h-12 shrink-0 items-center justify-center border border-[#D9DDD6] bg-white">
            <button
              type="button"
              aria-label="Giảm số lượng"
              disabled={quantity <= 1}
              onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
              className="h-full w-10 transition hover:bg-[#F3F4EF] disabled:opacity-40"
            >
              −
            </button>
            <span className="w-10 text-center font-semibold">{quantity}</span>
            <button
              type="button"
              aria-label="Tăng số lượng"
              disabled={quantity >= 99}
              onClick={() => onQuantityChange(Math.min(99, quantity + 1))}
              className="h-full w-10 transition hover:bg-[#F3F4EF] disabled:opacity-40"
            >
              +
            </button>
          </div>
          <button
            type="button"
            disabled={!canPurchase}
            onClick={onAddToCart}
            className="h-12 flex-1 bg-[#0B2419] px-5 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#1B5038] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {canPurchase ? 'Thêm vào giỏ hàng' : 'Không khả dụng'}
          </button>
        </div>
        <p className="mt-3 text-[10px] leading-5 text-[#687069]">
          Giá, trạng thái và thuộc tính được lấy từ thông tin Product hiện hành.
        </p>
      </div>
    </aside>
  );
};

export const ProductRecommendationsSection: React.FC<{
  recommendations: readonly CatalogProductView[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onOpenProduct: (productId: string) => void;
  onOpenCatalog: () => void;
}> = ({ recommendations, loading, error, onRetry, onOpenProduct, onOpenCatalog }) => {
  if (recommendations.length === 0 && !loading && !error) return null;

  return (
    <section aria-label="Sản phẩm khác" className="border-t border-[#E8E9E3] bg-[#FFFDF5]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 lg:px-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#1B5038]">
              Có thể bạn quan tâm
            </p>
            <h2 className="mt-1 font-serif text-3xl">Sản phẩm khác</h2>
          </div>
          <button
            type="button"
            onClick={onOpenCatalog}
            className="text-xs font-bold uppercase tracking-wider underline underline-offset-4"
          >
            Xem sản phẩm
          </button>
        </div>
        <QueryFeedback loading={loading} error={error} onRetry={onRetry} />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {recommendations.map((item) => (
            <ProductSummaryCard key={item.id} product={item} onOpenProduct={onOpenProduct} />
          ))}
        </div>
      </div>
    </section>
  );
};
