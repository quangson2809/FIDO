import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { catalogService } from '../features/catalog/api/service';
import type { CatalogProductView, ProductDetailDto, ProductVariantDto } from '../features/catalog/types';
import { getApiErrorMessage } from '../services/http/apiError';
import { useAuthSession } from '../features/auth/session/useAuthSession';

export const ProductDetailScreen: React.FC = () => {
  const { addToCart, showToast } = useApp();
  const { isAuthenticated } = useAuthSession();
  const navigate = useNavigate();
  const { productId = '' } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<ProductDetailDto | null>(null);
  const [recommendations, setRecommendations] = useState<CatalogProductView[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSizeValueId, setSelectedSizeValueId] = useState<number | null>(null);
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return undefined;

    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [detail, recommendationPage] = await Promise.all([
          catalogService.getProductDetail(productId),
          catalogService.listProducts({ page: 1, page_size: 5 }).catch(() => null),
        ]);
        if (!active) return;
        const onSale = detail.variants.filter((variant) => variant.sale_status === 'ON_SALE');
        const initialVariant = onSale.find((variant) => variant.available_quantity > 0) ?? onSale[0] ?? null;
        setProduct(detail);
        setRecommendations(
          recommendationPage?.items
            .filter((item) => item.product_id !== detail.product_id)
            .slice(0, 4) ?? [],
        );
        setActiveImageIndex(0);
        setSelectedSizeValueId(initialVariant?.size.size_value_id ?? null);
        setSelectedColorId(initialVariant?.color.color_id ?? null);
        setQuantity(1);
        setError(null);
      } catch (requestError: unknown) {
        if (active) {
          setProduct(null);
          setError(getApiErrorMessage(requestError, 'Không thể tải chi tiết sản phẩm.'));
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [productId]);

  const gallery = useMemo(() => product?.images.map((image) => image.image_url) ?? [], [product]);
  const onSaleVariants = useMemo(() => product?.variants.filter((variant) => variant.sale_status === 'ON_SALE') ?? [], [product]);

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
    () => onSaleVariants.find((variant) => variant.size.size_value_id === selectedSizeValueId && variant.color.color_id === selectedColorId) ?? null,
    [onSaleVariants, selectedColorId, selectedSizeValueId],
  );

  const variantCanBePurchased = Boolean(selectedVariant && selectedVariant.available_quantity > 0);

  const selectSize = (sizeValueId: number) => {
    setSelectedSizeValueId(sizeValueId);
    const compatibleVariants = onSaleVariants.filter((variant) => variant.size.size_value_id === sizeValueId);
    const currentColorStillValid = compatibleVariants.find((variant) => variant.color.color_id === selectedColorId);
    const fallback = compatibleVariants.find((variant) => variant.available_quantity > 0) ?? compatibleVariants[0] ?? null;
    setSelectedColorId((currentColorStillValid ?? fallback)?.color.color_id ?? null);
    setQuantity(1);
  };

  const selectColor = (colorId: number) => {
    setSelectedColorId(colorId);
    setQuantity(1);
  };

  const colorAvailability = (colorId: number): boolean => onSaleVariants.some(
    (variant) => variant.size.size_value_id === selectedSizeValueId && variant.color.color_id === colorId && variant.available_quantity > 0,
  );

  const sizeAvailability = (sizeValueId: number): boolean => onSaleVariants.some(
    (variant) => variant.size.size_value_id === sizeValueId && variant.available_quantity > 0,
  );

  const addCurrentVariantToCart = () => {
    if (!product || !selectedVariant || !variantCanBePurchased) return;
    if (!isAuthenticated) {
      showToast('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.');
      navigate('/login');
      return;
    }
    addToCart(selectedVariant.variant_id, product.name, quantity);
  };

  const openRecommendation = (nextProductId: string) => {
    navigate(`/products/${encodeURIComponent(nextProductId)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const moveImage = (offset: number) => {
    if (gallery.length <= 1) return;
    setActiveImageIndex((current) => (current + offset + gallery.length) % gallery.length);
  };

  if (!productId) {
    return <div className="min-h-[60vh] bg-[#FFFDF5] p-14 text-center text-sm text-red-700">Thiếu mã sản phẩm.</div>;
  }
  if (loading) return <div className="min-h-[60vh] bg-[#FFFDF5] p-14 text-center text-sm text-[#687069]">Đang tải sản phẩm...</div>;
  if (error || !product) {
    return (
      <div className="min-h-[60vh] bg-[#FFFDF5] p-14 text-center">
        <p className="text-sm text-red-700">{error ?? 'Không tìm thấy sản phẩm.'}</p>
        <button type="button" onClick={() => navigate('/products')} className="mt-5 border border-[#0B2419] bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider">Quay lại catalog</button>
      </div>
    );
  }

  const displayedPrice = selectedVariant?.effective_price ?? product.base_price;
  const specItems = [
    product.brand?.name ? { label: 'Thương hiệu', value: product.brand.name } : null,
    product.size_system?.name ? { label: 'Hệ kích cỡ', value: product.size_system.name } : null,
    product.gender ? { label: 'Giới tính', value: product.gender } : null,
    product.season ? { label: 'Mùa', value: product.season } : null,
    product.style ? { label: 'Phong cách', value: product.style } : null,
  ].filter((item): item is { label: string; value: string } => item !== null);

  return (
    <div className="w-full bg-white text-[#0B2419]">
      <div className="border-b border-[#E2E5DE] bg-[#F5F6F2] px-4 py-3 sm:px-8">
        <nav className="mx-auto flex max-w-7xl items-center gap-2 text-[13px] font-medium text-[#606863]">
          <button type="button" onClick={() => navigate('/')} className="hover:text-[#0B2419]">Trang chủ</button>
          <span className="text-[#A0A69F]">/</span>
          <button type="button" onClick={() => navigate('/products')} className="hover:text-[#0B2419]">{product.category.name}</button>
          <span className="text-[#A0A69F]">/</span>
          <span className="max-w-[45vw] truncate font-semibold text-[#0B2419]">{product.name}</span>
        </nav>
      </div>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-7 sm:px-8 lg:grid-cols-12 lg:gap-10 lg:px-14">
        <div className="space-y-6 lg:col-span-7 xl:col-span-8">
          <div className="flex flex-col-reverse gap-4 md:flex-row md:items-start">
            {gallery.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1 md:w-24 md:flex-col md:overflow-visible">
                {gallery.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={`group h-28 w-20 shrink-0 overflow-hidden bg-[#F3F4EF] transition md:w-24 ${activeImageIndex === index ? 'ring-2 ring-[#0B2419] ring-offset-2' : 'ring-1 ring-[#E8E9E3] hover:ring-[#687069]'}`}
                  >
                    <img src={image} alt={product.images[index]?.alt_text ?? `${product.name} ${index + 1}`} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  </button>
                ))}
              </div>
            )}

            <div className="group relative aspect-[4/5] flex-1 overflow-hidden bg-[#F3F4EF] shadow-sm">
              {gallery.length > 0 ? (
                <img src={gallery[activeImageIndex] ?? gallery[0]} alt={product.images[activeImageIndex]?.alt_text ?? product.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#8A918B]">Chưa có ảnh</div>
              )}
              {gallery.length > 1 && (
                <>
                  <button type="button" aria-label="Ảnh trước" onClick={() => moveImage(-1)} className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#0B2419] shadow-md backdrop-blur transition hover:bg-white"><span className="material-symbols-outlined">chevron_left</span></button>
                  <button type="button" aria-label="Ảnh tiếp theo" onClick={() => moveImage(1)} className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#0B2419] shadow-md backdrop-blur transition hover:bg-white"><span className="material-symbols-outlined">chevron_right</span></button>
                </>
              )}
              <div className="absolute left-4 top-4 bg-[#071A12]/88 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur">FIDO Editorial</div>
            </div>
          </div>

          {specItems.length > 0 && (
            <div className="grid grid-cols-2 gap-px overflow-hidden border border-[#E8E9E3] bg-[#E8E9E3] sm:grid-cols-3 lg:grid-cols-5">
              {specItems.map((item) => (
                <div key={item.label} className="bg-[#FFFDF5] p-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#687069]">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-[#0B2419]">{item.value}</p>
                </div>
              ))}
            </div>
          )}

          {product.material_care && (
            <div className="border border-[#E8E9E3] bg-[#071A12] p-6 text-white sm:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8C75B] text-[#071A12]"><span className="material-symbols-outlined">checkroom</span></div>
                <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E8C75B]">Chất liệu & bảo quản</p><p className="mt-2 text-sm leading-7 text-white/75">{product.material_care}</p></div>
              </div>
            </div>
          )}
        </div>

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
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#687069]">Giá hiện tại</p><span className="mt-1 block font-serif text-2xl font-bold">{displayedPrice.toLocaleString('vi-VN')}₫</span></div>
            {selectedVariant && <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${selectedVariant.available_quantity > 0 ? 'bg-[#E8C75B] text-[#071A12]' : 'bg-[#E8E9E3] text-[#687069]'}`}>{selectedVariant.available_quantity > 0 ? `Còn ${selectedVariant.available_quantity}` : 'Hết hàng'}</div>}
          </div>

          {sizeOptions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between"><p className="text-[11px] font-bold uppercase tracking-[0.16em]">Kích cỡ</p><span className="text-[10px] text-[#687069]">{product.size_system.name}</span></div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-4">
                {sizeOptions.map((size) => {
                  const available = sizeAvailability(size.size_value_id);
                  return (
                    <button key={size.size_value_id} type="button" onClick={() => selectSize(size.size_value_id)} className={`relative border px-2 py-2.5 text-sm font-semibold transition ${selectedSizeValueId === size.size_value_id ? 'border-[#0B2419] bg-[#0B2419] text-white' : 'border-[#D9DDD6] bg-white hover:border-[#0B2419]'} ${available ? '' : 'opacity-45'}`}>
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
                  return (
                    <button key={color.color_id} type="button" onClick={() => selectColor(color.color_id)} className={`inline-flex items-center gap-2 border px-3 py-2.5 text-sm transition ${selectedColorId === color.color_id ? 'border-[#0B2419] bg-[#0B2419] text-white' : 'border-[#D9DDD6] bg-white hover:border-[#0B2419]'} ${available ? '' : 'opacity-45'}`}>
                      <span className={`h-2.5 w-2.5 rounded-full border ${selectedColorId === color.color_id ? 'border-white bg-[#E8C75B]' : 'border-[#687069] bg-[#F3F4EF]'}`} />
                      {color.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {onSaleVariants.length === 0 && <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Sản phẩm chưa có biến thể đang bán.</div>}

          <div className="border-t border-[#E8E9E3] pt-5">
            <div className="flex items-stretch gap-3">
              <div className="flex h-12 items-center border border-[#D9DDD6] bg-white">
                <button type="button" aria-label="Giảm số lượng" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="h-full w-10 transition hover:bg-[#F3F4EF]">−</button>
                <span className="w-10 text-center font-semibold">{quantity}</span>
                <button type="button" aria-label="Tăng số lượng" disabled={!selectedVariant || quantity >= selectedVariant.available_quantity} onClick={() => setQuantity((value) => value + 1)} className="h-full w-10 transition hover:bg-[#F3F4EF] disabled:opacity-35">+</button>
              </div>
              <button type="button" disabled={!variantCanBePurchased} onClick={addCurrentVariantToCart} className="h-12 flex-1 bg-[#0B2419] px-5 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#1B5038] disabled:cursor-not-allowed disabled:opacity-40">{variantCanBePurchased ? 'Thêm vào giỏ hàng' : 'Không khả dụng'}</button>
            </div>
            <p className="mt-3 text-[10px] leading-5 text-[#687069]">Giá và số lượng khả dụng lấy từ biến thể hiện tại. Giỏ hàng được lưu qua backend sau khi đăng nhập.</p>
          </div>
        </aside>
      </section>

      {recommendations.length > 0 && (
        <section className="border-t border-[#E8E9E3] bg-[#FFFDF5]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 lg:px-14">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#1B5038]">Curated selection</p><h2 className="mt-1 font-serif text-3xl">Sản phẩm khác</h2></div>
              <button type="button" onClick={() => navigate('/products')} className="text-xs font-bold uppercase tracking-wider underline underline-offset-4">Xem catalog</button>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {recommendations.map((item) => (
                <button key={item.id} type="button" onClick={() => openRecommendation(item.id)} className="group bg-white text-left">
                  <div className="aspect-[3/4] overflow-hidden bg-[#F3F4EF] ring-1 ring-[#E8E9E3]">{item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : <span className="flex h-full items-center justify-center text-xs text-[#8A918B]">Chưa có ảnh</span>}</div>
                  <div className="p-3"><p className="line-clamp-2 min-h-10 text-sm font-semibold">{item.name}</p><p className="mt-1 text-sm font-bold">{item.base_price.toLocaleString('vi-VN')}₫</p></div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};