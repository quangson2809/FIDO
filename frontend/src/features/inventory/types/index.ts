export type SupplierStatus = 'ACTIVE' | 'INACTIVE';
export type GoodsReceiptStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
export type GoodsReceiptAction = 'CONFIRM' | 'CANCEL';
export type InventoryTransactionType =
  | 'OPENING' | 'GOODS_RECEIPT' | 'ORDER'
  | 'ORDER_CANCEL_REVERSAL' | 'RETURN_RESTOCK' | 'ADJUSTMENT';
export type InventoryAdjustmentReasonCode =
  | 'COUNT_CORRECTION' | 'DAMAGE' | 'LOSS' | 'FOUND' | 'DATA_CORRECTION';

export interface InventoryRowDto {
  warehouse_id: number;
  product_id: number;
  sku: string;
  product_name: string | null;
  available_quantity: number;
  version: number;
  updated_at: string;
}
export interface InventoryTransactionDto {
  txn_id: number;
  product_id: number;
  warehouse_id: number;
  quantity_delta: number;
  transaction_type: InventoryTransactionType;
  order_item_id: number | null;
  goods_receipt_item_id: number | null;
  reverses_transaction_id: number | null;
  actor_account_id: number | null;
  reason: string | null;
  created_at: string;
}
export interface InventoryQuery { product_id?: number; sku?: string; page?: number; page_size?: number; }
export interface InventoryTransactionQuery {
  product_id?: number; transaction_type?: InventoryTransactionType; order_item_id?: number;
  goods_receipt_item_id?: number; actor_account_id?: number; from?: string; to?: string;
  page?: number; page_size?: number;
}
export interface InventoryAdjustmentInput {
  product_id: number;
  quantity_delta: number;
  reason_code: InventoryAdjustmentReasonCode;
  source_operation_id: string;
  expected_version?: number;
}
export interface InventoryReversalInput {
  reason_code: 'COUNT_CORRECTION' | 'DATA_CORRECTION' | 'REVERSAL';
  expected_version?: number;
}
export interface SupplierDto {
  supplier_id: number; code: string; name: string; phone: string | null; email: string | null;
  status: SupplierStatus;
}
export interface SupplierQuery { q?: string; status?: SupplierStatus; page?: number; page_size?: number; }
export interface SupplierCreateInput {
  name: string; phone: string | null; email: string | null; status: SupplierStatus;
}
export type SupplierPatchInput = Partial<SupplierCreateInput>;
export interface GoodsReceiptItemDto {
  receipt_item_id: number; product_id: number; quantity_received: number; unit_cost: number;
}
export interface GoodsReceiptSummaryDto {
  receipt_id: number; receipt_code: string; supplier_id: number; warehouse_id: number;
  receipt_status: GoodsReceiptStatus; confirmed_at: string | null; created_at: string;
}
export interface GoodsReceiptDetailDto extends GoodsReceiptSummaryDto {
  created_by_account_id: number; confirmed_by_account_id: number | null;
  items: GoodsReceiptItemDto[]; updated_at: string;
}
export interface GoodsReceiptQuery {
  receipt_code?: string; supplier_id?: number; receipt_status?: GoodsReceiptStatus;
  date_from?: string; date_to?: string; page?: number; page_size?: number;
}
export interface GoodsReceiptItemInput {
  product_id: number; quantity_received: number; unit_cost: number;
}
export interface GoodsReceiptCreateInput { supplier_id: number; items: GoodsReceiptItemInput[]; }
export interface GoodsReceiptPatchInput { supplier_id?: number; items?: GoodsReceiptItemInput[]; }
