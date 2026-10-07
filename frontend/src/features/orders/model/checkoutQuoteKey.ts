import type { CheckoutRequest } from '../types';

export const buildCheckoutQuoteKey = (
  request: CheckoutRequest,
  cartRevision: number,
): string => JSON.stringify({
  request,
  cart_revision: cartRevision,
});
