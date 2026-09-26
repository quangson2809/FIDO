import { CatalogService, ProductDetailDto, ProductSummaryDto, CatalogMetaDto } from '../types';
import { mockCatalogMeta, mockProductDetails } from '../../../mocks/apiData';
import { apiClient } from '../../../services/http/apiClient';
import { API_MODE } from '../../../constants/app';

const mockCatalogService: CatalogService = {
  async getProducts() {
    return mockProductDetails;
  },
  async getProductById(productId) {
    const product = mockProductDetails.find((item) => item.product_id === productId);
    if (!product) throw new Error(`Mock product ${productId} not found`);
    return product;
  },
  async getMeta() {
    return mockCatalogMeta;
  },
};

const realCatalogService: CatalogService = {
  async getProducts() {
    const response = await apiClient.get<{ data: ProductSummaryDto[] }, { data: ProductSummaryDto[] }>('/catalog/products');
    return Promise.all(response.data.map((item) =>
      apiClient
        .get<{ data: ProductDetailDto }, { data: ProductDetailDto }>(`/catalog/products/${item.product_id}`)
        .then((detail) => detail.data),
    ));
  },
  async getProductById(productId) {
    const response = await apiClient.get<{ data: ProductDetailDto }, { data: ProductDetailDto }>(`/catalog/products/${productId}`);
    return response.data;
  },
  async getMeta() {
    const response = await apiClient.get<{ data: CatalogMetaDto }, { data: CatalogMetaDto }>('/catalog/meta');
    return response.data;
  },
};

export const catalogService = API_MODE === 'mock' ? mockCatalogService : realCatalogService;
