import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../features/cart/hooks/useCart';
import { catalogService } from '../features/catalog/api/service';
import {
  ProductGallerySection,
  ProductPurchasePanel,
  ProductRecommendationsSection,
  ProductSpecsSection,
} from '../features/catalog/components/ProductDetailSections';
import type { ProductDetailDto } from '../features/catalog/types';
import { ProductFamilySelector } from '../features/catalog/components/ProductFamilySelector';
import { ProductLongDescription } from '../features/catalog/components/ProductLongDescription';
import {
  familyOptions,
  matchingFamilyMembers,
  matchingPurchasableMembers,
  memberIsPurchasable,
  memberOption,
  type FamilyOptionCode,
} from '../features/catalog/model/productFamilySelection';
import { sortProductImages } from '../features/catalog/model/productImageOrder';
import { useAuthSession } from '../features/auth/session/useAuthSession';
import { useToast } from '../shared/ui/toast/useToast';
import { getStorefrontErrorMessage } from '../services/http/storefrontError';
import { normalizeApiError } from '../services/http/apiError';
import { StorefrontDialog } from '../shared/ui/storefront/StorefrontDialog';
import { StorefrontImage } from '../shared/ui/storefront/StorefrontImage';
import { useRemoteQuery } from '../shared/hooks/useRemoteQuery';
import { useCatalogMetadata } from '../features/catalog/hooks/useCatalogMetadata';
import { categoryProductsPath, productDetailPath } from '../routes/paths';

export const ProductDetailScreen: React.FC = () => {
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { isAuthenticated } = useAuthSession();
  const navigate = useNavigate();
  const { productId = '' } = useParams<{ productId: string }>();
  const metadata = useCatalogMetadata();
  const [product, setProduct] = useState<ProductDetailDto | null>(null);
  const [colorId, setColorId] = useState<number | null>(null);
  const [sizeId, setSizeId] = useState<number | null>(null);
  const recommendationQuery = useRemoteQuery(
    useCallback(() => catalogService.listProducts({ page: 1, page_size: 5 }), []),
  );
  const recommendations = (recommendationQuery.data?.items ?? [])
    .filter((item) => String(item.product_id) !== productId)
    .slice(0, 4);
  const recommendationError = recommendationQuery.error
    ? getStorefrontErrorMessage(
        recommendationQuery.error,
        'Không thể tải sản phẩm gợi ý. Bạn vẫn có thể xem thông tin sản phẩm này.',
      )
    : null;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
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
        setProduct(detail);
        setColorId(detail.attribute_values.find((value) => value.attribute_code === 'COLOR')
          ?.attribute_value_id ?? null);
        setSizeId(detail.attribute_values.find((value) => value.attribute_code === 'SIZE')
          ?.attribute_value_id ?? null);
        setActiveImageIndex(0);
        setQuantity(1);
        setError(null);
      } catch (requestError: unknown) {
        if (active) {
          const normalizedError = normalizeApiError(requestError);
          const message =
            normalizedError.status === 404
              ? 'Không tìm thấy sản phẩm hoặc sản phẩm không còn được hiển thị.'
              : getStorefrontErrorMessage(
                  requestError,
                  'Không thể tải chi tiết sản phẩm. Vui lòng thử lại.',
                );
          setProduct(null);
          setError(message);
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

  const openFamilyProduct = (nextProductId: number) => {
    if (String(nextProductId) !== productId) {
      setActiveImageIndex(0);
      setZoomOpen(false);
      navigate(productDetailPath(nextProductId));
    }
  };

  const selectFamilyOption = (code: FamilyOptionCode, optionId: number) => {
    if (!product) return;
    let nextColor = code === 'COLOR' ? optionId : colorId;
    let nextSize = code === 'SIZE' ? optionId : sizeId;
    const matches = matchingFamilyMembers(product.family.members, nextColor, nextSize);
    if (matches.length === 0) {
      // Color/size choices are independent; reset the incompatible opposite axis.
      if (code === 'COLOR') nextSize = null;
      else nextColor = null;
      // The opposite selected Option does not exist in this family combination.
    }
    setColorId(nextColor);
    setSizeId(nextSize);
    const buyable = matchingPurchasableMembers(product.family.members, nextColor, nextSize);
    const hasColor = familyOptions(product.family.members, 'COLOR').length > 0;
    const hasSize = familyOptions(product.family.members, 'SIZE').length > 0;
    // Do not silently choose a size when the customer only selected a color.
    if (buyable.length === 1 && (!hasColor || nextColor !== null)
        && (!hasSize || nextSize !== null)) {
      openFamilyProduct(buyable[0].product_id);
    }
  };

  // Optimistically use already-fetched family data while the selected Product detail loads.
  // Keep Cart disabled until the matching Product ID is confirmed by the detail API.
  const routedMember = product?.family.members.find((member) =>
    String(member.product_id) === productId);
  const detailReady = product !== null && String(product.product_id) === productId;
  const displayProduct: ProductDetailDto | null =
    product && routedMember && !detailReady ? { ...product, ...routedMember } : product;
  const rootMember = product?.family.members.find(
    (member) => member.product_id === product.family.root_product_id);
  const usingFamilyFallback = Boolean(
    displayProduct && !displayProduct.images.length
      && rootMember && rootMember.product_id !== displayProduct.product_id
      && rootMember.images.length > 0,
  );
  // Rendering a small family gallery is cheaper and safer than memoizing mutable DTO arrays.
  const gallery = sortProductImages(
    usingFamilyFallback ? rootMember?.images ?? [] : displayProduct?.images ?? [],
  ).map((image) => image.image_url);
  const selectionReady = detailReady && routedMember !== undefined
    && (colorId === null || memberOption(routedMember, 'COLOR')?.attribute_value_id === colorId)
    && (sizeId === null || memberOption(routedMember, 'SIZE')?.attribute_value_id === sizeId);
  const availableQuantity = routedMember?.available_quantity ?? 0;
  const purchasable = routedMember ? memberIsPurchasable(routedMember) : false;

  const addCurrentProductToCart = () => {
    if (!product || !detailReady || !selectionReady || !purchasable
      || quantity < 1 || quantity > availableQuantity || product.status !== 'ACTIVE') return;
    if (!isAuthenticated) {
      showToast('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.');
      navigate('/login', { state: { from: '/products/' + encodeURIComponent(productId) } });
      return;
    }
    addToCart(product.product_id, product.name ?? product.sku, quantity);
  };

  const openRecommendation = (nextProductId: string) => {
    navigate(productDetailPath(nextProductId));
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };

  const moveImage = (offset: -1 | 1) => {
    if (gallery.length <= 1) return;
    setActiveImageIndex((current) => (current + offset + gallery.length) % gallery.length);
  };

  if (!productId) {
    return (
      <div className="min-h-[60vh] bg-[#FFFDF5] p-14 text-center text-sm text-red-700">
        Thiếu mã sản phẩm.
      </div>
    );
  }

  if (loading && (!product || !routedMember)) {
    return (
      <div
        role="status"
        className="min-h-[60vh] bg-[#FFFDF5] p-14 text-center text-sm text-[#687069]"
      >
        Đang tải sản phẩm...
      </div>
    );
  }

  if (error || !product || !displayProduct) {
    return (
      <div className="min-h-[60vh] bg-[#FFFDF5] p-14 text-center">
        <p role="alert" className="text-sm text-red-700">
          {error ?? 'Không tìm thấy sản phẩm hoặc sản phẩm không còn được hiển thị.'}
        </p>
        <button
          type="button"
          onClick={() => setRetry((value) => value + 1)}
          className="mr-3 mt-5 border px-5 py-3 text-sm"
        >
          Thử lại
        </button>
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

  const categoryName =
    product.category &&
    (metadata.data?.categories.find(
      (item) => item.category_id === product.category?.category_id,
    )?.name ??
      product.category.name);
  const brandName =
    product.brand &&
    (metadata.data?.brands.find((item) => item.brand_id === product.brand?.brand_id)?.name ??
      product.brand.name);
  const specItems = [
    product.sku ? { label: 'SKU', value: product.sku } : null,
    categoryName ? { label: 'Danh mục', value: categoryName } : null,
    brandName ? { label: 'Thương hiệu', value: brandName } : null,
    { label: 'Trạng thái', value: product.status },
    ...product.attribute_values
      .filter((value) => value.attribute_code !== 'COLOR' && value.attribute_code !== 'SIZE')
      .map((value) => ({
        label: metadata.data?.attributes.find((attribute) => attribute.id === value.attribute_id)
          ?.name ?? value.attribute_name,
        value: value.label || value.value,
      })),
  ].filter((item): item is { label: string; value: string } => item !== null);
  const displayName = displayProduct.name ?? displayProduct.sku;

  return (
    <div className="w-full bg-white text-[#0B2419]">
      <div className="border-b border-[#E2E5DE] bg-[#F5F6F2] px-4 py-3 sm:px-8">
        <nav
          aria-label="Đường dẫn sản phẩm"
          className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 text-[13px] font-medium text-[#606863]"
        >
          <Link to="/" className="hover:text-[#0B2419]">
            Trang chủ
          </Link>
          <span aria-hidden="true">/</span>
          <Link to="/products">Sản phẩm</Link>
          {detailReady && displayProduct.category && (
            <>
              <span aria-hidden="true">/</span>
              <Link
                to={categoryProductsPath(displayProduct.category.category_id)}
                className="hover:text-[#0B2419]"
              >
                {categoryName ?? displayProduct.category.name}
              </Link>
            </>
          )}
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="min-w-0 font-semibold text-[#0B2419]">
            {displayName}
          </span>
        </nav>
      </div>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-7 sm:px-8 lg:grid-cols-12 lg:gap-10 lg:px-14">
        <div className="space-y-6 lg:col-span-7 xl:col-span-8">
          <ProductGallerySection
            product={displayProduct}
            gallery={gallery}
            activeImageIndex={activeImageIndex}
            onSelectImage={setActiveImageIndex}
            onMoveImage={moveImage}
            onZoom={() => setZoomOpen(true)}
            usingFamilyFallback={usingFamilyFallback}
          />
          <ProductSpecsSection items={detailReady ? specItems : []} />
        </div>
        <ProductPurchasePanel
          product={displayProduct}
          quantity={quantity}
          onQuantityChange={setQuantity}
          onAddToCart={addCurrentProductToCart}
          selectionReady={selectionReady}
          availableQuantity={availableQuantity}
          purchasable={purchasable}
        >
          {loading && !detailReady && (
            <p role="status" className="text-xs text-[#687069]">
              Đang cập nhật thông tin Product được chọn...
            </p>
          )}
          <ProductFamilySelector
            family={product.family}
            currentProductId={displayProduct.product_id}
            colorId={colorId}
            sizeId={sizeId}
            onSelectOption={selectFamilyOption}
            onSelectProduct={openFamilyProduct}
          />
        </ProductPurchasePanel>
      </section>

      <ProductLongDescription description={detailReady ? displayProduct.description : null} />

      {zoomOpen && (
        <StorefrontDialog
          name="Ảnh sản phẩm"
          onClose={() => setZoomOpen(false)}
          className="product-zoom-dialog"
        >
          <div
            className="p-4"
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault();
                moveImage(event.key === 'ArrowLeft' ? -1 : 1);
              }
            }}
          >
            <header className="mb-3 flex items-center justify-between gap-3">
              <p role="status" className="text-sm">
                Ảnh {activeImageIndex + 1} / {gallery.length}
              </p>
              <button
                autoFocus
                type="button"
                onClick={() => setZoomOpen(false)}
                className="min-h-11 border px-4"
              >
                Đóng ảnh
              </button>
            </header>
            <StorefrontImage
              src={gallery[activeImageIndex] ?? ''}
              alt={displayName}
              loading="eager"
              className="max-h-[66dvh] w-full object-contain"
            />
            {gallery.length > 1 && (
              <nav
                aria-label="Chuyển ảnh phóng to"
                className="mt-3 flex justify-between gap-3"
              >
                <button
                  type="button"
                  onClick={() => moveImage(-1)}
                  className="min-h-11 border px-4"
                >
                  Ảnh trước
                </button>
                <button
                  type="button"
                  onClick={() => moveImage(1)}
                  className="min-h-11 border px-4"
                >
                  Ảnh tiếp theo
                </button>
              </nav>
            )}
          </div>
        </StorefrontDialog>
      )}

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
