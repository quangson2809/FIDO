import { apiClient } from '../../../services/http/apiClient';
import type { ApiResponse } from '../../../types/api';
export interface StocktakeLine { product_id: number; expected_quantity: number; counted_quantity: number; expected_version: number; difference: number }
export interface Stocktake { id: number; warehouse_id: number; status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED'; reason: string; created_by: number; confirmed_by: number | null; created_at: string; confirmed_at: string | null; items: StocktakeLine[] }
export interface CorrectionLine { receipt_item_id: number; before_quantity: number; corrected_quantity: number; before_unit_cost: number; corrected_unit_cost: number; quantity_delta: number; value_delta: number }
export interface ReceiptCorrection { id: number; goods_receipt_id: number; source_operation_id: string; reason: string; created_by: number; created_at: string; items: CorrectionLine[] }
export const operationsService = {
  async counts() { return (await apiClient.get<ApiResponse<Stocktake[]>>('/admin/stocktakes')).data; },
  async createCount(input: { source_operation_id: string; reason: string; items: { product_id: number; counted_quantity: number; expected_version: number }[] }) { return (await apiClient.post<ApiResponse<Stocktake>>('/admin/stocktakes', input)).data; },
  async countAction(id: number, action: 'CONFIRM' | 'CANCEL') { return (await apiClient.post<ApiResponse<Stocktake>>(`/admin/stocktakes/${id}/actions`, { action })).data; },
  async corrections(id: number) { return (await apiClient.get<ApiResponse<ReceiptCorrection[]>>(`/admin/goods-receipts/${id}/corrections`)).data; },
  async correct(id: number, input: { source_operation_id: string; expected_correction_id: number | null; reason: string; items: { receipt_item_id: number; corrected_quantity: number; corrected_unit_cost: number }[] }) { return (await apiClient.post<ApiResponse<ReceiptCorrection>>(`/admin/goods-receipts/${id}/corrections`, input)).data; },
};
