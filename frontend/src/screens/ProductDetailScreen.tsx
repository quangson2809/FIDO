import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { catalogService } from '../features/catalog/api/service';
import type {
  CatalogProductView,
  ProductDetailDto,
  ProductVariantDto,
} from '../features/catalog/types';

export const ProductDetailScreen: React.FC = () => {
  const {
    selectedProductId,
    setSelectedProductId,
    addToCart,
    setCurrentScreen,
  } = useApp();

  const [product, setProduct] = useState<ProductDetailDto | null>(null);
  const [recommendations, setRecommendations] = useState<CatalogProductView[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSizeValueId, setSelectedSizeValueId] = useState<number | null>(null);
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const [detail, recommendationPage] = await Promise.all([
          catalogService.getProductDetail(selectedProductId),
          catalogService.listProducts({ page: 0, page_size: 5 }),
        ]);

        if (!active) return;

        const onSaleVariants = detail.variants.filter((variant) => variant.sale_status === 'ON_SALE');
        const initialVariant = onSaleVariants.find((variant) => variant.available_quantity > 0)
          ?? onSaleVariants[0]
          ?? null;

        setProduct(detail);
        setRecommendations(
          recommendationPage.items
            .filter((item) => item.product_id !== detail.product_id)
            .slice(0, 4),
        );
        setActiveImageIndex(0);
        setSelectedSizeValueId(initialVariant?.size.size_value_id ?? null);
        setSelectedColorId(initialVariant?.color.color_id ?? null);
        setQuantity(1);
        setError(null);
      } catch {
        if (active) {
          setProduct(null);
          setError('Không thể tải chi tiết sản phẩm.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [selectedProductId]);

  const gallery = useMemo(
    () => product?.images.map((image) => image.image_url) ?? [],
    [product],
  );

  const onSaleVariants = useMemo(
    () => product?.variants.filter((variant) => variant.sale_status === 'ON_SALE') ?? [],
    [product],
  );

  const sizeOptions = useMemo(() => {
    const byId = new Map<number, ProductVariantDto['size']>();
    onSaleVariants.forEach((variant) => byId.set(variant.size.size_value_id, variant.size));
    return [...byId.values()].sort((a, b) => a.sort_order - b.sort_order);
  }, [onSaleVariants]);

  const colorOptions = useMemo(() => {
    const byId = new Map<number, ProductVariantDto['color']>();
    onSaleVariants
      .filter((variant) => selectedSizeValueId === null || variant.size.size_value_id === selectedSizeValueId)
      .forEach((variant) => byId.set(variant.color.color_id, variant.color));
    return [...byId.values()];
  }, [onSaleVariants, selectedSizeValueId]);

  const selectedVariant = useMemo(
    () => onSaleVariants.find(
      (variant) =>
        variant.size.size_value_id === selectedSizeValueId
        && variant.color.color_id === selectedColorId,
    ) ?? null,
    [onSaleVariants, selectedColorId, selectedSizeValueId],
  );

  const variantCanBePurchased = Boolean(
    selectedVariant && selectedVariant.available_quantity > 0,
  );

  const selectSize = (sizeValueId: number) => {
    setSelectedSizeValueId(sizeValueId);
    const compatibleVariants = onSaleVariants.filter(
      (variant) => variant.size.size_value_id === sizeValueId,
    );
    const currentColorStillValid = compatibleVariants.find(
      (variant) => variant.color.color_id === selectedColorId,
    );
    const fallback = compatibleVariants.find((variant) => variant.available_quantity > 0)
      ?? compatibleVariants[0]
      ?? null;
    setSelectedColorId((currentColorStillValid ?? fallback)?.color.color_id ?? null);
    setQuantity(1);
  };

  const selectColor = (colorId: number) => {
    setSelectedColorId(colorId);
    setQuantity(1);
  };

  const colorAvailability = (colorId: number): boolean => onSaleVariants.some(
    (variant) =>
      variant.size.size_value_id === selectedSizeValueId
      && variant.color.color_id === colorId
      && variant.available_quantity > 0,
  );

  const sizeAvailability = (sizeValueId: number): boolean => onSaleVariants.some(
    (variant) => variant.size.size_value_id === sizeValueId && variant.available_quantity > 0,
  );

  const addCurrentVariantToCart = () => {
    if (!product || !selectedVariant || !variantCanBePurchased) return;
    addToCart(selectedVariant.variant_id, product.name, quantity);
  };

  const openRecommendation = (productId: string) => {
    setSelectedProductId(productId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return <div className="min-h-[50vh] p-12 text-center text-[#687069]">Đang tải sản phẩm...</div>;
  }

  if (error || !product) {
    return (
      <div className="min-h-[50vh] p-12 text-center">
        <p className="text-red-700">{error ?? 'Không tìm thấy sản phẩm.'}</p>
        <button type="button" onClick={() => setCurrentScreen('catalog')} className="mt-4 border border-[#0B2419] px-4 py-2 text-sm font-semibold">
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const displayedPrice = selectedVariant?.effective_price ?? product.base_price;

  return (
    <div className="bg-white text-[#0B2419]">
      <div className="border-b border-[#E2E5DE] bg-[#F5F6F2] px-4 py-3 sm:px-8">
        <nav className="mx-auto flex max-w-7xl items-center gap-2 text-sm text-[#606863]">
          <button type="button" onClick={() => setCurrentScreen('home')} className="hover:text-[#0B2419]">Trang chủ</button>
          <span>/</span>
          <button type="button" onClick={() => setCurrentScreen('catalog')} className="hover:text-[#0B2419]">{product.category.name}</button>
          <span>/</span>
          <span className="truncate font-semibold text-[#0B2419]">{product.name}</span>
        </nav>
      </div>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-8 sm:px-8 lg:grid-cols-12 lg:px-14">
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="flex flex-col-reverse gap-4 md:flex-row">
            {gallery.length > 1 && (
              <div className="flex gap-3 overflow-x-auto md:w-24 md:flex-col">
                {gallery.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={`h-28 w-20 shrink-0 overflow-hidden bg-[#F3F4EF] md:w-24 ${activeImageIndex === index ? 'ring-2 ring-[#0B2419]' : 'ring-1 ring-[#E8E9E3]'}`}
                  >
                    <img src={image} alt={product.images[index]?.alt_text ?? `${product.name} ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="aspect-[4/5] flex-1 overflow-hidden bg-[#F3F4EF]">
              {gallery.length > 0 ? (
                <img src={gallery[activeImageIndex] ?? gallery[0]} alt={product.images[activeImageIndex]?.alt_text ?? product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#8A918B]">Chưa có ảnh</div>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-6 lg:col-span-5 xl:col-span-4">
          <div>
            <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-wide text-[#687069]">
              <span>{product.brand?.name ?? product.category.name}</span>
              {selectedVariant?.sku && <span className="font-mono">{selectedVariant.sku}</span>}
            </div>
            <h1 className="mt-2 font-serif text-3xl">{product.name}</h1>
            {product.description && <p className="mt-3 text-sm leading-6 text-[#424844]">{product.description}</p>}
          </div>

          <div className="border border-[#E8E9E3] bg-[#FFFDF5] p-4">
            <span className="font-serif text-2xl font-bold">{displayedPrice.toLocaleString('vi-VN')}₫</span>
            {selectedVariant && (
              <p className="mt-1 text-xs text-[#687069]">
                {selectedVariant.available_quantity > 0
                  ? `Khả dụng: ${selectedVariant.available_quantity}`
                  : 'Biến thể này hiện hết hàng'}
              </p>
            )}
          </div>

          {sizeOptions.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider">Kích cỡ</p>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((size) => {
                  const available = sizeAvailability(size.size_value_id);
                  return (
                    <button
                      key={size.size_value_id}
                      type="button"
                      onClick={() => selectSize(size.size_value_id)}
                      className={`min-w-11 border px-3 py-2 text-sm font-semibold ${selectedSizeValueId === size.size_value_id ? 'border-[#0B2419] bg-[#0B2419] text-white' : 'border-[#D9DDD6] bg-white'} ${available ? '' : 'opacity-50'}`}
                    >
                      {size.display_name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {colorOptions.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider">Màu sắc</p>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => {
                  const available = colorAvailability(color.color_id);
                  return (
                    <button
                      key={color.color_id}
                      type="button"
                      onClick={() => selectColor(color.color_id)}
                      className={`border px-3 py-2 text-sm ${selectedColorId === color.color_id ? 'border-[#0B2419] bg-[#0B2419] text-white' : 'border-[#D9DDD6] bg-white'} ${available ? '' : 'opacity-50'}`}
                    >
                      {color.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {onSaleVariants.length === 0 && (
            <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Sản phẩm chưa có biến thể đang bán.</div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex h-12 items-center border border-[#D9DDD6]">
              <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="h-full w-10">−</button>
              <span className="w-10 text-center font-semibold">{quantity}</span>
              <button
                type="button"
                disabled={!selectedVariant || quantity >= selectedVariant.available_quantity}
                onClick={() => setQuantity((value) => value + 1)}
                className="h-full w-10 disabled:opacity-40"
              >
                +
              </button>
            </div>

            <button
              type="button"
              disabled={!variantCanBePurchased}
              onClick={addCurrentVariantToCart}
              className="h-12 flex-1 bg-[#0B2419] px-5 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#1B5038] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {variantCanBePurchased ? 'Thêm vào giỏ hàng' : 'Không khả dụng'}
            </button>
          </div>

          {product.material_care && (
            <div className="border-t border-[#E8E9E3] pt-4 text-sm leading-6 text-[#424844]">{product.material_care}</div>
          )}
        </aside>
      </section>

      {recommendations.length > 0 && (
        <section className="mx-auto max-w-7xl border-t border-[#E8E9E3] px-4 py-10 sm:px-8 lg:px-14">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#687069]">Catalog</p>
              <h2 className="font-serif text-2xl">Sản phẩm khác</h2>
            </div>
            <button type="button" onClick={() => setCurrentScreen('catalog')} className="text-sm font-semibold underline">Xem tất cả</button>
          </div>

          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {recommendations.map((item) => (
              <button key={item.id} type="button" onClick={() => openRecommendation(item.id)} className="border border-[#E8E9E3] bg-white p-3 text-left hover:border-[#0B2419]">
                <div className="aspect-[3/4] overflow-hidden bg-[#F3F4EF]">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-xs text-[#8A918B]">Chưa có ảnh</span>
                  )}
                </div>
                <p className="mt-3 line-clamp-2 text-sm font-semibold">{item.name}</p>
                <p className="mt-1 text-sm">{item.base_price.toLocaleString('vi-VN')}₫</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
