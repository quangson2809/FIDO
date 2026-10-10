import type { ApiListResponse, ApiResponse } from '../../../types/api';
import { apiClient } from '../../../services/http/apiClient';
import { sortProductImages } from '../model/productImageOrder';
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
  name: product.name,
  category: product.category.name,
  brand: product.brand?.name ?? '',
  base_price: product.base_price,
  imageUrl: imageOrEmpty(product.thumbnail),
  sale_status: product.sale_status,
});

const normalizeDetailImages = (product: ProductDetailDto): ProductDetailDto => ({
  ...product,
  images: sortProductImages(product.images).map((image) => ({
    ...image,
    image_url: resolveImageUrl(image.image_url) ?? image.image_url,
  })),
});

const loadProductPage = async (query: CatalogProductQuery = {}): Promise<CatalogProductPage> => {
  const response = await apiClient.get<ApiListResponse<ProductSummaryDto>>('/catalog/products', { params: query });

  return {
    items: response.data.map(summaryToView),
    meta: response.meta,
  };
};

export const catalogService: CatalogService = {
  listProducts: loadProductPage,
  async getProductDetail(productId) {
    const response = await apiClient.get<ApiResponse<ProductDetailDto>>(`/catalog/products/${productId}`);
    return normalizeDetailImages(response.data);
  },
  async getMeta() {
    const response = await apiClient.get<ApiResponse<CatalogMetaDto>>('/catalog/meta');
    return response.data;
  },
};
