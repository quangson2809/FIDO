import type { ApiListResponse, ApiResponse } from '../../../types/api';
import { apiClient } from '../../../services/http/apiClient';
import type {
  AdminProductDetailDto,
  AdminProductQuery,
  AdminProductSummaryDto,
  ProductCreateInput,
  ProductImageOrderInput,
  ProductPatchInput,
} from '../types';

const createProduct = async (product: ProductCreateInput): Promise<AdminProductDetailDto> => {
  const response = await apiClient.post<ApiResponse<AdminProductDetailDto>>(
    '/admin/products',
    product,
  );
  return response.data;
};

const uploadImages = async (
  productId: number,
  imageFiles: readonly File[],
): Promise<AdminProductDetailDto> => {
  const form = new FormData();
  imageFiles.forEach((image) => form.append('images', image));

  const response = await apiClient.post<ApiResponse<AdminProductDetailDto>>(
    `/admin/products/${productId}/images`,
    form,
  );
  return response.data;
};

export const adminProductService = {
  async getProducts(
    query: AdminProductQuery = {},
  ): Promise<ApiListResponse<AdminProductSummaryDto>> {
    return apiClient.get<ApiListResponse<AdminProductSummaryDto>>('/admin/products', {
      params: query,
    });
  },

  async getProduct(productId: number): Promise<AdminProductDetailDto> {
    const response = await apiClient.get<ApiResponse<AdminProductDetailDto>>(
      `/admin/products/${productId}`,
    );
    return response.data;
  },

  createProduct,

  async updateProduct(productId: number, input: ProductPatchInput): Promise<AdminProductDetailDto> {
    const response = await apiClient.patch<ApiResponse<AdminProductDetailDto>>(
      `/admin/products/${productId}`,
      input,
    );
    return response.data;
  },

  deleteProduct(productId: number): Promise<void> {
    return apiClient.delete<void>(`/admin/products/${productId}`);
  },

  uploadImages,

  async reorderImages(
    productId: number,
    images: ProductImageOrderInput[],
  ): Promise<AdminProductDetailDto> {
    const response = await apiClient.patch<ApiResponse<AdminProductDetailDto>>(
      `/admin/products/${productId}/images`,
      { images },
    );
    return response.data;
  },

  async deleteImage(productId: number, imageId: number): Promise<void> {
    await apiClient.delete<void>(`/admin/products/${productId}/images/${imageId}`);
  },
};
