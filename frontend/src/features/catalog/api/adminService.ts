import type { ApiListResponse, ApiResponse } from '../../../types/api';
import { apiClient } from '../../../services/http/apiClient';
import type {
  AdminProductDetailDto,
  AdminProductQuery,
  AdminProductSummaryDto,
  AdminVariantDto,
  ProductCreateInput,
  ProductCreateVariantInput,
  ProductPatchInput,
  VariantPatchInput,
} from '../types';

const withoutJsonImages = (product: ProductCreateInput): ProductCreateInput => {
  const metadata = { ...product };
  delete metadata.images;
  return metadata;
};

export const adminProductService = {
  async getProducts(query: AdminProductQuery = {}): Promise<ApiListResponse<AdminProductSummaryDto>> {
    return apiClient.get<
      ApiListResponse<AdminProductSummaryDto>,
      ApiListResponse<AdminProductSummaryDto>
    >('/admin/products', { params: query });
  },

  async getProduct(productId: number): Promise<AdminProductDetailDto> {
    const response = await apiClient.get<
      ApiResponse<AdminProductDetailDto>,
      ApiResponse<AdminProductDetailDto>
    >(`/admin/products/${productId}`);
    return response.data;
  },

  async createProductJson(product: ProductCreateInput): Promise<AdminProductDetailDto> {
    const response = await apiClient.post<
      ApiResponse<AdminProductDetailDto>,
      ApiResponse<AdminProductDetailDto>
    >('/admin/products', product);
    return response.data;
  },

  async createProductWithImages(
    product: ProductCreateInput,
    imageFiles: readonly File[],
  ): Promise<AdminProductDetailDto> {
    const form = new FormData();
    form.append(
      'product',
      new Blob([JSON.stringify(withoutJsonImages(product))], { type: 'application/json' }),
    );
    imageFiles.forEach((image) => form.append('images', image));

    const response = await apiClient.post<
      ApiResponse<AdminProductDetailDto>,
      ApiResponse<AdminProductDetailDto>
    >('/admin/products', form);
    return response.data;
  },

  async updateProduct(productId: number, input: ProductPatchInput): Promise<AdminProductDetailDto> {
    const response = await apiClient.patch<
      ApiResponse<AdminProductDetailDto>,
      ApiResponse<AdminProductDetailDto>
    >(`/admin/products/${productId}`, input);
    return response.data;
  },

  async createVariants(productId: number, variants: ProductCreateVariantInput[]): Promise<AdminVariantDto[]> {
    const response = await apiClient.post<
      ApiResponse<AdminVariantDto[]>,
      ApiResponse<AdminVariantDto[]>
    >(`/admin/products/${productId}/variants`, { variants });
    return response.data;
  },

  async updateVariant(productId: number, variantId: number, input: VariantPatchInput): Promise<AdminVariantDto> {
    const response = await apiClient.patch<
      ApiResponse<AdminVariantDto>,
      ApiResponse<AdminVariantDto>
    >(`/admin/products/${productId}/variants/${variantId}`, input);
    return response.data;
  },
};
