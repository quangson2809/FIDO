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
import type { ProductDetailDto } from '../features/catalog/types';
import { ProductFamilySelector } from '../features/catalog/components/ProductFamilySelector';
import {
  matchingFamilyMembers,
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
    if (nextProductId !== product?.product_id) {
      navigate(productDetailPath(nextProductId));
    }
  };

  const selectFamilyOption = (code: FamilyOptionCode, optionId: number) => {
    if (!product) return;
    let nextColor = code === 'COLOR' ? optionId : colorId;
    let nextSize = code === 'SIZE' ? optionId : sizeId;
    let matches = matchingFamilyMembers(product.family.members, nextColor, nextSize);
    if (matches.length === 0) {
      // Color/size choices are independent; reset the incompatible opposite axis.
      if (code === 'COLOR') nextSize = null;
      else nextColor = null;
      matches = matchingFamilyMembers(product.family.members, nextColor, nextSize);
    }
    setColorId(nextColor);
    setSizeId(nextSize);
    if (matches.length === 1) openFamilyProduct(matches[0].product_id);
  };

  const gallery = useMemo(
    () => sortProductImages(product?.images ?? []).map((image) => image.image_url),
    [product],
  );

  const addCurrentProductToCart = () => {
    if (!product || product.status !== 'ACTIVE') return;
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

  if (loading) {
    return (
      <div
        role="status"
        className="min-h-[60vh] bg-[#FFFDF5] p-14 text-center text-sm text-[#687069]"
      >
        Đang tải sản phẩm...
      </div>
    );
  }

  if (error || !product) {
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
  const displayName = product.name ?? product.sku;
  const familyMember = product.family.members.find(
    (member) => member.product_id === product.product_id,
  );
  const selectionReady = familyMember !== undefined
    && (colorId === null || memberOption(familyMember, 'COLOR')?.attribute_value_id === colorId)
    && (sizeId === null || memberOption(familyMember, 'SIZE')?.attribute_value_id === sizeId);

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
          {product.category && (
            <>
              <span aria-hidden="true">/</span>
              <Link
                to={categoryProductsPath(product.category.category_id)}
                className="hover:text-[#0B2419]"
              >
                {categoryName ?? product.category.name}
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
            product={product}
            gallery={gallery}
            activeImageIndex={activeImageIndex}
            onSelectImage={setActiveImageIndex}
            onMoveImage={moveImage}
            onZoom={() => setZoomOpen(true)}
          />
          <ProductSpecsSection items={specItems} />
        </div>
        <ProductPurchasePanel
          product={product}
          quantity={quantity}
          onQuantityChange={setQuantity}
          onAddToCart={addCurrentProductToCart}
          selectionReady={selectionReady}
        >
          <ProductFamilySelector
            family={product.family}
            currentProductId={product.product_id}
            colorId={colorId}
            sizeId={sizeId}
            onSelectOption={selectFamilyOption}
            onSelectProduct={openFamilyProduct}
          />
        </ProductPurchasePanel>
      </section>

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
