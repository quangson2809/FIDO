export interface CartItemDto {
  cart_item_id: number;
  product_id: number;
  quantity: number;
  product_name: string | null;
  image_url: string | null;
  thumbnail: string | null;
  sku: string | null;
  unit_price: number;
  line_total: number;
  available_quantity: number;
}

export interface CartDto {
  cart_id: number | null;
  account_id: number;
  items: CartItemDto[];
  subtotal: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface CartService {
  getCart(): Promise<CartDto>;
  addItem(productId: number, quantity: number): Promise<CartDto>;
  updateItem(cartItemId: number, quantity: number): Promise<CartDto>;
  removeItem(cartItemId: number): Promise<CartDto>;
  clear(): Promise<CartDto>;
}

export interface CartViewItem {
  id: number;
  productId: number;
  name: string;
  sku: string;
  price: number;
  lineTotal: number;
  availableQuantity: number;
  imageUrl: string;
  quantity: number;
}
