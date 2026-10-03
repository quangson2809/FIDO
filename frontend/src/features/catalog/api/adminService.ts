import type { ApiListResponse, ApiResponse } from '../../../types/api';
import { apiClient } from '../../../services/http/apiClient';
import type {
  AdminProductDetailDto,
  AdminProductSummaryDto,
  ProductCreateInput,
} from '../types';

const withoutJsonImages = (product: ProductCreateInput): ProductCreateInput => {
  const { images: _images, ...metadata } = product;
  return metadata;
};

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
};
