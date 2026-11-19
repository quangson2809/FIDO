import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import messages from '../../contracts/error-messages.vi.json';
import { ApiClientError, getApiErrorMessage, normalizeApiError } from '../src/services/http/apiError';
import { getStorefrontErrorMessage } from '../src/services/http/storefrontError';
import { QueryFeedback } from '../src/shared/admin/QueryFeedback';

const fallback = 'Không thể lưu sản phẩm. Vui lòng thử lại.';
for (const [code, message] of Object.entries(messages)) {
  assert.match(message, /[À-ỹ]/u, code);
  assert.doesNotMatch(message, /SQL|HTTP|API|JWT|exception|stack|metadata|payload|ACTIVE|DRAFT/iu, code);
  const failure = new ApiClientError('private detail', 409, undefined, undefined, code);
  assert.equal(getApiErrorMessage(failure, fallback), message);
  assert.equal(getStorefrontErrorMessage(failure, fallback), message);
}
for (const status of [400, 409, 422, 500, 502, 503]) {
  for (const privateMessage of ['java.sql.SQLException SELECT password_hash FROM accounts', 'Internal Server Error', 'Mã lạ: private_field', 'Thông tin chưa đúng.']) {
    const error = normalizeApiError({ isAxiosError: true, response: { status, data: { code: 'UNKNOWN_CODE', message: privateMessage } } });
    assert.equal(getApiErrorMessage(error, fallback), fallback);
    assert.equal(getStorefrontErrorMessage(error, fallback), fallback);
    assert.ok(!error.message.includes(privateMessage));
    const html = renderToStaticMarkup(<QueryFeedback error={new ApiClientError(privateMessage, status)} />);
    assert.ok(!html.includes(privateMessage));
  }
}
assert.equal(getApiErrorMessage(new ApiClientError('Unauthorized', 401), fallback), messages.UNAUTHENTICATED);
assert.equal(getApiErrorMessage(new ApiClientError('Forbidden', 403), fallback), messages.FORBIDDEN);
const known = normalizeApiError({ isAxiosError: true, response: { status: 409, data: { code: 'INVENTORY_INSUFFICIENT_STOCK', message: 'private detail' } } });
assert.equal(getApiErrorMessage(known, fallback), messages.INVENTORY_INSUFFICIENT_STOCK);
assert.equal(getApiErrorMessage(new ApiClientError('Network Error'), fallback), fallback);
console.log('Vietnamese public errors, unsafe payloads and admin rendering: PASS');
