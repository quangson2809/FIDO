import { CartDto } from '../../../mocks/apiData';

export type { CartDto };

export interface CartService {
  getCart(): Promise<CartDto>;
  addItem(variantId: number, quantity: number): Promise<CartDto>;
  updateItem(cartItemId: number, quantity: number): Promise<CartDto>;
  removeItem(cartItemId: number): Promise<CartDto>;
  clearCart(): Promise<CartDto>;
}
