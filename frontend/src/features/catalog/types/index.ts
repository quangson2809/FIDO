import { ProductDetailDto, ProductSummaryDto, CatalogMetaDto } from '../../../mocks/apiData';

export type { ProductDetailDto, ProductSummaryDto, CatalogMetaDto };

export interface CatalogService {
  getProducts(): Promise<ProductDetailDto[]>;
  getProductById(productId: number): Promise<ProductDetailDto>;
  getMeta(): Promise<CatalogMetaDto>;
}
