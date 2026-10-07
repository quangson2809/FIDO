import assert from 'node:assert/strict';
import { LatestMutationQueue } from '../src/features/cart/model/LatestMutationQueue';
import { canAccessAdminModule } from '../src/features/auth/session/adminAccessPolicy';
import { isAdminProfile, isSuperAdminProfile } from '../src/features/auth/session/sessionAccess';
import { resolveAdminRoute } from '../src/routes/paths';
import {
  setApiAccessToken,
  subscribeToApiAccessToken,
} from '../src/services/http/apiClient';
import type { MeDto } from '../src/features/auth/types';

const profileWithRole = (code: string, permissionCodes: readonly string[] = []): MeDto => ({
  account: {
    account_id: 1,
    phone: '0900000000',
    email: null,
    created_at: '2026-10-07T00:00:00Z',
    updated_at: '2026-10-07T00:00:00Z',
  },
  addresses: [],
  roles: [{
    role_id: 1,
    code,
    name: code,
    description: null,
  }],
  permissions: permissionCodes.map((permissionCode, index) => ({
    permission_id: index + 1,
    code: permissionCode,
    name: permissionCode,
  })),
});

assert.equal(isAdminProfile(profileWithRole('SUPERADMIN')), true);
assert.equal(isAdminProfile(profileWithRole('ADMIN')), true);
assert.equal(isAdminProfile(profileWithRole('CUSTOMER')), false);
assert.equal(isAdminProfile(null), false);
assert.equal(isSuperAdminProfile(profileWithRole('SUPERADMIN')), true);
assert.equal(isSuperAdminProfile(profileWithRole('ADMIN')), false);

const catalogStaff = profileWithRole('ADMIN', ['CATALOG_READ', 'CATALOG_WRITE']);
assert.equal(canAccessAdminModule('dashboard', catalogStaff, ['CATALOG_READ', 'CATALOG_WRITE']), true);
assert.equal(canAccessAdminModule('products', catalogStaff, ['CATALOG_READ', 'CATALOG_WRITE']), true);
assert.equal(canAccessAdminModule('inventory', catalogStaff, ['CATALOG_READ', 'CATALOG_WRITE']), false);
assert.equal(canAccessAdminModule('reports', catalogStaff, ['CATALOG_READ', 'CATALOG_WRITE']), false);
assert.equal(canAccessAdminModule('reports', profileWithRole('SUPERADMIN'), []), true);
assert.equal(canAccessAdminModule('products', profileWithRole('CUSTOMER'), []), false);

assert.deepEqual(
  resolveAdminRoute('/admin/products/960003'),
  {
    menuKey: 'product-detail',
    breadcrumb: 'Chi tiết sản phẩm',
    productId: '960003',
  },
);
assert.deepEqual(
  resolveAdminRoute('/admin/orders/42'),
  {
    menuKey: 'order-detail',
    breadcrumb: 'Chi tiết đơn hàng',
    orderId: 42,
  },
);
assert.equal(resolveAdminRoute('/admin/inventory/history').menuKey, 'history');

const tokenEvents: Array<string | null> = [];
const unsubscribe = subscribeToApiAccessToken((token) => tokenEvents.push(token));
setApiAccessToken('architecture-token');
setApiAccessToken('architecture-token');
setApiAccessToken(null);
unsubscribe();
assert.deepEqual(tokenEvents, ['architecture-token', null]);

const executionOrder: string[] = [];
const publishedValues: number[] = [];
let resolveLatest!: () => void;
const latestPublished = new Promise<void>((resolve) => {
  resolveLatest = resolve;
});
const queue = new LatestMutationQueue<number>();

queue.enqueue(
  async () => {
    executionOrder.push('first');
    return 1;
  },
  {
    onLatestSuccess: (value) => publishedValues.push(value),
    onLatestError: () => {
      throw new Error('first operation should not fail');
    },
  },
);

queue.enqueue(
  async () => {
    executionOrder.push('second');
    return 2;
  },
  {
    onLatestSuccess: (value) => {
      publishedValues.push(value);
      resolveLatest();
    },
    onLatestError: () => {
      throw new Error('second operation should not fail');
    },
  },
);

await latestPublished;
assert.deepEqual(executionOrder, ['first', 'second']);
assert.deepEqual(publishedValues, [2], 'only the newest queued cart response may publish');

process.stdout.write('Frontend architecture smoke: PASS\n');
