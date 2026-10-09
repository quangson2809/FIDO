import { useRef, useState, type FormEvent } from 'react';
import type { VoucherDetail, VoucherInput } from '../types';
import { voucherService } from '../api/service';
import { Modal } from '../../../shared/admin/Modal';
import { getApiErrorMessage } from '../../../services/http/apiError';
import { VoucherCategoryPicker, VoucherProductPicker } from './VoucherScopePicker';
import { changeVoucherDiscountType, changeVoucherScope, voucherSubmission } from '../model/voucherFormModel';

const blank: VoucherInput = {
  code: '', discount_type: 'FIXED_AMOUNT', discount_value: 0, maximum_discount: null,
  minimum_amount: 0, starts_at: '', ends_at: '', scope: 'ALL', product_ids: [], category_ids: [],
  global_limit: null, customer_limit: 1, enabled: false,
};

const localTime = (value: string): string => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function VoucherForm({ voucher, canWrite, onClose, onSaved }: {
  voucher: VoucherDetail | null;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<VoucherInput>(voucher ?? blank);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const locked = voucher?.ever_used === true;

  const field = <K extends keyof VoucherInput>(key: K, value: VoucherInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (pending.current || !canWrite) return;
    const input = voucherSubmission(form, locked);
    const scopedIds = input.scope === 'CATEGORY' ? input.category_ids : input.product_ids;
    if (input.scope !== 'ALL' && scopedIds.length === 0) {
      setError('Vui lòng chọn ít nhất một danh mục hoặc sản phẩm phù hợp.');
      return;
    }
    if (input.discount_type === 'PERCENTAGE' && (input.maximum_discount === null || input.maximum_discount <= 0)) {
      setError('Voucher giảm theo phần trăm cần có mức giảm tối đa.');
      return;
    }
    if (!input.starts_at || !input.ends_at || new Date(input.ends_at) <= new Date(input.starts_at)) {
      setError('Ngày kết thúc phải sau ngày bắt đầu.');
      return;
    }

    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      if (voucher) await voucherService.update(voucher.voucher_id, input);
      else await voucherService.create(input);
      onSaved();
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể lưu voucher.'));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return <Modal title={voucher ? `Voucher ${voucher.code}` : 'Tạo voucher'} onClose={onClose} busy={busy}>
    <form onSubmit={save} className="space-y-4">
      {locked && <p className="text-sm">Đã có lượt sử dụng: chỉ được gia hạn, tăng giới hạn hoặc bật/tắt.</p>}
      {voucher && <p className="text-sm">Lượt đang tính: {voucher.active_usage}. Hủy đơn hoàn lượt; trả hàng không hoàn lượt.</p>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <fieldset disabled={busy || !canWrite} className="grid gap-4 sm:grid-cols-2">
        <label>Mã voucher<input className="field-input" required maxLength={80} disabled={locked}
          value={form.code} onChange={(event) => field('code', event.target.value)} /></label>
        <label>Loại giảm
          <select className="field-input" disabled={locked} value={form.discount_type}
            onChange={(event) => {
              if (event.target.value === 'FIXED_AMOUNT' || event.target.value === 'PERCENTAGE') {
                setForm((current) => changeVoucherDiscountType(current, event.target.value as VoucherInput['discount_type']));
              }
            }}>
            <option value="FIXED_AMOUNT">Số tiền</option>
            <option value="PERCENTAGE">Phần trăm</option>
          </select>
        </label>
        <label>Giá trị giảm<input className="field-input" type="number" required min="0.01" step="0.01"
          max={form.discount_type === 'PERCENTAGE' ? 100 : undefined} disabled={locked}
          value={form.discount_value} onChange={(event) => field('discount_value', Number(event.target.value))} /></label>
        {form.discount_type === 'PERCENTAGE' && <label>Giảm tối đa *
          <input className="field-input" type="number" min="0.01" step="0.01" required disabled={locked}
            value={form.maximum_discount ?? ''} onChange={(event) => field('maximum_discount', event.target.value ? Number(event.target.value) : null)} />
        </label>}
        <label>Tiền hàng đủ điều kiện tối thiểu<input className="field-input" type="number" required min="0" step="0.01"
          disabled={locked} value={form.minimum_amount} onChange={(event) => field('minimum_amount', Number(event.target.value))} /></label>
        <label>Phạm vi
          <select className="field-input" disabled={locked} value={form.scope} onChange={(event) => {
            if (event.target.value === 'ALL' || event.target.value === 'PRODUCT' || event.target.value === 'CATEGORY') {
              setForm((current) => changeVoucherScope(current, event.target.value as VoucherInput['scope']));
            }
          }}>
            <option value="ALL">Toàn bộ sản phẩm</option>
            <option value="CATEGORY">Danh mục và danh mục con</option>
            <option value="PRODUCT">Sản phẩm</option>
          </select>
        </label>
        {form.scope === 'CATEGORY' && <VoucherCategoryPicker selectedIds={form.category_ids}
          onChange={(ids) => field('category_ids', ids)} disabled={locked || !canWrite} />}
        {form.scope === 'PRODUCT' && <VoucherProductPicker selectedIds={form.product_ids}
          onChange={(ids) => field('product_ids', ids)} disabled={locked || !canWrite} />}
        <label>Bắt đầu (giờ địa phương)
          <input className="field-input" type="datetime-local" required disabled={locked}
            value={localTime(form.starts_at)}
            onChange={(event) => field('starts_at', event.target.value ? new Date(event.target.value).toISOString() : '')} />
        </label>
        <label>Kết thúc (giờ địa phương)
          <input className="field-input" type="datetime-local" required
            value={localTime(form.ends_at)}
            onChange={(event) => field('ends_at', event.target.value ? new Date(event.target.value).toISOString() : '')} />
        </label>
        <label>Tổng lượt (trống = không giới hạn)
          <input className="field-input" type="number" min="1" step="1" value={form.global_limit ?? ''}
            onChange={(event) => field('global_limit', event.target.value ? Number(event.target.value) : null)} />
        </label>
        <label>Lượt mỗi khách hàng
          <input className="field-input" type="number" required min="1" step="1" value={form.customer_limit}
            onChange={(event) => field('customer_limit', Number(event.target.value))} />
        </label>
        <label className="flex gap-2"><input type="checkbox" checked={form.enabled}
          onChange={(event) => field('enabled', event.target.checked)} />Bật voucher</label>
      </fieldset>
      {form.scope === 'ALL' && <p className="text-xs text-[#606863]">Áp dụng cho tất cả sản phẩm đủ điều kiện. Không cần chọn danh mục hoặc sản phẩm.</p>}
      <div className="flex gap-3">
        {canWrite && <button disabled={busy} className="admin-primary">{busy ? 'Đang lưu…' : 'Lưu voucher'}</button>}
        <button type="button" className="admin-secondary" disabled={busy} onClick={onClose}>Đóng</button>
      </div>
    </form>
  </Modal>;
