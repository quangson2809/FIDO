import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../features/cart/hooks/useCart';
import { catalogService } from '../features/catalog/api/service';
import {
  ProductGallerySection,
  ProductPurchasePanel,
  ProductRecommendationsSection,
  ProductSpecsSection,
} from '../features/catalog/components/ProductDetailSections';
import type {
  CatalogProductView,
  ProductDetailDto,
  ProductVariantDto,
} from '../features/catalog/types';
import { useAuthSession } from '../features/auth/session/useAuthSession';
import { useToast } from '../shared/ui/toast/useToast';
import { getApiErrorMessage } from '../services/http/apiError';
import { canPurchaseProductVariant } from '../features/catalog/model/purchaseAvailability';

export const ProductDetailScreen: React.FC = () => {
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { isAuthenticated } = useAuthSession();
  const navigate = useNavigate();
  const { productId = '' } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<ProductDetailDto | null>(null);
  const [recommendations, setRecommendations] = useState<CatalogProductView[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSizeValueId, setSelectedSizeValueId] = useState<number | null>(null);
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [colorClearedBySizeChange, setColorClearedBySizeChange] = useState(false);
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
        const initialVariant =
          onSale.find((variant) => variant.available_quantity > 0)
          ?? onSale[0]
          ?? null;

        setProduct(detail);
        setRecommendations(
          recommendationPage?.items
            .filter((item) => item.product_id !== detail.product_id)
            .slice(0, 4) ?? [],
        );
        setActiveImageIndex(0);
        setColorClearedBySizeChange(false);
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
    return () => {
      active = false;
    };
  }, [productId]);

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
    const currentColorStillValid = product?.variants.some(
      (variant) => variant.size.size_value_id === sizeValueId
        && variant.color.color_id === selectedColorId,
    );
    const colorWasCleared = selectedColorId !== null && !currentColorStillValid;
    setColorClearedBySizeChange(colorWasCleared);
    if (colorWasCleared) setSelectedColorId(null);
    setQuantity(1);
  };

  const selectColor = (colorId: number) => {
    if (!colorCompatibility(colorId)) return;
    setSelectedColorId(colorId);
    setColorClearedBySizeChange(false);
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
    navigate('/products/' + encodeURIComponent(nextProductId));
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      <div className="min-h-[60vh] bg-[#FFFDF5] p-14 text-center text-sm text-[#687069]">
        Đang tải sản phẩm...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-[60vh] bg-[#FFFDF5] p-14 text-center">
        <p className="text-sm text-red-700">{error ?? 'Không tìm thấy sản phẩm.'}</p>
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="mt-5 border border-[#0B2419] bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
        >
          Quay lại catalog
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
        <nav className="mx-auto flex max-w-7xl items-center gap-2 text-[13px] font-medium text-[#606863]">
          <button type="button" onClick={() => navigate('/')} className="hover:text-[#0B2419]">
            Trang chủ
          </button>
          <span className="text-[#A0A69F]">/</span>
          <button type="button" onClick={() => navigate('/products')} className="hover:text-[#0B2419]">
            {product.category.name}
          </button>
          <span className="text-[#A0A69F]">/</span>
          <span className="max-w-[45vw] truncate font-semibold text-[#0B2419]">
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
          colorSelectionNotice={colorClearedBySizeChange
            ? `Màu đã chọn không có ở size ${sizeOptions.find((size) => size.size_value_id === selectedSizeValueId)?.display_name ?? ''}. Vui lòng chọn màu khác.`
            : null}
          onSelectSize={selectSize}
          onSelectColor={selectColor}
          onQuantityChange={setQuantity}
          onAddToCart={addCurrentVariantToCart}
        />
      </section>

      <ProductRecommendationsSection
        recommendations={recommendations}
        onOpenProduct={openRecommendation}
        onOpenCatalog={() => navigate('/products')}
      />
    </div>
  );
};
