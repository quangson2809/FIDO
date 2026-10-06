import type { ApiListResponse, ApiResponse } from '../../../types/api';
import { apiClient } from '../../../services/http/apiClient';
import type {
  AdminProductDetailDto,
  AdminProductSummaryDto,
  ProductCreateInput,
} from '../types';

export const adminProductService = {
  async getProducts(): Promise<ApiListResponse<AdminProductSummaryDto>> {
    return apiClient.get<
      ApiListResponse<AdminProductSummaryDto>,
      ApiListResponse<AdminProductSummaryDto>
    >('/admin/products');
  },

  async getProduct(productId: number): Promise<AdminProductDetailDto> {
    const response = await apiClient.get<
      ApiResponse<AdminProductDetailDto>,
      ApiResponse<AdminProductDetailDto>
    >(`/admin/products/${productId}`);
    return response.data;
  },

  async createProduct(product: ProductCreateInput): Promise<AdminProductDetailDto> {
    const response = await apiClient.post<
      ApiResponse<AdminProductDetailDto>,
      ApiResponse<AdminProductDetailDto>
    >('/admin/products', product);
    return response.data;
  },

  async uploadProductImages(
    productId: number,
    imageFiles: readonly File[],
  ): Promise<AdminProductDetailDto> {
    const form = new FormData();
    imageFiles.forEach((image) => form.append('images', image));

    const response = await apiClient.post<
      ApiResponse<AdminProductDetailDto>,
      ApiResponse<AdminProductDetailDto>
    >(`/admin/products/${productId}/images`, form);
    return response.data;
  },
};
