// Isolated HTTP fixtures model the current Catalog and Cart contracts. No live account writes.
export const date = '2026-10-10T03:00:00Z';
export const meta = {
  categories: [
    { category_id: 1, parent_category_id: null, name: 'Áo', slug: 'ao', status: 'ACTIVE' },
    { category_id: 2, parent_category_id: null, name: 'Quần', slug: 'quan', status: 'ACTIVE' },
  ],
  brands: [{ brand_id: 1, name: 'FIDO', slug: 'fido', status: 'ACTIVE' }],
  attribute_types: [
    { id: 1, code: 'OPTION', name: 'Lựa chọn', data_type: 'OPTION' },
    { id: 2, code: 'TEXT', name: 'Văn bản', data_type: 'TEXT' },
    { id: 3, code: 'NUMBER', name: 'Số', data_type: 'NUMBER' },
    { id: 4, code: 'BOOLEAN', name: 'Có/Không', data_type: 'BOOLEAN' },
  ],
  attributes: [
    {
      id: 1,
      code: 'MATERIAL',
      name: 'Chất liệu',
      data_type: 'TEXT',
      is_required: false,
      is_variant_defining: false,
      sort_order: 0,
      options: [],
    },
  ],
};
export const me = {
  account: {
    account_id: 1,
    full_name: 'Test Customer',
    phone: '0900000000',
    email: 'user@example.test',
    status: 'ACTIVE',
    created_at: date,
    updated_at: date,
  },
  addresses: [
    { address_id: 1, address_text: 'Hà Nội', created_at: date },
    { address_id: 2, address_text: 'Nghệ An', created_at: date },
  ],
  roles: [{ role_id: 1, code: 'CUSTOMER', name: 'Khách hàng', description: null }],
  permissions: [],
};
export const product = {
  product_id: 1,
  parent_product_id: null,
  sku: 'FIDO-TEE-001',
  name: 'Áo FIDO',
  slug: 'ao-fido',
  description: 'Thiết kế tối giản',
  category: meta.categories[0],
  brand: meta.brands[0],
  selling_price: 200000,
  status: 'ACTIVE',
  images: [],
  created_at: date,
  updated_at: date,
  attribute_values: [
    {
      attribute_id: 1,
      attribute_code: 'MATERIAL',
      attribute_name: 'Chất liệu',
      data_type: 'TEXT',
      option_id: null,
      option_value: null,
      option_label: null,
      text_value: 'Cotton',
      number_value: null,
      boolean_value: null,
    },
  ],
};
export const productSummary = {
  product_id: product.product_id,
  parent_product_id: product.parent_product_id,
  sku: product.sku,
  name: product.name,
  slug: product.slug,
  thumbnail: null,
  category: product.category,
  brand: product.brand,
  selling_price: product.selling_price,
  status: product.status,
};
export function storefrontFixture() {
  const state = {
    quantity: 1,
    requests: [],
    failures: new Map(),
    orderStatus: 'PENDING',
    paymentStatus: 'UNPAID',
    orders: 0,
    emptyOrders: false,
    expiresAt: undefined,
    quoteNumber: 0,
    loseOrderResponse: false,
  };
  const createdQuotes = new Map();
  const cartItem = () => ({
    cart_item_id: 1,
    product_id: product.product_id,
    quantity: state.quantity,
    product_name: product.name,
    image_url: null,
    thumbnail: null,
    sku: product.sku,
    unit_price: product.selling_price,
    line_total: state.quantity * product.selling_price,
    available_quantity: 5,
  });
  // Checkout retains its own legacy contract until the dedicated Checkout/Address phase.
  const checkoutItem = () => ({
    cart_item_id: 1,
    variant_id: 1,
    product_id: product.product_id,
    product_name: product.name,
    sku: product.sku,
    size: 'M',
    color: 'Đen',
    quantity: state.quantity,
    unit_price: product.selling_price,
    line_total: state.quantity * product.selling_price,
    available_quantity: 5,
    thumbnail: null,
  });
  const cart = () => ({
    cart_id: 1,
    account_id: 1,
    items: state.quantity > 0 ? [cartItem()] : [],
    subtotal: state.quantity * product.selling_price,
    created_at: date,
    updated_at: date,
  });
  const order = () => ({
    order_id: 1,
    order_code: 'FIDO-001',
    order_status: state.orderStatus,
    recipient: { phone: me.account.phone, email: me.account.email, address: 'Nghệ An' },
    items: [{ ...checkoutItem(), order_item_id: 1, quantity: 1, line_total: product.selling_price }],
    subtotal: product.selling_price,
    discount: 0,
    shipping_fee: 30000,
    total: product.selling_price + 30000,
    payment: {
      payment_status: state.paymentStatus,
      amount_due: product.selling_price + 30000,
      amount_received: 0,
      amount_refunded: 0,
    },
    shipping_info: null,
    completed_at: null,
    returned_at: null,
    created_at: date,
    updated_at: date,
  });
  const handler = async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    const send = (body, status = 200) => route.fulfill({ status, json: body });
    if (request.method() === 'OPTIONS') return send({}, 200);
    state.requests.push({
      path,
      method: request.method(),
      query: url.search,
      body: request.postData() ? request.postDataJSON() : null,
    });
    if (state.failures.has(path))
      return send(
        { message: 'java.sql.SQLException: private internal detail' },
        state.failures.get(path),
      );
    if (path === '/me') return send({ data: me });
    if (path === '/auth/login')
      return send({
        data: {
          access_token: 'fixture',
          token_type: 'Bearer',
          expires_in: 3600,
          account: me.account,
        },
      });
    if (path === '/catalog/meta') return send({ data: meta });
    if (path === '/catalog/products/1') return send({ data: product });
    if (path === '/catalog/products') {
      const hasResult =
        url.searchParams.get('category_id') !== '2' && url.searchParams.get('q') !== 'missing';
      return send({
        data: hasResult
          ? [{ ...productSummary, thumbnail: '/images/about/wardrobe.svg' }]
          : [],
        meta: {
          page: Number(url.searchParams.get('page') || 1),
          page_size: 12,
          total: hasResult ? 25 : 0,
          total_pages: hasResult ? 3 : 0,
        },
      });
    }
    if (path === '/cart' && request.method() === 'DELETE') {
      state.quantity = 0;
      return send({ data: cart() });
    }
    if (path === '/cart' && request.method() === 'GET') return send({ data: cart() });
    if (path === '/cart/items' && request.method() === 'POST') {
      const body = request.postDataJSON();
      if (body.product_id !== product.product_id) return send({ message: 'Product not found' }, 404);
      state.quantity += body.quantity;
      return send({ data: cart() });
    }
    if (path === '/cart/items/1') {
      state.quantity = request.method() === 'DELETE' ? 0 : request.postDataJSON().quantity;
      return send({ data: cart() });
    }
    if (path === '/checkout/quote') {
      const code = request.postDataJSON().voucher_code;
      if (code === 'INVALID')
        return send({ message: 'Mã ưu đãi không hợp lệ hoặc bạn chưa đủ điều kiện.' }, 422);
      return send({
        data: {
          quote_id: `fixture-quote-${++state.quoteNumber}`,
          expires_at: state.expiresAt,
          items: [checkoutItem()],
          subtotal: state.quantity * product.selling_price,
          discount: code === 'VALID' ? 20000 : 0,
          shipping_fee: 30000,
          total: state.quantity * product.selling_price + 30000 - (code === 'VALID' ? 20000 : 0),
          voucher: code === 'VALID' ? { voucher_id: 1, code } : null,
        },
      });
    }
    if (path === '/orders' && request.method() === 'POST') {
      const quoteId = request.postDataJSON().quote_id;
      if (createdQuotes.has(quoteId)) return send({ data: createdQuotes.get(quoteId) }, 201);
      state.orders++;
      const created = { ...order(), order_id: 1 };
      createdQuotes.set(quoteId, created);
      state.quantity = 0;
      if (state.loseOrderResponse) {
        state.loseOrderResponse = false;
        return route.abort('failed');
      }
      return send({ data: created }, 201);
    }
    if (path === '/me/orders')
      return send({
        data: state.emptyOrders ? [] : [{ ...order(), payment_status: state.paymentStatus }],
        meta: {
          page: 1,
          page_size: 10,
          total: state.emptyOrders ? 0 : 1,
          total_pages: state.emptyOrders ? 0 : 1,
        },
      });
    if (path === '/me/orders/1') return send({ data: order() });
    if (path.startsWith('/content-pages/'))
      return send({
        data: {
          page_code: path.split('/').at(-1),
          title: path.endsWith('return-policy')
            ? 'Chính sách trả hàng'
            : path.endsWith('privacy-policy')
              ? 'Quyền riêng tư'
              : 'Chính sách giao hàng',
          content: 'Nội dung chính sách thử nghiệm.',
        },
      });
    return send({ data: [] });
  };
  return { state, handler };
}
