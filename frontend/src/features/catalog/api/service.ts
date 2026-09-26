import { CatalogService, ProductDto } from '../types';
import { mockProducts } from '../mocks/mockService';
import { apiClient } from '../../../services/http/apiClient';
import { API_MODE } from '../../../constants/app';

const mockCatalogService: CatalogService = {
  async getProducts() { return mockProducts; }
};

const realCatalogService: CatalogService = {
  async getProducts() { return apiClient.get<ProductDto[], ProductDto[]>('/products'); }
};

export const catalogService = API_MODE === 'mock' 
  ? mockCatalogService 
  : realCatalogService;
