// Isolated HTTP fixtures model the current Catalog and Cart contracts. No live account writes.
export const date = '2026-10-10T03:00:00Z';
export const meta = {
  categories: [
    { category_id: 1, parent_category_id: null, name: 'Áo', slug: 'ao', status: 'ACTIVE' },
    { category_id: 2, parent_category_id: null, name: 'Quần', slug: 'quan', status: 'ACTIVE' },
  ],
  brands: [{ brand_id: 1, name: 'FIDO', slug: 'fido', status: 'ACTIVE' }],
  attributes: [
    {
      id: 1,
      code: 'MATERIAL',
      name: 'Chất liệu',
      is_required: false,
      is_variant_defining: false,
      sort_order: 0,
      options: [{ id: 101, attribute_id: 1, value: 'COTTON', label: 'Cotton', sort_order: 0 }],
    },
  ],
};
export const me = {
  account: {
    id: 1,
    full_name: 'Test Customer',
    phone: '0900000000',
    email: 'user@example.test',
    status: 'ACTIVE',
    created_at: date,
    updated_at: date,
  },
  addresses: [
    { id: 1, recipient_name: 'Test Customer', recipient_phone: '0900000000', province: 'Hà Nội', district: 'Ba Đình', ward: 'Liễu Giai', address_line: '12 Đội Cấn', is_default: true },
    { id: 2, recipient_name: 'Test Customer', recipient_phone: '0900000000', province: 'Nghệ An', district: 'Vinh', ward: 'Hà Huy Tập', address_line: '15 Nguyễn Trãi', is_default: false },
  ],
  roles: [{ id: 1, code: 'CUSTOMER', name: 'Khách hàng', description: null, status: 'ACTIVE' }],
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
      attribute_value_id: 101,
      value: 'COTTON',
      label: 'Cotton',
    },
  ],
};
// Public detail now includes the selected Product and its ACTIVE family members.
product.family = {
  root_product_id: product.product_id,
  members: [{
    product_id: product.product_id,
    parent_product_id: product.parent_product_id,
    sku: product.sku,
    name: product.name,
    selling_price: product.selling_price,
    status: product.status,
    images: product.images,
    attribute_values: product.attribute_values,
  }],
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
    loseOrderResponse: false,
  };
  const profile = structuredClone(me);
  const createdOrders = new Map();
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
  const checkoutItem = () => ({
    product_id: product.product_id,
    product_name: product.name,
    sku: product.sku,
    quantity: state.quantity,
    unit_price: product.selling_price,
    discount_amount: 0,
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
    recipient: { phone: profile.account.phone, email: profile.account.email, address: 'Nghệ An' },
    items: [{
      ...checkoutItem(),
      order_item_id: 1,
      image_url: null,
      quantity: 1,
      line_total: product.selling_price,
    }],
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
      headers: request.headers(),
    });
    if (state.failures.has(path))
      return send(
        { message: 'java.sql.SQLException: private internal detail' },
        state.failures.get(path),
      );
    if (path === '/me') return send({ data: profile });
    if (path === '/auth/login')
      return send({
        data: {
          access_token: 'fixture',
          token_type: 'Bearer',
          expires_in: 3600,
          account: profile.account,
        },
      });
    if (path === '/me/addresses' && request.method() === 'POST') {
      const input = request.postDataJSON();
      const nextId = Math.max(0, ...profile.addresses.map((address) => address.id)) + 1;
      const address = {
        ...input,
        id: nextId,
        is_default: typeof input.is_default === 'boolean' ? input.is_default : profile.addresses.length === 0,
      };
      profile.addresses.push(address);
      return send({ data: address }, 201);
    }
    if (path.startsWith('/me/addresses/')) {
      const addressId = Number(path.split('/').at(-1));
      const addressIndex = profile.addresses.findIndex((address) => address.id === addressId);
      if (addressIndex < 0) return send({ message: 'Address not found' }, 404);
      if (request.method() === 'PATCH') {
        const updated = { ...profile.addresses[addressIndex], ...request.postDataJSON(), id: addressId };
        profile.addresses[addressIndex] = updated;
        return send({ data: updated });
      }
      if (request.method() === 'DELETE') {
        profile.addresses.splice(addressIndex, 1);
        return route.fulfill({ status: 204, body: '' });
      }
    }
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
      const discountAmount = code === 'VALID' ? 20000 : 0;
      const subtotal = state.quantity * product.selling_price;
      return send({
        data: {
          items: [checkoutItem()],
          subtotal,
          discount_amount: discountAmount,
          shipping_fee: 30000,
          total_amount: subtotal + 30000 - discountAmount,
          voucher: code === 'VALID' ? { voucher_id: 1, code } : null,
        },
      });
    }
    if (path === '/orders' && request.method() === 'POST') {
      const idempotencyKey = request.headers()['idempotency-key'];
      if (!idempotencyKey) return send({ message: 'Idempotency-Key is required' }, 400);
      if (createdOrders.has(idempotencyKey))
        return send({ data: createdOrders.get(idempotencyKey) }, 201);
      state.orders++;
      const created = { ...order(), order_id: 1 };
      createdOrders.set(idempotencyKey, created);
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
