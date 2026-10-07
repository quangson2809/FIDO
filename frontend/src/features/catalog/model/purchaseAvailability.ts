import type { ProductVariantDto, SaleStatus } from '../types';

type PurchasableVariant = Pick<ProductVariantDto, 'sale_status' | 'available_quantity'>;

export const canPurchaseProductVariant = (
  productSaleStatus: SaleStatus | undefined,
  variant: PurchasableVariant | null,
): boolean =>
  productSaleStatus === 'ON_SALE'
  && variant?.sale_status === 'ON_SALE'
  && variant.available_quantity > 0;
