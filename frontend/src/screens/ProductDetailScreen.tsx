import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { catalogService } from '../features/catalog/api/service';
import type { CatalogProductView } from '../features/catalog/types';

export const ProductDetailScreen: React.FC = () => {
  const {
    selectedProductId,
    setSelectedProductId,
    addToCart,
    wishlist,
    toggleWishlist,
    setCurrentScreen,
    setIsCartOpen,
  } = useApp();

  const [product, setProduct] = useState<CatalogProductView | null>(null);
  const [recommendations, setRecommendations] = useState<CatalogProductView[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState<string | number>('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const [detail, allProducts] = await Promise.all([
          catalogService.getProductDetail(selectedProductId),
          catalogService.getProducts(),
        ]);

        if (!active) return;

        setProduct(detail);
        setRecommendations(
          allProducts.filter((item) => item.product_id !== detail.product_id).slice(0, 4),
        );
        setActiveImageIndex(0);
        setSelectedColor(detail.colors[0]?.name ?? '');
        setSelectedSize(detail.sizes[0] ?? '');
        setQuantity(1);
        setError(null);
      } catch {
        if (active) {
          setProduct(null);
          setError('Không thể tải chi tiết sản phẩm.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [selectedProductId]);

  const gallery = useMemo(() => {
    if (!product) return [];
    if (product.galleryImages.length > 0) return product.galleryImages;
    return product.imageUrl ? [product.imageUrl] : [];
  }, [product]);

  const isFavorite = product ? wishlist.includes(product.id) : false;

  const previousImage = () => {
    if (gallery.length === 0) return;
    setActiveImageIndex((current) => (current - 1 + gallery.length) % gallery.length);
  };

  const nextImage = () => {
    if (gallery.length === 0) return;
    setActiveImageIndex((current) => (current + 1) % gallery.length);
  };

  const addCurrentProductToCart = () => {
    if (!product) return;
    addToCart(product, selectedSize || undefined, selectedColor || undefined, quantity);
    setIsCartOpen(true);
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
        <button
          type="button"
          onClick={() => setCurrentScreen('catalog')}
          className="mt-4 border border-[#0B2419] px-4 py-2 text-sm font-semibold"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white text-[#0B2419]">
      <div className="border-b border-[#E2E5DE] bg-[#F5F6F2] px-4 py-3 sm:px-8">
        <nav className="mx-auto flex max-w-7xl items-center gap-2 text-sm text-[#606863]">
          <button type="button" onClick={() => setCurrentScreen('home')} className="hover:text-[#0B2419]">
            Trang chủ
          </button>
          <span>/</span>
          <button type="button" onClick={() => setCurrentScreen('catalog')} className="hover:text-[#0B2419]">
            {product.category}
          </button>
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
                    className={`h-28 w-20 shrink-0 overflow-hidden bg-[#F3F4EF] md:w-24 ${
                      activeImageIndex === index ? 'ring-2 ring-[#0B2419]' : 'ring-1 ring-[#E8E9E3]'
                    }`}
                  >
                    <img src={image} alt={`${product.name} ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="relative aspect-[4/5] flex-1 overflow-hidden bg-[#F3F4EF]">
              {gallery.length > 0 ? (
                <img
                  src={gallery[activeImageIndex] ?? gallery[0]}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#8A918B]">Chưa có ảnh</div>
              )}

              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={previousImage}
                    aria-label="Ảnh trước"
                    className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <button
                    type="button"
                    onClick={nextImage}
                    aria-label="Ảnh tiếp theo"
                    className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-6 lg:col-span-5 xl:col-span-4">
          <div>
            <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-wide text-[#687069]">
              <span>{product.brand || 'FIDO'}</span>
              {product.sku && <span className="font-mono">{product.sku}</span>}
            </div>
            <h1 className="mt-2 font-serif text-3xl">{product.name}</h1>
            {product.description && (
              <p className="mt-3 text-sm leading-6 text-[#424844]">{product.description}</p>
            )}
          </div>

          <div className="border border-[#E8E9E3] bg-[#FFFDF5] p-4">
            <span className="font-serif text-2xl font-bold">
              {product.price.toLocaleString('vi-VN')}₫
            </span>
          </div>

          {product.colors.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider">
                Màu sắc: <span className="font-normal text-[#424844]">{selectedColor}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => setSelectedColor(color.name)}
                    className={`border px-3 py-2 text-sm ${
                      selectedColor === color.name
                        ? 'border-[#0B2419] bg-[#0B2419] text-white'
                        : 'border-[#D9DDD6] bg-white'
                    }`}
                  >
                    {color.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.sizes.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider">
                Kích cỡ: <span className="font-normal text-[#424844]">{selectedSize}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={String(size)}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-11 border px-3 py-2 text-sm font-semibold ${
                      selectedSize === size
                        ? 'border-[#0B2419] bg-[#0B2419] text-white'
                        : 'border-[#D9DDD6] bg-white'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex h-12 items-center border border-[#D9DDD6]">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                className="h-full w-10"
              >
                −
              </button>
              <span className="w-10 text-center font-semibold">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((value) => value + 1)}
                className="h-full w-10"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={addCurrentProductToCart}
              className="h-12 flex-1 bg-[#0B2419] px-5 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#1B5038]"
            >
              Thêm vào giỏ hàng
            </button>

            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              aria-label={isFavorite ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
              className="flex h-12 w-12 items-center justify-center border border-[#D9DDD6]"
            >
              <span className={`material-symbols-outlined ${isFavorite ? 'text-red-700' : ''}`}>favorite</span>
            </button>
          </div>

          <div className="border-t border-[#E8E9E3] pt-4 text-sm text-[#424844]">
            <p>Còn {product.inStockCount} sản phẩm khả dụng theo các biến thể hiện tại.</p>
            {product.fabric && <p className="mt-2">{product.fabric}</p>}
          </div>
        </aside>
      </section>

      {recommendations.length > 0 && (
        <section className="mx-auto max-w-7xl border-t border-[#E8E9E3] px-4 py-10 sm:px-8 lg:px-14">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#687069]">Gợi ý</p>
              <h2 className="font-serif text-2xl">Sản phẩm khác</h2>
            </div>
            <button type="button" onClick={() => setCurrentScreen('catalog')} className="text-sm font-semibold underline">
              Xem tất cả
            </button>
          </div>

          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {recommendations.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openRecommendation(item.id)}
                className="border border-[#E8E9E3] bg-white p-3 text-left hover:border-[#0B2419]"
              >
                <div className="aspect-[3/4] overflow-hidden bg-[#F3F4EF]">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-xs text-[#8A918B]">Chưa có ảnh</span>
                  )}
                </div>
                <p className="mt-3 truncate text-sm font-semibold">{item.name}</p>
                <p className="mt-1 font-mono text-sm font-bold">{item.price.toLocaleString('vi-VN')}₫</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
