import type { CheckoutQuoteDto } from '../types';

/** Compare the purchase the customer saw; availability may change without changing that purchase. */
export function sameCheckoutQuote(left: CheckoutQuoteDto, right: CheckoutQuoteDto): boolean {
  return left.subtotal === right.subtotal && left.discount === right.discount
    && left.shipping_fee === right.shipping_fee && left.total === right.total
    && left.voucher?.voucher_id === right.voucher?.voucher_id
    && left.voucher?.code === right.voucher?.code
    && left.items.length === right.items.length
    && left.items.every((item) => {
      const other = right.items.find((candidate) => candidate.variant_id === item.variant_id);
      return other !== undefined && item.quantity === other.quantity
        && item.unit_price === other.unit_price && item.line_total === other.line_total
        && item.product_name === other.product_name && item.size === other.size && item.color === other.color;
    });
}
