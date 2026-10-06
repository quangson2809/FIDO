export type ScreenId =
  | 'home'
  | 'catalog'
  | 'product-detail'
  | 'cart'
  | 'checkout'
  | 'order-success'
  | 'order-detail'
  | 'my-orders'
  | 'policy'
  | 'auth'
  | 'profile'
  | 'admin';

export interface CartItem {
  id: string;
  name: string;
  variantId: number;
  price: number;
  imageUrl: string;
  size: string | number;
  color: string;
  quantity: number;
}
