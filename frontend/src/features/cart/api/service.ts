import { CartService, CartDto } from '../types';
import { mockCart, mockProductDetails } from '../../../mocks/apiData';
import { apiClient } from '../../../services/http/apiClient';
import { API_MODE } from '../../../constants/app';

let mockState: CartDto = structuredClone(mockCart);

const recalc = (): CartDto => {
  mockState = {
    ...mockState,
    subtotal: mockState.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0),
    updated_at: new Date().toISOString(),
  };
  return structuredClone(mockState);
};

const mockCartService: CartService = {
  async getCart() {
    return structuredClone(mockState);
  },
  async addItem(variantId, quantity) {
    const existing = mockState.items.find((item) => item.variant_id === variantId);
    if (existing) {
      existing.quantity += quantity;
      existing.line_total = existing.unit_price * existing.quantity;
      return recalc();
    }

    const product = mockProductDetails.find((item) =>
      item.variants.some((variant) => variant.variant_id === variantId),
    );
    const variant = product?.variants.find((item) => item.variant_id === variantId);
    if (!product || !variant) throw new Error(`Mock variant ${variantId} not found`);

    const cartItemId = Math.max(0, ...mockState.items.map((item)=>item.cart_item_id)) + 1;
    mockState.items.push({
      cart_item_id: cartItemId,
      variant_id: variantId,
      quantity,
      product_name: product.name,
      size: variant.size.display_name,
      color: variant.color.name,
      unit_price: variant.effective_price,
      line_total: variant.effective_price * quantity,
      available_quantity: variant.available_quantity,
    });
    return recalc();
  },
  async updateItem(cartItemId, quantity) {
    const item = mockState.items.find((entry) => entry.cart_item_id === cartItemId);
    if (item && quantity > 0) {
      item.quantity = quantity;
      item.line_total = item.unit_price * quantity;
    }
    return recalc();
  },
  async removeItem(cartItemId) {
    mockState = { ...mockState, items: mockState.items.filter((item) => item.cart_item_id !== cartItemId) };
    return recalc();
  },
  async clearCart() {
    mockState = { ...mockState, items: [] };
    return recalc();
  },
};

const unwrap = async (request: Promise<{ data: CartDto }>): Promise<CartDto> => (await request).data;

const realCartService: CartService = {
  getCart: () => unwrap(apiClient.get('/cart')),
  addItem: (variantId, quantity) => unwrap(apiClient.post('/cart/items', { variant_id: variantId, quantity })),
  updateItem: (cartItemId, quantity) => unwrap(apiClient.patch(`/cart/items/${cartItemId}`, { quantity })),
  removeItem: (cartItemId) => unwrap(apiClient.delete(`/cart/items/${cartItemId}`)),
  clearCart: () => unwrap(apiClient.delete('/cart')),
};

export const cartService = API_MODE === 'mock' ? mockCartService : realCartService;
