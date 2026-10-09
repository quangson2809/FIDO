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

export const voucherSubmission = (form: VoucherInput, alreadyUsed: boolean): VoucherInput => ({
  ...form,
  code: form.code.trim(),
  maximum_discount: form.discount_type === 'PERCENTAGE' || alreadyUsed ? form.maximum_discount : null,
  product_ids: form.scope === 'PRODUCT' ? form.product_ids : [],
  category_ids: form.scope === 'CATEGORY' ? form.category_ids : [],
});
