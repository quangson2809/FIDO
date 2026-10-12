export interface VoucherInput {
  code: string;
  discount_type: 'FIXED_AMOUNT' | 'PERCENTAGE';
  discount_value: number;
  maximum_discount: number | null;
  minimum_amount: number;
  starts_at: string;
  ends_at: string;
  scope: 'ALL' | 'CATEGORY' | 'PRODUCT';
  product_ids: number[];
  category_ids: number[];
  global_limit: number | null;
  customer_limit: number;
  enabled: boolean;
}
export interface VoucherDetail extends VoucherInput {
  voucher_id: number;
  active_usage: number;
  ever_used: boolean;
}
