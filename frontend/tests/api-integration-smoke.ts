import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { authService } from '../src/features/auth/api/service';
import { profileService } from '../src/features/auth/api/profileService';
import { cartService } from '../src/features/cart/api/service';
import { catalogService } from '../src/features/catalog/api/service';
import { contentService } from '../src/features/content/api/service';
import { orderService } from '../src/features/orders/api/service';
import { reportService } from '../src/features/report/api/service';

const account = {
  account_id: 900001,
  phone: '0909000001',
  email: 'superadmin@fido.local',
  created_at: '2026-09-01T00:00:00',
  updated_at: '2026-09-01T00:00:00',
};

const writeJson = (response: ServerResponse, status: number, body: unknown): void => {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
};

let bearerRequestCount = 0;

const requireBearer = (request: IncomingMessage): void => {
  assert.equal(request.headers.authorization, 'Bearer smoke-token');
  bearerRequestCount += 1;
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');

  if (request.method === 'POST' && url.pathname === '/api/v1/auth/register') {
    writeJson(response, 201, { data: account });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/auth/login') {
    writeJson(response, 200, {
      data: {
        access_token: 'smoke-token',
        token_type: 'Bearer',
        expires_in: 900,
        account,
      },
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/me') {
    requireBearer(request);
    writeJson(response, 200, {
      data: {
        account,
        addresses: [],
        roles: [{
          role_id: 1,
          code: 'SUPERADMIN',
          name: 'Superadmin',
          description: null,
        }],
        permissions: [],
      },
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/catalog/products') {
    assert.equal(url.searchParams.get('page'), '1');
    assert.equal(url.searchParams.get('page_size'), '8');
    writeJson(response, 200, {
      data: [{
        product_id: 960001,
        name: 'Smoke Product',
        thumbnail: 'https://example.com/product.jpg',
        category: {
          category_id: 1,
          parent_category_id: null,
          name: 'Áo',
        },
        brand: null,
        base_price: 199000,
        sale_status: 'ON_SALE',
      }],
      meta: {
        page: 1,
        page_size: 8,
        total: 1,
        total_pages: 1,
      },
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/catalog/meta') {
    writeJson(response, 200, {
      data: {
        categories: [],
        brands: [],
        size_systems: [],
        colors: [],
        genders: [],
        seasons: [],
        styles: [],
      },
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/cart') {
    requireBearer(request);
    writeJson(response, 200, {
      data: {
        cart_id: 1,
        account_id: account.account_id,
        items: [],
        subtotal: 0,
        created_at: '2026-10-07T00:00:00',
        updated_at: '2026-10-07T00:00:00',
      },
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/me/orders') {
    requireBearer(request);
    assert.equal(url.searchParams.get('page'), '1');
    writeJson(response, 200, {
      data: [],
      meta: {
        page: 1,
        page_size: 10,
        total: 0,
        total_pages: 0,
      },
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/content-pages/shipping-policy') {
    writeJson(response, 200, {
      data: {
        page_code: 'shipping-policy',
        title: 'Chính sách giao hàng',
        content: 'Smoke policy',
        updated_at: '2026-09-01T00:00:00',
      },
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/admin/reports/overview') {
    requireBearer(request);
    writeJson(response, 200, {
      data: {
        from: url.searchParams.get('from'),
        to: url.searchParams.get('to'),
        completed_sales: 100000,
        returned_adjustment: 0,
        net_sales: 100000,
        orders_by_status: { COMPLETED: 1 },
      },
    });
    return;
  }

  writeJson(response, 404, {
    status: 404,
    error: 'Not Found',
    path: url.pathname,
  });
});

await new Promise<void>((resolve, reject) => {
  server.once('error', reject);
  server.listen(8080, resolve);
});

try {
  const registered = await authService.register('0909000001', 'superadmin@fido.local', 'Fido@123');
  assert.equal(registered.account_id, account.account_id);

  const login = await authService.login('0909000001', 'Fido@123');
  assert.equal(login.access_token, 'smoke-token');

  const me = await profileService.getMe();
  assert.equal(me.roles[0]?.code, 'SUPERADMIN');

  const catalog = await catalogService.listProducts({ page: 1, page_size: 8 });
  assert.equal(catalog.items[0]?.product_id, 960001);
  assert.equal(catalog.items[0]?.imageUrl, 'https://example.com/product.jpg');
  assert.equal(catalog.meta.page, 1);

  const meta = await catalogService.getMeta();
  assert.deepEqual(meta.categories, []);

  const cart = await cartService.getCart();
  assert.equal(cart.account_id, account.account_id);

  const orders = await orderService.getOrders({ page: 1, page_size: 10 });
  assert.equal(orders.meta.page, 1);

  const policy = await contentService.getPublicPage('shipping-policy');
  assert.equal(policy.page_code, 'shipping-policy');

  const report = await reportService.getOverview('2026-10-01', '2026-10-07');
  assert.equal(report.net_sales, 100000);

  assert.ok(bearerRequestCount >= 4, 'Authenticated requests must include the bearer token');
  process.stdout.write('API integration smoke: PASS\n');
} finally {
  authService.logout();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}
