export interface CartItemDto {
  product_id: number;
  quantity: number;
}
export interface CartService {
  getCart(): Promise<CartItemDto[]>;
}
