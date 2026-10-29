import type { CheckoutQuoteDto } from '../types';

/** Compare the authoritative values shown to the customer for the current Cart revision. */
export function sameCheckoutQuote(left: CheckoutQuoteDto, right: CheckoutQuoteDto): boolean {
  return (
    left.subtotal === right.subtotal &&
    left.discount_amount === right.discount_amount &&
    left.shipping_fee === right.shipping_fee &&
    left.total_amount === right.total_amount &&
    left.voucher?.voucher_id === right.voucher?.voucher_id &&
    left.voucher?.code === right.voucher?.code &&
    left.items.length === right.items.length &&
    left.items.every((item) => {
      const other = right.items.find((candidate) => candidate.product_id === item.product_id);
      return (
        other !== undefined &&
        item.quantity === other.quantity &&
        item.unit_price === other.unit_price &&
        item.line_total === other.line_total &&
        item.discount_amount === other.discount_amount &&
        item.product_name === other.product_name &&
        item.sku === other.sku
      );
    })
  );
}
