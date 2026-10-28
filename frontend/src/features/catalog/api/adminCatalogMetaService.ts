import type { ApiResponse } from '../../../types/api';
import { apiClient } from '../../../services/http/apiClient';
import type {
  AdminCatalogMetaDto,
  AttributeCreateInput,
  AttributeDto,
  AttributeOptionCreateInput,
  AttributeOptionDto,
  AttributeOptionPatchInput,
  AttributePatchInput,
  BrandDto,
  BrandInput,
  BrandPatchInput,
  CategoryCreateInput,
  CategoryDto,
  CategoryPatchInput,
} from '../types';

const unwrap = <T>(request: Promise<ApiResponse<T>>): Promise<T> =>
  request.then((response) => response.data);

export const adminCatalogMetaService = {
  getMeta(): Promise<AdminCatalogMetaDto> {
    return unwrap(apiClient.get<ApiResponse<AdminCatalogMetaDto>>('/admin/catalog/meta'));
  },

  createAttribute(input: AttributeCreateInput): Promise<AttributeDto> {
    return unwrap(
      apiClient.post<ApiResponse<AttributeDto>>('/admin/catalog/attributes', input),
    );
  },

  updateAttribute(id: number, input: AttributePatchInput): Promise<AttributeDto> {
    return unwrap(
      apiClient.patch<ApiResponse<AttributeDto>>(`/admin/catalog/attributes/${id}`, input),
    );
  },

  createAttributeOption(
    attributeId: number,
    input: AttributeOptionCreateInput,
  ): Promise<AttributeOptionDto> {
    return unwrap(
      apiClient.post<ApiResponse<AttributeOptionDto>>(
        `/admin/catalog/attributes/${attributeId}/options`,
        input,
      ),
    );
  },

  updateAttributeOption(
    attributeId: number,
    optionId: number,
    input: AttributeOptionPatchInput,
  ): Promise<AttributeOptionDto> {
    return unwrap(
      apiClient.patch<ApiResponse<AttributeOptionDto>>(
        `/admin/catalog/attributes/${attributeId}/options/${optionId}`,
        input,
      ),
    );
  },

  createCategory(input: CategoryCreateInput): Promise<CategoryDto> {
    return unwrap(apiClient.post<ApiResponse<CategoryDto>>('/admin/categories', input));
  },

  updateCategory(id: number, input: CategoryPatchInput): Promise<CategoryDto> {
    return unwrap(apiClient.patch<ApiResponse<CategoryDto>>(`/admin/categories/${id}`, input));
  },

  async deleteCategory(id: number): Promise<void> {
    await apiClient.delete<void>(`/admin/categories/${id}`);
  },

  createBrand(input: BrandInput): Promise<BrandDto> {
    return unwrap(apiClient.post<ApiResponse<BrandDto>>('/admin/brands', input));
  },

  updateBrand(id: number, input: BrandPatchInput): Promise<BrandDto> {
    return unwrap(apiClient.patch<ApiResponse<BrandDto>>(`/admin/brands/${id}`, input));
  },

  async deleteBrand(id: number): Promise<void> {
    await apiClient.delete<void>(`/admin/brands/${id}`);
  },
};
