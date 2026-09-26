export interface ProductDto {
  product_id: number;
  name: string;
  base_price: number;
  sale_status: string;
}

export interface CatalogService {
  getProducts(): Promise<ProductDto[]>;
}
