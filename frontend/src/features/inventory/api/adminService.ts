import type { ApiListResponse, ApiResponse } from '../../../types/api';
import { apiClient } from '../../../services/http/apiClient';
import type {
  GoodsReceiptAction,
  GoodsReceiptCreateInput,
  GoodsReceiptDetailDto,
  GoodsReceiptPatchInput,
  GoodsReceiptQuery,
  GoodsReceiptSummaryDto,
  InventoryAdjustmentInput,
  InventoryQuery,
  InventoryRowDto,
  InventoryTransactionDto,
  InventoryTransactionQuery,
  SupplierCreateInput,
  SupplierDto,
  SupplierPatchInput,
  SupplierQuery,
} from '../types';

export const inventoryAdminService = {
  listInventory(query: InventoryQuery = {}) {
    return apiClient.get<ApiListResponse<InventoryRowDto>>(
      '/admin/inventory',
      { params: query },
    );
  },

  async adjustInventory(input: InventoryAdjustmentInput): Promise<InventoryTransactionDto> {
    const response = await apiClient.post<ApiResponse<InventoryTransactionDto>>('/admin/inventory/adjustments', input);
    return response.data;
  },

  listTransactions(query: InventoryTransactionQuery = {}) {
    return apiClient.get<ApiListResponse<InventoryTransactionDto>>('/admin/inventory/transactions', { params: query });
  },

  listSuppliers(query: SupplierQuery = {}) {
    return apiClient.get<ApiListResponse<SupplierDto>>(
      '/admin/suppliers',
      { params: query },
    );
  },

  async getSupplier(supplierId: number): Promise<SupplierDto> {
    const response = await apiClient.get<ApiResponse<SupplierDto>>(
      `/admin/suppliers/${supplierId}`,
    );
    return response.data;
  },

  async createSupplier(input: SupplierCreateInput): Promise<SupplierDto> {
    const response = await apiClient.post<ApiResponse<SupplierDto>>(
      '/admin/suppliers',
      input,
    );
    return response.data;
  },

  async updateSupplier(supplierId: number, input: SupplierPatchInput): Promise<SupplierDto> {
    const response = await apiClient.patch<ApiResponse<SupplierDto>>(
      `/admin/suppliers/${supplierId}`,
      input,
    );
    return response.data;
  },

  listReceipts(query: GoodsReceiptQuery = {}) {
    return apiClient.get<ApiListResponse<GoodsReceiptSummaryDto>>('/admin/goods-receipts', { params: query });
  },

  async getReceipt(receiptId: number): Promise<GoodsReceiptDetailDto> {
    const response = await apiClient.get<ApiResponse<GoodsReceiptDetailDto>>(`/admin/goods-receipts/${receiptId}`);
    return response.data;
  },

  async createReceipt(input: GoodsReceiptCreateInput): Promise<GoodsReceiptDetailDto> {
    const response = await apiClient.post<ApiResponse<GoodsReceiptDetailDto>>('/admin/goods-receipts', input);
    return response.data;
  },

  async updateReceipt(receiptId: number, input: GoodsReceiptPatchInput): Promise<GoodsReceiptDetailDto> {
    const response = await apiClient.patch<ApiResponse<GoodsReceiptDetailDto>>(`/admin/goods-receipts/${receiptId}`, input);
    return response.data;
  },

  async receiptAction(receiptId: number, action: GoodsReceiptAction): Promise<GoodsReceiptDetailDto> {
    const response = await apiClient.post<ApiResponse<GoodsReceiptDetailDto>>(`/admin/goods-receipts/${receiptId}/actions`, { action });
    return response.data;
  },
};
