import type { ProductStatus } from '../types';

export const canPurchaseProduct = (status: ProductStatus | null | undefined): boolean =>
  status === 'ACTIVE';
