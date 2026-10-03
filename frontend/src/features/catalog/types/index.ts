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
}

export interface ProductVariantDto {
  variant_id: number;
  size: SizeValueDto;
  color: ColorDto;
  sku: string | null;
  effective_price: number;
  sale_status: string;
  available_quantity: number;
}

export interface ProductSummaryDto {
  product_id: number;
  name: string;
  image_url: string | null;
  category: CategoryDto;
  brand: BrandDto | null;
  base_price: number;
  sale_status: string;
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
  sale_status: string;
  images: ProductImageDto[];
  variants: ProductVariantDto[];
}

export interface CatalogProductView {
  id: string;
  product_id: number;
  sku: string;
  name: string;
  category: string;
  parentCategory: string;
  brand: string;
  price: number;
  base_price: number;
  originalPrice?: number;
  imageUrl: string;
  galleryImages: string[];
  statusBadge?: string;
  description: string;
  fabric: string;
  colors: Array<{ name: string; hex: string }>;
  sizes: Array<string | number>;
  variants: ProductVariantDto[];
  rating: number;
  reviewsCount: number;
  inStockCount: number;
  sale_status: string;
}

export interface CatalogService {
  getProducts(): Promise<CatalogProductView[]>;
  getProductDetail(productId: number | string): Promise<CatalogProductView>;
  getMeta(): Promise<CatalogMetaDto>;
}

export interface ProductCreateVariantInput {
  size_value_id: number;
  color_id: number;
  sku?: string | null;
  override_price?: number | null;
  sale_status: string;
}

export interface ProductCreateImageInput {
  image_url: string;
  alt_text?: string | null;
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
  sale_status: string;
  images?: ProductCreateImageInput[];
  variants?: ProductCreateVariantInput[];
}

export interface AdminProductSummaryDto {
  product_id: number;
  name: string;
  image_url: string | null;
  category_id: number;
  brand_id: number | null;
  size_system_id: number;
  base_price: number;
  sale_status: string;
  created_at: string;
  updated_at: string;
}

export interface AdminProductDetailDto extends ProductDetailDto {
  category_id: number;
  brand_id: number | null;
  size_system_id: number;
  created_at: string;
  updated_at: string;
}
