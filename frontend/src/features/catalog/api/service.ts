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
  imageUrl: imageOrEmpty(product.thumbnail),
  galleryImages: product.thumbnail ? [imageOrEmpty(product.thumbnail)] : [],
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

const normalizeDetailImages = (product: ProductDetailDto): ProductDetailDto => ({
  ...product,
  images: product.images.map((image) => ({
    ...image,
    image_url: resolveImageUrl(image.image_url) ?? image.image_url,
  })),
});

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
  async getProductDetail(productId) {
    const response = await apiClient.get<
      ApiResponse<ProductDetailDto>,
      ApiResponse<ProductDetailDto>
    >(`/catalog/products/${productId}`);
    return normalizeDetailImages(response.data);
  },
  async getMeta() {
    const response = await apiClient.get<
      ApiResponse<CatalogMetaDto>,
      ApiResponse<CatalogMetaDto>
    >('/catalog/meta');
    return response.data;
  },
};
