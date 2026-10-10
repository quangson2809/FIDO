import { StorefrontIcon } from '../../../components/StorefrontIcon';
import React from 'react';
import { StorefrontImage } from '../../../shared/ui/storefront/StorefrontImage';
import type {
  CatalogProductView,
  ProductDetailDto,
  ProductVariantDto,
} from '../types';

export const ProductGallerySection: React.FC<{
  product: ProductDetailDto;
  gallery: readonly string[];
  activeImageIndex: number;
  onSelectImage: (index: number) => void;
  onMoveImage: (offset: -1 | 1) => void;
  onZoom?: () => void;
}> = ({
  product,
  gallery,
  activeImageIndex,
  onSelectImage,
  onMoveImage,
  onZoom,
}) => (
  <div className="min-w-0 flex flex-col-reverse gap-4 md:flex-row md:items-start">
    {gallery.length > 1 && (
      <div className="flex gap-3 overflow-x-auto pb-1 md:w-24 md:flex-col md:overflow-visible">
        {gallery.map((image, index) => (
          <button
            key={image + '-' + index}
            type="button"
            aria-label={`Xem ảnh ${index + 1}`} aria-pressed={activeImageIndex === index}
            onClick={() => onSelectImage(index)}
            className={'group h-28 w-20 shrink-0 overflow-hidden bg-[#F3F4EF] transition md:w-24 ' + (activeImageIndex === index ? 'ring-2 ring-[#0B2419] ring-offset-2' : 'ring-1 ring-[#E8E9E3] hover:ring-[#687069]')}
          >
            <StorefrontImage
              src={image}
              alt={product.images[index]?.alt_text ?? product.name + ' ' + (index + 1)}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          </button>
        ))}
      </div>
    )}

    <div className="group relative aspect-[4/5] min-w-0 flex-1 overflow-hidden bg-[#F3F4EF] shadow-sm">
      {gallery.length > 0 ? (
        <StorefrontImage
          loading="eager" src={gallery[activeImageIndex] ?? gallery[0]}
          alt={product.images[activeImageIndex]?.alt_text ?? product.name}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-[#606863]">Chưa có ảnh</div>
      )}
      {gallery.length > 0 && onZoom && <button type="button" onClick={onZoom} className="absolute bottom-4 right-4 min-h-11 bg-white px-4 text-sm shadow-sm">Phóng to ảnh</button>}
      {gallery.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Ảnh trước"
            onClick={() => onMoveImage(-1)}
            className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#0B2419] shadow-md backdrop-blur transition hover:bg-white"
          >
            <StorefrontIcon name="chevron_left" className="h-5 w-5 " />
          </button>
          <button
            type="button"
            aria-label="Ảnh tiếp theo"
            onClick={() => onMoveImage(1)}
            className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#0B2419] shadow-md backdrop-blur transition hover:bg-white"
          >
            <StorefrontIcon name="chevron_right" className="h-5 w-5 " />
          </button>
        </>
      )}
      <div className="absolute left-4 top-4 bg-[#071A12]/88 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur">
        FIDO Editorial
      </div>
    </div>
  </div>
);

export const ProductSpecsSection: React.FC<{
  items: readonly { label: string; value: string }[];
  materialCare: string | null;
}> = ({ items, materialCare }) => (
  <>
    {items.length > 0 && (
      <div className="grid grid-cols-2 gap-px overflow-hidden border border-[#E8E9E3] bg-[#E8E9E3] sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className="bg-[#FFFDF5] p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#687069]">{item.label}</p>
            <p className="mt-1 text-sm font-semibold text-[#0B2419]">{item.value}</p>
          </div>
        ))}
      </div>
    )}

    {materialCare && (
      <div className="border border-[#E8E9E3] bg-[#071A12] p-6 text-white sm:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8C75B] text-[#071A12]">
            <StorefrontIcon name="checkroom" className="h-5 w-5 " />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E8C75B]">Chất liệu & bảo quản</p>
            <p className="mt-2 text-sm leading-7 text-white/75">{materialCare}</p>
          </div>
        </div>
      </div>
    )}
  </>
);

export const ProductPurchasePanel: React.FC<{
  product: ProductDetailDto;
  selectedVariant: ProductVariantDto | null;
  onSaleVariants: readonly ProductVariantDto[];
  sizeOptions: readonly ProductVariantDto['size'][];
  colorOptions: readonly ProductVariantDto['color'][];
  selectedSizeValueId: number | null;
  selectedColorId: number | null;
  quantity: number;
  variantCanBePurchased: boolean;
  displayedPrice: number;
  sizeAvailability: (sizeValueId: number) => boolean;
  colorAvailability: (colorId: number) => boolean;
  colorCompatibility: (colorId: number) => boolean;
  colorSelectionNotice?: string | null;
  onSelectSize: (sizeValueId: number) => void;
  onSelectColor: (colorId: number) => void;
  onQuantityChange: (quantity: number) => void;
  onAddToCart: () => void;
}> = ({
  product,
  selectedVariant,
  onSaleVariants,
  sizeOptions,
  colorOptions,
  selectedSizeValueId,
  selectedColorId,
  quantity,
  variantCanBePurchased,
  displayedPrice,
  sizeAvailability,
  colorAvailability,
  colorCompatibility,
  colorSelectionNotice,
  onSelectSize,
  onSelectColor,
  onQuantityChange,
  onAddToCart,
}) => (
  <aside className="space-y-6 lg:sticky lg:top-24 lg:col-span-5 lg:self-start xl:col-span-4">
    <div className="border-b border-[#E8E9E3] pb-5">
      <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#687069]">
        <span>{product.brand?.name ?? product.category.name}</span>
        {selectedVariant?.sku && <span className="font-mono">{selectedVariant.sku}</span>}
      </div>
      <h1 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">{product.name}</h1>
      {product.description && <p className="mt-4 text-sm leading-7 text-[#424844]">{product.description}</p>}
    </div>

    <div className="flex items-center justify-between border border-[#E8E9E3] bg-[#FFFDF5] p-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#687069]">{selectedVariant ? 'Giá hiện tại' : 'Giá gốc tham khảo'}</p>
        <span className="mt-1 block font-serif text-2xl font-bold">{displayedPrice.toLocaleString('vi-VN')}₫</span>
      </div>
      {selectedVariant && (
        <div className={'px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ' + (selectedVariant.available_quantity > 0 ? 'bg-[#E8C75B] text-[#071A12]' : 'bg-[#E8E9E3] text-[#687069]')}>
          {selectedVariant.sale_status === 'STOPPED' ? 'Lựa chọn ngừng bán' : selectedVariant.available_quantity > 0 ? 'Còn ' + selectedVariant.available_quantity : 'Hết hàng'}
        </div>
      )}
    </div>

    {!selectedVariant && (
      <p className="text-sm text-[#687069]">
        Vui lòng chọn {selectedSizeValueId === null ? 'kích cỡ và màu sắc' : 'màu sắc'} để xác định giá chính xác.
      </p>
    )}

    {sizeOptions.length > 0 && (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em]">Kích cỡ</p>
          <span className="text-[10px] text-[#687069]">{product.size_system.name}</span>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-4">
          {sizeOptions.map((size) => {
            const available = sizeAvailability(size.size_value_id);
            return (
              <button
                key={size.size_value_id}
                type="button"
                aria-pressed={selectedSizeValueId === size.size_value_id}
                title={available ? size.display_name : `${size.display_name}: hết hàng`}
                onClick={() => onSelectSize(size.size_value_id)}
                className={'relative border px-2 py-2.5 text-sm font-semibold transition ' + (selectedSizeValueId === size.size_value_id ? 'border-[#0B2419] bg-[#0B2419] text-white' : 'border-[#D9DDD6] bg-white hover:border-[#0B2419]' + (available ? '' : ' text-[#606863]'))}
              >
                {size.display_name}
                {!available && <span className="absolute inset-x-1 top-1/2 h-px -rotate-12 bg-current opacity-60" />}
              </button>
            );
          })}
        </div>
      </div>
    )}

    {colorOptions.length > 0 && (
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em]">Màu sắc</p>
        <div className="flex flex-wrap gap-2">
          {colorOptions.map((color) => {
            const available = colorAvailability(color.color_id);
            const compatible = colorCompatibility(color.color_id);
            return (
              <button
                key={color.color_id}
                type="button"
                disabled={!compatible}
                aria-pressed={selectedColorId === color.color_id}
                title={!compatible ? "Màu này không được bán ở kích cỡ đã chọn" : !available ? "Hết hàng ở kích cỡ đã chọn" : color.name}
                onClick={() => onSelectColor(color.color_id)}
                className={'inline-flex items-center gap-2 border px-3 py-2.5 text-sm transition disabled:cursor-not-allowed ' + (selectedColorId === color.color_id ? 'border-[#0B2419] bg-[#0B2419] text-white' : 'border-[#D9DDD6] bg-white hover:border-[#0B2419]' + (available ? '' : ' text-[#606863]'))}
              >
                <span className={'h-2.5 w-2.5 rounded-full border ' + (selectedColorId === color.color_id ? 'border-white bg-[#E8C75B]' : 'border-[#687069] bg-[#F3F4EF]')} />
                {color.name}
              </button>
            );
          })}
        </div>
      </div>
    )}

    <div role="status" aria-live="polite" className="text-sm text-[#687069]">
      {colorSelectionNotice && <p>{colorSelectionNotice}</p>}
      {selectedColorId === null && <p>Vui lòng chọn màu sắc</p>}
      {selectedSizeValueId === null && <p>Vui lòng chọn kích cỡ</p>}
    </div>

    {product.sale_status === 'STOPPED' && (
      <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Sản phẩm đã ngừng bán. Các lựa chọn bên dưới chỉ dùng để tham khảo.
      </div>
    )}

    {product.sale_status === 'ON_SALE' && onSaleVariants.length === 0 && (
      <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Sản phẩm chưa có lựa chọn đang bán.
      </div>
    )}

    <div className="border-t border-[#E8E9E3] pt-5">
      <div className="flex items-stretch gap-3">
        <div className="flex h-12 items-center border border-[#D9DDD6] bg-white">
          <button
            type="button"
            aria-label="Giảm số lượng" disabled={quantity <= 1}
            onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
            className="h-full w-10 transition hover:bg-[#F3F4EF]"
          >
            −
          </button>
          <span className="w-10 text-center font-semibold">{quantity}</span>
          <button
            type="button"
            aria-label="Tăng số lượng"
            disabled={!selectedVariant || quantity >= selectedVariant.available_quantity}
            onClick={() => onQuantityChange(quantity + 1)}
            className="h-full w-10 transition hover:bg-[#F3F4EF] disabled:opacity-35"
          >
            +
          </button>
        </div>
        <button
          type="button"
          disabled={!variantCanBePurchased}
          onClick={onAddToCart}
          className="h-12 flex-1 bg-[#0B2419] px-5 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#1B5038] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {variantCanBePurchased ? 'Thêm vào giỏ hàng' : 'Không khả dụng'}
        </button>
      </div>
      <p className="mt-3 text-[10px] leading-5 text-[#687069]">
        {selectedVariant ? 'Giá và số lượng khả dụng theo kích cỡ, màu sắc đã chọn.' : 'Giá tham khảo có thể khác giá theo kích cỡ và màu bạn chọn.'}
      </p>
    </div>
  </aside>
);

export const ProductRecommendationsSection: React.FC<{
  recommendations: readonly CatalogProductView[];
  onOpenProduct: (productId: string) => void;
  onOpenCatalog: () => void;
}> = ({ recommendations, onOpenProduct, onOpenCatalog }) => {
  if (recommendations.length === 0) return null;

  return (
    <section className="border-t border-[#E8E9E3] bg-[#FFFDF5]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 lg:px-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#1B5038]">Có thể bạn quan tâm</p>
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
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {recommendations.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpenProduct(item.id)}
              className="group bg-white text-left"
            >
              <div className="aspect-[3/4] overflow-hidden bg-[#F3F4EF] ring-1 ring-[#E8E9E3]">
                {item.imageUrl ? (
                  <StorefrontImage
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-xs text-[#606863]">Chưa có ảnh</span>
                )}
              </div>
              <div className="p-3">
                <p className="line-clamp-2 min-h-10 text-sm font-semibold">{item.name}</p>
                <p className="mt-1 text-sm font-bold">{item.base_price.toLocaleString('vi-VN')}₫</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
