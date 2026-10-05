import type { ApiListResponse, ApiResponse } from '../../../types/api';
import { apiClient } from '../../../services/http/apiClient';
import { resolveImageUrl } from '../../../services/media/imageUrl';
import type {
  CatalogMetaDto,
  CatalogProductPage,
  CatalogProductQuery,
  CatalogProductView,
  CatalogService,
  ProductDetailDto,
  ProductSummaryDto,
} from '../types';

const imageOrEmpty = (value?: string | null): string => resolveImageUrl(value) ?? '';

const summaryToView = (product: ProductSummaryDto): CatalogProductView => ({
  id: String(product.product_id),
  product_id: product.product_id,
  sku: '',
  name: product.name,
  category: product.category.name,
  parentCategory: product.category.name,
  brand: product.brand?.name ?? '',
  price: product.base_price,
  base_price: product.base_price,
  imageUrl: imageOrEmpty(product.image_url),
  galleryImages: product.image_url ? [imageOrEmpty(product.image_url)] : [],
  description: '',
  fabric: '',
  colors: [],
  sizes: [],
  variants: [],
  rating: 0,
  reviewsCount: 0,
  inStockCount: 0,
  sale_status: product.sale_status,
});

const detailToView = (product: ProductDetailDto): CatalogProductView => {
  const imageUrls = product.images
    .map((image) => resolveImageUrl(image.image_url))
    .filter((value): value is string => Boolean(value));
  const sizes = [...new Set(product.variants.map((variant) => variant.size.display_name))];
  const colors = [...new Map(
    product.variants.map((variant) => [
      variant.color.color_id,
      { name: variant.color.name, hex: 'transparent' },
    ]),
  ).values()];
  const firstVariant = product.variants[0];

  return {
    id: String(product.product_id),
    product_id: product.product_id,
    sku: firstVariant?.sku ?? '',
    name: product.name,
    category: product.category.name,
    parentCategory: product.category.name,
    brand: product.brand?.name ?? '',
    price: product.base_price,
    base_price: product.base_price,
    imageUrl: imageUrls[0] ?? '',
    galleryImages: imageUrls,
    description: product.description ?? '',
    fabric: product.material_care ?? '',
    colors,
    sizes,
    variants: product.variants,
    rating: 0,
    reviewsCount: 0,
    inStockCount: product.variants.reduce(
      (sum, variant) => sum + variant.available_quantity,
      0,
    ),
    sale_status: product.sale_status,
  };
};

const loadProductPage = async (query: CatalogProductQuery = {}): Promise<CatalogProductPage> => {
  const response = await apiClient.get<
    ApiListResponse<ProductSummaryDto>,
    ApiListResponse<ProductSummaryDto>
  >('/catalog/products', { params: query });

  return {
    items: response.data.map(summaryToView),
    meta: response.meta,
  };
};

export const catalogService: CatalogService = {
  listProducts: loadProductPage,
  async getProducts() {
    return (await loadProductPage()).items;
  },
  async getProductDetail(productId) {
    const response = await apiClient.get<
      ApiResponse<ProductDetailDto>,
      ApiResponse<ProductDetailDto>
    >(`/catalog/products/${productId}`);
    return detailToView(response.data);
  },
  async getMeta() {
    const response = await apiClient.get<
      ApiResponse<CatalogMetaDto>,
      ApiResponse<CatalogMetaDto>
    >('/catalog/meta');
    return response.data;
  },
};
