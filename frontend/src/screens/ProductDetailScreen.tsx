import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../features/cart/hooks/useCart';
import { catalogService } from '../features/catalog/api/service';
import {
  ProductGallerySection,
  ProductPurchasePanel,
  ProductRecommendationsSection,
  ProductSpecsSection,
} from '../features/catalog/components/ProductDetailSections';
import type {
  ProductDetailDto,
  ProductVariantDto,
} from '../features/catalog/types';
import { useAuthSession } from '../features/auth/session/useAuthSession';
import { useToast } from '../shared/ui/toast/useToast';
import { getStorefrontErrorMessage } from '../services/http/storefrontError';
import { StorefrontDialog } from '../shared/ui/storefront/StorefrontDialog';
import { StorefrontImage } from '../shared/ui/storefront/StorefrontImage';
import { canPurchaseProductVariant } from '../features/catalog/model/purchaseAvailability';
import { useRemoteQuery } from '../shared/hooks/useRemoteQuery';
import { categoryProductsPath } from '../routes/paths';

export const ProductDetailScreen: React.FC = () => {
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { isAuthenticated } = useAuthSession();
  const navigate = useNavigate();
  const { productId = '' } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<ProductDetailDto | null>(null);
  const recommendationQuery = useRemoteQuery(useCallback(() => catalogService.listProducts({ page: 1, page_size: 5 }), []));
  const recommendations = (recommendationQuery.data?.items ?? []).filter(item => String(item.product_id) !== productId).slice(0, 4);
  const recommendationError = recommendationQuery.error ? getStorefrontErrorMessage(recommendationQuery.error, 'Không thể tải sản phẩm gợi ý. Bạn vẫn có thể chọn và mua sản phẩm này.') : null;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSizeValueId, setSelectedSizeValueId] = useState<number | null>(null);
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [colorSelectionNotice, setColorSelectionNotice] = useState<string | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return undefined;

    let active = true;
    const load = async () => {
      setLoading(true);
      setZoomOpen(false);
      try {
        const detail = await catalogService.getProductDetail(productId);
        if (!active) return;

        const onSale = detail.variants.filter((variant) => variant.sale_status === 'ON_SALE');
        const initialVariant =
          onSale.find((variant) => variant.available_quantity > 0)
          ?? onSale[0]
          ?? null;

        setProduct(detail);
        setActiveImageIndex(0);
        setColorSelectionNotice(null);
        setSelectedSizeValueId(initialVariant?.size.size_value_id ?? null);
        setSelectedColorId(initialVariant?.color.color_id ?? null);
        setQuantity(1);
        setError(null);
      } catch (requestError: unknown) {
        if (active) {
          setProduct(null);
          setError(getStorefrontErrorMessage(requestError, 'Không thể tải chi tiết sản phẩm.'));
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [productId, retry]);

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
    return [...byId.values()].sort((left, right) => left.sort_order - right.sort_order);
  }, [onSaleVariants]);

  const colorOptions = useMemo(() => {
    const byId = new Map<number, ProductVariantDto['color']>();
    onSaleVariants.forEach((variant) => byId.set(variant.color.color_id, variant.color));
    return [...byId.values()];
  }, [onSaleVariants]);

  const selectedVariant = useMemo(
    () =>
      product?.variants.find(
        (variant) =>
          variant.size.size_value_id === selectedSizeValueId
          && variant.color.color_id === selectedColorId,
      ) ?? null,
    [product, selectedColorId, selectedSizeValueId],
  );

  const variantCanBePurchased = canPurchaseProductVariant(
    product?.sale_status,
    selectedVariant,
  );

  const selectSize = (sizeValueId: number) => {
    setSelectedSizeValueId(sizeValueId);
    const currentColorStillValid = onSaleVariants.some(
      (variant) => variant.size.size_value_id === sizeValueId
        && variant.color.color_id === selectedColorId,
    );
    const colorWasCleared = selectedColorId !== null && !currentColorStillValid;
    const stopped = product?.variants.some(variant => variant.size.size_value_id === sizeValueId && variant.color.color_id === selectedColorId && variant.sale_status === 'STOPPED');
    const sizeName = sizeOptions.find(size => size.size_value_id === sizeValueId)?.display_name ?? '';
    setColorSelectionNotice(colorWasCleared ? stopped
      ? `Màu đã chọn ngừng bán ở size ${sizeName}. Vui lòng chọn màu khác.`
      : `Màu đã chọn không có ở size ${sizeName}. Vui lòng chọn màu khác.` : null);
    if (colorWasCleared) setSelectedColorId(null);
    setQuantity(1);
  };

  const selectColor = (colorId: number) => {
    if (!colorCompatibility(colorId)) return;
    setSelectedColorId(colorId);
    setColorSelectionNotice(null);
    setQuantity(1);
  };

  const colorCompatibility = (colorId: number): boolean =>
    onSaleVariants.some(
      (variant) => (selectedSizeValueId === null
        || variant.size.size_value_id === selectedSizeValueId)
        && variant.color.color_id === colorId,
    );

  const colorAvailability = (colorId: number): boolean =>
    onSaleVariants.some(
      (variant) =>
        variant.size.size_value_id === selectedSizeValueId
        && variant.color.color_id === colorId
        && variant.available_quantity > 0,
    );

  const sizeAvailability = (sizeValueId: number): boolean =>
    onSaleVariants.some(
      (variant) =>
        variant.size.size_value_id === sizeValueId
        && variant.available_quantity > 0,
    );

  const colorUnavailableReason = (colorId: number): string => {
    const variant = product?.variants.find(item => item.size.size_value_id === selectedSizeValueId && item.color.color_id === colorId);
    if (!variant) return 'Tổ hợp size và màu này không tồn tại';
    if (variant.sale_status === 'STOPPED') return 'Tổ hợp size và màu này đã ngừng bán';
    return variant.available_quantity === 0 ? 'Tổ hợp size và màu này đã hết hàng' : variant.color.name;
  };

  const addCurrentVariantToCart = () => {
    if (!product || !selectedVariant || !variantCanBePurchased) return;

    if (!isAuthenticated) {
      showToast('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.');
      navigate('/login', { state: { from: `/products/${encodeURIComponent(productId)}` } });
      return;
    }

    addToCart(selectedVariant.variant_id, product.name, quantity);
  };

  const openRecommendation = (nextProductId: string) => {
    navigate('/products/' + encodeURIComponent(nextProductId));
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };

  const moveImage = (offset: -1 | 1) => {
    if (gallery.length <= 1) return;
    setActiveImageIndex(
      (current) => (current + offset + gallery.length) % gallery.length,
    );
  };

  if (!productId) {
    return (
      <div className="min-h-[60vh] bg-[#FFFDF5] p-14 text-center text-sm text-red-700">
        Thiếu mã sản phẩm.
      </div>
    );
  }

  if (loading) {
    return (
      <div role="status" className="min-h-[60vh] bg-[#FFFDF5] p-14 text-center text-sm text-[#687069]">
        Đang tải sản phẩm...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-[60vh] bg-[#FFFDF5] p-14 text-center">
        <p role="alert" className="text-sm text-red-700">{error ?? 'Không tìm thấy sản phẩm.'}</p>
        <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-5 mr-3 border px-5 py-3 text-sm">Thử lại</button>
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="mt-5 border border-[#0B2419] bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
        >
          Quay lại sản phẩm
        </button>
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
        <nav aria-label="Đường dẫn sản phẩm" className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 text-[13px] font-medium text-[#606863]">
          <Link to="/" className="hover:text-[#0B2419]">
            Trang chủ
          </Link>
          <span aria-hidden="true">/</span><Link to="/products">Sản phẩm</Link>
          <span aria-hidden="true">/</span>
          <Link to={categoryProductsPath(product.category.category_id)} className="hover:text-[#0B2419]">
            {product.category.name}
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="min-w-0 font-semibold text-[#0B2419]">
            {product.name}
          </span>
        </nav>
      </div>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-7 sm:px-8 lg:grid-cols-12 lg:gap-10 lg:px-14">
        <div className="space-y-6 lg:col-span-7 xl:col-span-8">
          <ProductGallerySection
            product={product}
            gallery={gallery}
            activeImageIndex={activeImageIndex}
            onSelectImage={setActiveImageIndex}
            onMoveImage={moveImage}
            onZoom={() => setZoomOpen(true)}
          />
          <ProductSpecsSection items={specItems} materialCare={product.material_care} />
        </div>

        <ProductPurchasePanel
          product={product}
          selectedVariant={selectedVariant}
          onSaleVariants={onSaleVariants}
          sizeOptions={sizeOptions}
          colorOptions={colorOptions}
          selectedSizeValueId={selectedSizeValueId}
          selectedColorId={selectedColorId}
          quantity={quantity}
          variantCanBePurchased={variantCanBePurchased}
          displayedPrice={displayedPrice}
          sizeAvailability={sizeAvailability}
          colorAvailability={colorAvailability}
          colorCompatibility={colorCompatibility}
          colorUnavailableReason={colorUnavailableReason}
          colorSelectionNotice={colorSelectionNotice}
          onSelectSize={selectSize}
          onSelectColor={selectColor}
          onQuantityChange={setQuantity}
          onAddToCart={addCurrentVariantToCart}
        />
      </section>

      {zoomOpen && <StorefrontDialog name="Ảnh sản phẩm" onClose={() => setZoomOpen(false)} className="product-zoom-dialog">
        <div className="p-4" onKeyDown={event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); moveImage(event.key === 'ArrowLeft' ? -1 : 1); }
        }}>
          <header className="mb-3 flex items-center justify-between gap-3"><p role="status" className="text-sm">Ảnh {activeImageIndex + 1} / {gallery.length}</p><button autoFocus type="button" onClick={() => setZoomOpen(false)} className="min-h-11 border px-4">Đóng ảnh</button></header>
          <StorefrontImage src={gallery[activeImageIndex]} alt={product.images[activeImageIndex]?.alt_text ?? product.name} loading="eager" className="max-h-[66dvh] w-full object-contain" />
          {gallery.length > 1 && <nav aria-label="Chuyển ảnh phóng to" className="mt-3 flex justify-between gap-3"><button type="button" onClick={() => moveImage(-1)} className="min-h-11 border px-4">Ảnh trước</button><button type="button" onClick={() => moveImage(1)} className="min-h-11 border px-4">Ảnh tiếp theo</button></nav>}
        </div>
      </StorefrontDialog>}
      <ProductRecommendationsSection
        recommendations={recommendations}
        loading={recommendationQuery.loading}
        error={recommendationError}
        onRetry={recommendationQuery.reload}
        onOpenProduct={openRecommendation}
        onOpenCatalog={() => navigate('/products')}
      />
    </div>
  );
};
