export interface CartItemDto {
  cart_item_id: number;
  variant_id: number;
  quantity: number;
  product_name: string;
  image_url: string | null;
  size: string;
  color: string;
  unit_price: number;
  line_total: number;
  available_quantity: number;
}

export interface CartDto {
  cart_id: number | null;
  account_id: number | null;
  items: CartItemDto[];
  subtotal: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface CartService {
  getCart(): Promise<CartDto>;
  addItem(variantId: number, quantity: number): Promise<CartDto>;
  updateItem(cartItemId: number, quantity: number): Promise<CartDto>;
  removeItem(cartItemId: number): Promise<CartDto>;
  clear(): Promise<CartDto>;
}

export interface CartViewItem {
  id: string;
  name: string;
  variantId: number;
  price: number;
  imageUrl: string;
  size: string | number;
  color: string;
  quantity: number;
}
