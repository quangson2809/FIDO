export type VoucherStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED';

export interface VoucherInput {
  code: string;
  discount_type: 'FIXED' | 'PERCENT';
  /** Whole VND for FIXED; basis points for PERCENT (100 = 1%). */
  discount_value: number;
  minimum_order_value: number;
  maximum_discount: number | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
}
export interface VoucherDetail extends VoucherInput {
  id: number;
  usage_count: number;
  status: VoucherStatus;
}
export type VoucherPatchInput = VoucherInput & { status: VoucherStatus };
