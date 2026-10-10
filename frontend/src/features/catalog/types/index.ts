import type { PaginationMeta } from '../../../types/api';

export type SaleStatus = 'ON_SALE' | 'STOPPED';

export interface CategoryDto {
  category_id: number;
  parent_category_id: number | null;
  name: string;
}

export interface BrandDto {
  brand_id: number;
  name: string;
}

export interface SizeValueDto {
  size_value_id: number;
  size_system_id: number;
  code: string;
  display_name: string;
  sort_order: number;
}

export interface SizeSystemDto {
  size_system_id: number;
  code: string;
  name: string;
  size_values: SizeValueDto[];
}

export interface ColorDto {
  color_id: number;
  code: string;
  name: string;
}

export interface CatalogMetaDto {
  categories: CategoryDto[];
  brands: BrandDto[];
  size_systems: SizeSystemDto[];
  colors: ColorDto[];
  genders: string[];
  seasons: string[];
  styles: string[];
}

export interface ProductImageDto {
  image_id: number;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
}

export interface ProductVariantDto {
  variant_id: number;
  size: SizeValueDto;
  color: ColorDto;
  sku: string | null;
  effective_price: number;
  sale_status: SaleStatus;
  available_quantity: number;
}

export interface ProductSummaryDto {
  product_id: number;
  name: string;
  thumbnail: string | null;
  category: CategoryDto;
  brand: BrandDto | null;
  base_price: number;
  sale_status: SaleStatus;
  material_care?: string | null;
  sizes?: SizeValueDto[];
}

export interface ProductDetailDto {
  product_id: number;
  name: string;
  description: string | null;
  category: CategoryDto;
  brand: BrandDto | null;
  size_system: SizeSystemDto;
  gender: string | null;
  season: string | null;
  style: string | null;
  material_care: string | null;
  base_price: number;
  sale_status: SaleStatus;
  images: ProductImageDto[];
  variants: ProductVariantDto[];
}

export interface CatalogProductView {
  id: string;
  product_id: number;
  name: string;
  category: string;
  brand: string;
  base_price: number;
  imageUrl: string;
  sale_status: SaleStatus;
  materialCare: string | null;
  sizes: readonly SizeValueDto[] | null;
}

export interface CatalogProductQuery {
  q?: string;
  category_id?: number;
  brand_id?: number;
  min_price?: number;
  max_price?: number;
  size_value_id?: number;
  color_id?: number;
  gender?: string;
  season?: string;
  style?: string;
  page?: number;
  page_size?: number;
}

export interface CatalogProductPage {
  items: CatalogProductView[];
  meta: PaginationMeta;
}

export interface CatalogService {
  listProducts(query?: CatalogProductQuery): Promise<CatalogProductPage>;
  getProductDetail(productId: number | string): Promise<ProductDetailDto>;
  getMeta(): Promise<CatalogMetaDto>;
}

export interface ProductCreateVariantInput {
  size_value_id: number;
  color_id: number;
  sku?: string | null;
  override_price?: number | null;
  sale_status: SaleStatus;
}

export interface ProductImageOrderInput {
  image_id: number;
  sort_order: number;
}

export interface ProductCreateInput {
  category_id: number;
  brand_id?: number | null;
  size_system_id: number;
  name: string;
  description?: string | null;
  gender?: string | null;
  season?: string | null;
  style?: string | null;
  material_care?: string | null;
  base_price: number;
  sale_status: SaleStatus;
  variants?: ProductCreateVariantInput[];
}

export interface ProductPatchInput {
  category_id?: number;
  brand_id?: number | null;
  size_system_id?: number;
  name?: string;
  description?: string | null;
  gender?: string | null;
  season?: string | null;
  style?: string | null;
  material_care?: string | null;
  base_price?: number;
  sale_status?: SaleStatus;
}

export interface AdminProductQuery {
  q?: string;
  category_id?: number;
  brand_id?: number;
  size_system_id?: number;
  sale_status?: SaleStatus;
  page?: number;
  page_size?: number;
}

export interface AdminProductSummaryDto {
  product_id: number;
  name: string;
  thumbnail: string | null;
  category_id: number;
  brand_id: number | null;
  size_system_id: number;
  base_price: number;
  sale_status: SaleStatus;
  created_at: string;
  updated_at: string;
}

export interface AdminVariantDto {
  variant_id: number;
  product_id: number;
  size_value_id: number;
  color_id: number;
  sku: string | null;
  override_price: number | null;
  sale_status: SaleStatus;
  available_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface AdminProductDetailDto {
  product_id: number;
  name: string;
  description: string | null;
  category: CategoryDto;
  brand: BrandDto | null;
  size_system: SizeSystemDto;
  gender: string | null;
  season: string | null;
  style: string | null;
  material_care: string | null;
  base_price: number;
  sale_status: SaleStatus;
  images: ProductImageDto[];
  variants: AdminVariantDto[];
  category_id: number;
  brand_id: number | null;
  size_system_id: number;
  created_at: string;
  updated_at: string;
}

export interface VariantPatchInput {
  override_price?: number | null;
  sale_status?: SaleStatus;
}

export interface CategoryCreateInput {
  parent_category_id: number | null;
  name: string;
}

export interface CategoryPatchInput {
  parent_category_id?: number | null;
  name?: string;
}

export interface BrandInput {
  name: string;
}

export interface ColorCreateInput {
  code: string;
  name: string;
}

export interface ColorPatchInput {
  code?: string;
  name?: string;
}

export interface SizeValueCreateInput {
  code: string;
  display_name: string;
  sort_order: number;
}

export interface SizeSystemCreateInput {
  code: string;
  name: string;
  size_values: SizeValueCreateInput[];
}

export interface SizeSystemPatchInput {
  code?: string;
  name?: string;
  size_values?: Array<SizeValueCreateInput & { size_value_id?: number }>;
}
