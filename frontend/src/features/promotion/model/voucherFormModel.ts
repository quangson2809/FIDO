import type { VoucherInput } from '../types';

export const changeVoucherScope = (current: VoucherInput, scope: VoucherInput['scope']): VoucherInput =>
  current.scope === scope ? current : { ...current, scope, product_ids: [], category_ids: [] };

export const changeVoucherDiscountType = (
  current: VoucherInput,
  discountType: VoucherInput['discount_type'],
): VoucherInput => ({
  ...current,
  discount_type: discountType,
  maximum_discount: discountType === 'FIXED_AMOUNT' ? null : current.maximum_discount,
});

// Explicit request projection: TypeScript's structural typing does not strip
// response-only fields (voucher_id, active_usage, ever_used) at runtime.
export const voucherRequestFields = (form: VoucherInput): VoucherInput => ({
  code: form.code,
  discount_type: form.discount_type,
  discount_value: form.discount_value,
  maximum_discount: form.maximum_discount,
  minimum_amount: form.minimum_amount,
  starts_at: form.starts_at,
  ends_at: form.ends_at,
  scope: form.scope,
  product_ids: [...form.product_ids],
  category_ids: [...form.category_ids],
  global_limit: form.global_limit,
  customer_limit: form.customer_limit,
  enabled: form.enabled,
});

export const voucherSubmission = (form: VoucherInput, alreadyUsed: boolean): VoucherInput => {
  const request = voucherRequestFields(form);
  return {
    ...request,
    code: request.code.trim(),
    maximum_discount: request.discount_type === 'PERCENTAGE' || alreadyUsed ? request.maximum_discount : null,
    product_ids: request.scope === 'PRODUCT' ? request.product_ids : [],
    category_ids: request.scope === 'CATEGORY' ? request.category_ids : [],
  };
};
