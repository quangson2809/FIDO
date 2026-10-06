import type { ApiResponse } from '../../../types/api';
import { apiClient } from '../../../services/http/apiClient';
import type {
  BrandDto,
  BrandInput,
  CatalogMetaDto,
  CategoryCreateInput,
  CategoryDto,
  CategoryPatchInput,
  ColorCreateInput,
  ColorDto,
  ColorPatchInput,
  SizeSystemCreateInput,
  SizeSystemDto,
  SizeSystemPatchInput,
} from '../types';

const unwrap = <T>(request: Promise<ApiResponse<T>>): Promise<T> => request.then((response) => response.data);

export const adminCatalogMetaService = {
  getMeta(): Promise<CatalogMetaDto> {
    return unwrap(apiClient.get<ApiResponse<CatalogMetaDto>, ApiResponse<CatalogMetaDto>>('/admin/catalog/meta'));
  },
  createCategory(input: CategoryCreateInput): Promise<CategoryDto> {
    return unwrap(apiClient.post<ApiResponse<CategoryDto>, ApiResponse<CategoryDto>>('/admin/categories', input));
  },
  updateCategory(id: number, input: CategoryPatchInput): Promise<CategoryDto> {
    return unwrap(apiClient.patch<ApiResponse<CategoryDto>, ApiResponse<CategoryDto>>(`/admin/categories/${id}`, input));
  },
  async deleteCategory(id: number): Promise<void> {
    await apiClient.delete(`/admin/categories/${id}`);
  },
  createBrand(input: BrandInput): Promise<BrandDto> {
    return unwrap(apiClient.post<ApiResponse<BrandDto>, ApiResponse<BrandDto>>('/admin/brands', input));
  },
  updateBrand(id: number, input: BrandInput): Promise<BrandDto> {
    return unwrap(apiClient.patch<ApiResponse<BrandDto>, ApiResponse<BrandDto>>(`/admin/brands/${id}`, input));
  },
  async deleteBrand(id: number): Promise<void> {
    await apiClient.delete(`/admin/brands/${id}`);
  },
  createColor(input: ColorCreateInput): Promise<ColorDto> {
    return unwrap(apiClient.post<ApiResponse<ColorDto>, ApiResponse<ColorDto>>('/admin/colors', input));
  },
  updateColor(id: number, input: ColorPatchInput): Promise<ColorDto> {
    return unwrap(apiClient.patch<ApiResponse<ColorDto>, ApiResponse<ColorDto>>(`/admin/colors/${id}`, input));
  },
  async deleteColor(id: number): Promise<void> {
    await apiClient.delete(`/admin/colors/${id}`);
  },
  createSizeSystem(input: SizeSystemCreateInput): Promise<SizeSystemDto> {
    return unwrap(apiClient.post<ApiResponse<SizeSystemDto>, ApiResponse<SizeSystemDto>>('/admin/size-systems', input));
  },
  updateSizeSystem(id: number, input: SizeSystemPatchInput): Promise<SizeSystemDto> {
    return unwrap(apiClient.patch<ApiResponse<SizeSystemDto>, ApiResponse<SizeSystemDto>>(`/admin/size-systems/${id}`, input));
  },
  async deleteSizeSystem(id: number): Promise<void> {
    await apiClient.delete(`/admin/size-systems/${id}`);
  },
};
