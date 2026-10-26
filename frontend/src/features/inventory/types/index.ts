export type SupplierUsageStatus = 'ACTIVE' | 'INACTIVE';
export type GoodsReceiptStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
export type GoodsReceiptAction = 'CONFIRM' | 'CANCEL';
export type InventoryTransactionType =
  | 'OPENING'
  | 'GOODS_RECEIPT'
  | 'ORDER'
  | 'ORDER_CANCEL_REVERSAL'
  | 'RETURN_RESTOCK'
  | 'ADJUSTMENT';

export interface InventoryRowDto {
  warehouse_id: number;
  product_id: number;
  sku: string;
  product_name: string | null;
  available_quantity: number;
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
  actor_account_id: number | null;
  reason: string | null;
  created_at: string;
}

export interface InventoryQuery {
  product_id?: number;
  sku?: string;
  warehouse_id?: number;
  page?: number;
  page_size?: number;
}

export interface InventoryTransactionQuery {
  product_id?: number;
  transaction_type?: InventoryTransactionType;
  order_item_id?: number;
  goods_receipt_item_id?: number;
  actor_account_id?: number;
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
}

export interface InventoryAdjustmentInput {
  warehouse_id: number;
  product_id: number;
  quantity_delta: number;
  reason: string;
}

export interface SupplierDto {
  supplier_id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  usage_status: SupplierUsageStatus;
  note: string | null;
}

export interface SupplierQuery {
  q?: string;
  usage_status?: SupplierUsageStatus;
  page?: number;
  page_size?: number;
}

export interface SupplierCreateInput {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  usage_status: SupplierUsageStatus;
  note: string | null;
}

export type SupplierPatchInput = Partial<SupplierCreateInput>;

export interface GoodsReceiptItemDto {
  receipt_item_id: number;
  product_id: number;
  quantity_received: number;
  unit_cost: number;
}

export interface GoodsReceiptSummaryDto {
  receipt_id: number;
  receipt_code: string;
  supplier_id: number;
  warehouse_id: number;
  receipt_status: GoodsReceiptStatus;
  receipt_date: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export interface GoodsReceiptDetailDto extends GoodsReceiptSummaryDto {
  created_by_account_id: number;
  confirmed_by_account_id: number | null;
  note: string | null;
  items: GoodsReceiptItemDto[];
  updated_at: string;
}

export interface GoodsReceiptQuery {
  receipt_code?: string;
  supplier_id?: number;
  receipt_status?: GoodsReceiptStatus;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface GoodsReceiptItemInput {
  product_id: number;
  quantity: number;
  unit_cost: number;
}

export interface GoodsReceiptCreateInput {
  supplier_id: number;
  warehouse_id: number;
  receipt_date: string;
  note: string | null;
  items: GoodsReceiptItemInput[];
}

export interface GoodsReceiptPatchInput {
  supplier_id?: number;
  warehouse_id?: number;
  receipt_date?: string;
  note?: string | null;
  items?: GoodsReceiptItemInput[];
}
