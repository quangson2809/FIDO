// Isolated HTTP fixtures model the existing snake_case contract. No live account writes.
export const date = '2026-10-10T03:00:00Z';
export const meta = {
  categories: [{ category_id: 1, parent_category_id: null, name: 'Áo' }, { category_id: 2, parent_category_id: null, name: 'Quần' }],
  brands: [{ brand_id: 1, name: 'FIDO' }],
  size_systems: [{ size_system_id: 1, code: 'TOP', name: 'Áo', size_values: [{ size_value_id: 1, size_system_id: 1, code: 'M', display_name: 'M', sort_order: 1 }] }],
  colors: [{ color_id: 1, code: 'BLACK', name: 'Đen' }], genders: ['UNISEX'], seasons: ['ALL'], styles: ['MINIMAL'],
};
export const me = { account: { account_id: 1, phone: '0900000000', email: 'user@example.test', created_at: date, updated_at: date }, addresses: [{ address_id: 1, address_text: 'Hà Nội', created_at: date }, { address_id: 2, address_text: 'Nghệ An', created_at: date }], roles: [{ role_id: 1, code: 'CUSTOMER', name: 'Khách hàng', description: null }], permissions: [] };
export const product = { product_id: 1, name: 'Áo FIDO', description: 'Thiết kế tối giản', category: meta.categories[0], brand: meta.brands[0], size_system: meta.size_systems[0], gender: null, season: null, style: null, material_care: null, base_price: 200000, sale_status: 'ON_SALE', images: [], variants: [{ variant_id: 1, sku: 'FIDO-M-BLACK', size: meta.size_systems[0].size_values[0], color: meta.colors[0], effective_price: 220000, sale_status: 'ON_SALE', available_quantity: 5 }] };
export function storefrontFixture() {
  const state = { quantity: 1, requests: [], failures: new Map(), orderStatus: 'PENDING', paymentStatus: 'UNPAID', orders: 0, emptyOrders: false, expiresAt: undefined, quoteNumber: 0, loseOrderResponse: false };
  const createdQuotes = new Map();
  const item = () => ({ cart_item_id: 1, variant_id: 1, product_name: product.name, size: 'M', color: 'Đen', quantity: state.quantity, unit_price: 220000, line_total: state.quantity * 220000, available_quantity: 5, image_url: null });
  const cart = () => ({ cart_id: 1, account_id: 1, items: state.quantity ? [item()] : [], subtotal: state.quantity * 220000 });
  const order = () => ({ order_id: 1, order_code: 'FIDO-001', order_status: state.orderStatus, recipient: { phone: me.account.phone, email: me.account.email, address: 'Nghệ An' }, items: [{ ...item(), order_item_id: 1, sku: 'FIDO-M-BLACK', quantity: 1, line_total: 220000 }], subtotal: 220000, discount: 0, shipping_fee: 30000, total: 250000, payment: { payment_status: state.paymentStatus, amount_due: 250000, amount_received: 0, amount_refunded: 0 }, shipping_info: null, completed_at: null, returned_at: null, created_at: date, updated_at: date });
  const handler = async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    const send = (body, status = 200) => route.fulfill({ status, json: body });
    if (request.method() === 'OPTIONS') return send({}, 200);
    state.requests.push({ path, method: request.method(), query: url.search, body: request.postData() ? request.postDataJSON() : null });
    if (state.failures.has(path)) return send({ message: 'java.sql.SQLException: private internal detail' }, state.failures.get(path));
    if (path === '/me') return send({ data: me });
    if (path === '/auth/login') return send({ data: { access_token: 'fixture', token_type: 'Bearer', expires_in: 3600, account: me.account } });
    if (path === '/catalog/meta') return send({ data: meta });
    if (path === '/catalog/products/1') return send({ data: product });
    if (path === '/catalog/products') {
      const hasResult = url.searchParams.get('category_id') !== '2' && url.searchParams.get('q') !== 'missing';
      return send({ data: hasResult ? [{ ...product, thumbnail: null, sizes: [product.variants[0].size] }] : [], meta: { page: Number(url.searchParams.get('page') || 1), page_size: 12, total: hasResult ? 25 : 0, total_pages: hasResult ? 3 : 0 } });
    }
    if (path === '/cart') return send({ data: cart() });
    if (path === '/cart/items' && request.method() === 'POST') { state.quantity += request.postDataJSON().quantity; return send({ data: cart() }); }
    if (path === '/cart/items/1') { state.quantity = request.method() === 'DELETE' ? 0 : request.postDataJSON().quantity; return send({ data: cart() }); }
    if (path === '/checkout/quote') {
      const code = request.postDataJSON().voucher_code;
      if (code === 'INVALID') return send({ message: 'Mã ưu đãi không hợp lệ hoặc bạn chưa đủ điều kiện.' }, 422);
      return send({ data: { quote_id: `fixture-quote-${++state.quoteNumber}`, expires_at: state.expiresAt, items: [item()], subtotal: state.quantity * 220000, discount: code === 'VALID' ? 20000 : 0, shipping_fee: 30000, total: state.quantity * 220000 + 30000 - (code === 'VALID' ? 20000 : 0), voucher: code === 'VALID' ? { voucher_id: 1, code } : null } });
    }
    if (path === '/orders' && request.method() === 'POST') {
      const quoteId = request.postDataJSON().quote_id;
      if (createdQuotes.has(quoteId)) return send({ data: createdQuotes.get(quoteId) }, 201);
      state.orders++;
      const created = { ...order(), order_id: 1 };
      createdQuotes.set(quoteId, created); state.quantity = 0;
      if (state.loseOrderResponse) { state.loseOrderResponse = false; return route.abort('failed'); }
      return send({ data: created }, 201);
    }
    if (path === '/me/orders') return send({ data: state.emptyOrders ? [] : [{ ...order(), payment_status: state.paymentStatus }], meta: { page: 1, page_size: 10, total: state.emptyOrders ? 0 : 1, total_pages: state.emptyOrders ? 0 : 1 } });
    if (path === '/me/orders/1') return send({ data: order() });
    if (path.startsWith('/content-pages/')) return send({ data: { page_code: path.split('/').at(-1), title: path.endsWith('return-policy') ? 'Chính sách trả hàng' : path.endsWith('privacy-policy') ? 'Quyền riêng tư' : 'Chính sách giao hàng', content: 'Nội dung chính sách thử nghiệm.' } });
    return send({ data: [] });
  };
  return { state, handler };
}
