import type { PaginationMeta } from '../../../types/api';

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type CatalogEntityStatus = 'ACTIVE' | 'INACTIVE';
export type AttributeValueType = 'OPTION' | 'TEXT' | 'NUMBER' | 'BOOLEAN';

export interface CategoryDto {
  category_id: number;
  parent_category_id: number | null;
  name: string;
  slug: string | null;
  status: CatalogEntityStatus;
}

export interface BrandDto {
  brand_id: number;
  name: string;
  slug: string | null;
  status: CatalogEntityStatus;
}

export interface AttributeTypeDto {
  id: number;
  code: AttributeValueType;
  name: string;
  data_type: AttributeValueType;
}

export interface AttributeOptionDto {
  id: number;
  attribute_id: number;
  value: string;
  label: string;
  sort_order: number;
}

export interface AttributeDto {
  id: number;
  code: string;
  name: string;
  data_type: AttributeValueType;
  is_required: boolean;
  is_variant_defining: boolean;
  sort_order: number;
  options: AttributeOptionDto[];
}

export interface ProductAttributeValueDto {
  attribute_id: number;
  attribute_code: string;
  attribute_name: string;
  data_type: AttributeValueType;
  option_id: number | null;
  option_value: string | null;
  option_label: string | null;
  text_value: string | null;
  number_value: number | null;
  boolean_value: boolean | null;
}

export interface ProductAttributeValueInput {
  attribute_id: number;
  option_id?: number | null;
  text_value?: string | null;
  number_value?: number | null;
  boolean_value?: boolean | null;
}

export interface CatalogMetaDto {
  categories: CategoryDto[];
  brands: BrandDto[];
  attribute_types: AttributeTypeDto[];
  attributes: AttributeDto[];
}

export interface AdminCatalogMetaDto {
  attribute_types: AttributeTypeDto[];
  attributes: AttributeDto[];
}

export interface ProductImageDto {
  id: number;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface ProductImageInput {
  image_url: string;
  sort_order: number;
}

export interface ProductImageOrderInput {
  image_id: number;
  sort_order: number;
}

export interface ProductSummaryDto {
  product_id: number;
  parent_product_id: number | null;
  sku: string;
  name: string | null;
  slug: string | null;
  thumbnail: string | null;
  category: CategoryDto | null;
  brand: BrandDto | null;
  selling_price: number;
  status: ProductStatus;
}

export interface ProductDetailDto {
  product_id: number;
  parent_product_id: number | null;
  sku: string;
  name: string | null;
  slug: string | null;
  description: string | null;
  category: CategoryDto | null;
  brand: BrandDto | null;
  selling_price: number;
  status: ProductStatus;
  images: ProductImageDto[];
  created_at: string;
  updated_at: string;
  attribute_values: ProductAttributeValueDto[];
}

export interface AdminProductSummaryDto {
  product_id: number;
  parent_product_id: number | null;
  sku: string;
  name: string | null;
  thumbnail: string | null;
  category_id: number | null;
  brand_id: number | null;
  selling_price: number;
  cost_price: number | null;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

export interface AdminProductRelationDto {
  product_id: number;
  parent_product_id: number | null;
  sku: string;
  name: string | null;
  slug: string | null;
  description: string | null;
  category: CategoryDto | null;
  brand: BrandDto | null;
  category_id: number | null;
  brand_id: number | null;
  selling_price: number;
  cost_price: number | null;
  status: ProductStatus;
  attribute_values: ProductAttributeValueDto[];
  images: ProductImageDto[];
  created_at: string;
  updated_at: string;
}

export interface AdminProductDetailDto {
  product_id: number;
  parent_product_id: number | null;
  child_product_ids: number[];
  sku: string;
  name: string | null;
  slug: string | null;
  description: string | null;
  category: CategoryDto | null;
  brand: BrandDto | null;
  category_id: number | null;
  brand_id: number | null;
  selling_price: number;
  cost_price: number | null;
  status: ProductStatus;
  images: ProductImageDto[];
  created_at: string;
  updated_at: string;
  attribute_values: ProductAttributeValueDto[];
  parent_product: AdminProductRelationDto | null;
  children: AdminProductRelationDto[];
}

export interface ProductCreateInput {
  parent_product_id?: number | null;
  category_id?: number | null;
  brand_id?: number | null;
  name?: string | null;
  slug?: string | null;
  sku: string;
  description?: string | null;
  selling_price: number;
  cost_price?: number | null;
  status?: ProductStatus;
  attribute_values?: ProductAttributeValueInput[];
}

export interface ProductPatchInput {
  parent_product_id?: number | null;
  category_id?: number | null;
  brand_id?: number | null;
  name?: string | null;
  slug?: string | null;
  sku?: string;
  description?: string | null;
  selling_price?: number;
  cost_price?: number | null;
  status?: ProductStatus;
  images?: ProductImageInput[];
  /**
   * When sent, this replaces the complete set of product attribute values.
   * Omit this property when attribute values have not changed.
   */
  attribute_values?: ProductAttributeValueInput[];
}

export interface AdminProductQuery {
  q?: string;
  category_id?: number;
  brand_id?: number;
  parent_product_id?: number;
  status?: ProductStatus;
  page?: number;
  page_size?: number;
}

export interface CategoryCreateInput {
  parent_category_id?: number | null;
  name: string;
  status?: CatalogEntityStatus;
}

export interface CategoryPatchInput {
  parent_category_id?: number | null;
  name?: string;
  status?: CatalogEntityStatus;
}

export interface BrandInput {
  name: string;
  status?: CatalogEntityStatus;
}

export type BrandPatchInput = Partial<BrandInput>;

export interface AttributeCreateInput {
  attribute_type_id: number;
  code: string;
  name: string;
  is_required: boolean;
  is_variant_defining?: boolean;
  sort_order?: number;
}

export interface AttributePatchInput {
  name?: string;
  is_required?: boolean;
  is_variant_defining?: boolean;
  sort_order?: number;
}

export interface AttributeOptionCreateInput {
  value: string;
  label: string;
  sort_order?: number;
}

export interface AttributeOptionPatchInput {
  label?: string;
  sort_order?: number;
}

export interface CatalogProductView {
  id: string;
  product_id: number;
  sku: string;
  name: string;
  category: string;
  brand: string;
  selling_price: number;
  status: ProductStatus;
  imageUrl: string;
  slug: string | null;
}

export interface CatalogProductQuery {
  q?: string;
  category_id?: number;
  brand_id?: number;
  min_price?: number;
  max_price?: number;
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
