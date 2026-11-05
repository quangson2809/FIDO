import { useRef, useState, type FormEvent } from 'react';
import type { VoucherDetail, VoucherInput, VoucherStatus } from '../types';
import { voucherService } from '../api/service';
import { Modal } from '../../../shared/admin/Modal';
import { getApiErrorMessage } from '../../../services/http/apiError';
import {
  voucherRequestFields,
  voucherSubmission,
  voucherStatusOptions,
  voucherStatusLabel,
} from '../model/voucherFormModel';

const blank: VoucherInput = {
  code: '',
  discount_type: 'FIXED',
  discount_value: 0,
  minimum_order_value: 0,
  maximum_discount: null,
  starts_at: null,
  ends_at: null,
  usage_limit: null,
};
const localTime = (value: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function VoucherForm({
  voucher,
  canWrite,
  onClose,
  onSaved,
}: {
  voucher: VoucherDetail | null;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<VoucherInput>(() =>
    voucher ? voucherRequestFields(voucher) : blank,
  );
  const [status, setStatus] = useState<VoucherStatus>(voucher?.status ?? 'DRAFT');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const field = <K extends keyof VoucherInput>(key: K, value: VoucherInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (pending.current || !canWrite) return;
    const input = voucherSubmission(form);
    if (
      !Number.isSafeInteger(input.discount_value) ||
      input.discount_value <= 0 ||
      (input.discount_type === 'PERCENT' && input.discount_value > 10000)
    ) {
      setError('Giá trị giảm phải là số tiền VND nguyên dương hoặc tỷ lệ từ 0,01% đến 100%.');
      return;
    }
    if (input.starts_at && input.ends_at && new Date(input.ends_at) <= new Date(input.starts_at)) {
      setError('Ngày kết thúc phải sau ngày bắt đầu.');
      return;
    }
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      if (voucher) await voucherService.update(voucher.id, { ...input, status });
      else await voucherService.create(input);
      onSaved();
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể lưu voucher.'));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return (
    <Modal
      title={voucher ? `Voucher ${voucher.code}` : 'Tạo voucher'}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={save} className="space-y-4">
        <p className="text-sm">
          {voucher
            ? `Đã sử dụng: ${voucher.usage_count} lượt.`
            : 'Voucher mới được lưu ở trạng thái bản nháp. Mở lại để kích hoạt.'}
        </p>
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
        <fieldset disabled={busy || !canWrite} className="grid gap-4 sm:grid-cols-2">
          <label>
            Mã voucher
            <input
              className="field-input"
              required
              maxLength={80}
              value={form.code}
              onChange={(event) => field('code', event.target.value)}
            />
          </label>
          <label>
            Loại giảm
            <select
              className="field-input"
              value={form.discount_type}
              onChange={(event) => {
                const value = event.target.value;
                if (value === 'FIXED' || value === 'PERCENT')
                  setForm((current) => ({ ...current, discount_type: value, discount_value: 0 }));
              }}
            >
              <option value="FIXED">Số tiền</option>
              <option value="PERCENT">Phần trăm</option>
            </select>
          </label>
          <label>
            {form.discount_type === 'PERCENT' ? 'Giá trị giảm (%)' : 'Giá trị giảm (VND)'}
            <input
              className="field-input"
              type="number"
              required
              min={form.discount_type === 'PERCENT' ? '0.01' : '1'}
              step={form.discount_type === 'PERCENT' ? '0.01' : '1'}
              max={form.discount_type === 'PERCENT' ? 100 : undefined}
              value={
                form.discount_type === 'PERCENT' ? form.discount_value / 100 : form.discount_value
              }
              onChange={(event) =>
                field(
                  'discount_value',
                  form.discount_type === 'PERCENT'
                    ? Math.round(Number(event.target.value) * 100)
                    : Number(event.target.value),
                )
              }
            />
          </label>
          <label>
            Giảm tối đa (VND, trống = không giới hạn)
            <input
              className="field-input"
              type="number"
              min="0"
              step="1"
              value={form.maximum_discount ?? ''}
              onChange={(event) =>
                field('maximum_discount', event.target.value ? Number(event.target.value) : null)
              }
            />
          </label>
          <label>
            Giá trị đơn hàng tối thiểu (VND)
            <input
              className="field-input"
              type="number"
              required
              min="0"
              step="1"
              value={form.minimum_order_value}
              onChange={(event) => field('minimum_order_value', Number(event.target.value))}
            />
          </label>
          <label>
            Tổng lượt (trống = không giới hạn)
            <input
              className="field-input"
              type="number"
              min={Math.max(1, voucher?.usage_count ?? 0)}
              step="1"
              value={form.usage_limit ?? ''}
              onChange={(event) =>
                field('usage_limit', event.target.value ? Number(event.target.value) : null)
              }
            />
          </label>
          <label>
            Bắt đầu (giờ địa phương, tùy chọn)
            <input
              className="field-input"
              type="datetime-local"
              value={localTime(form.starts_at)}
              onChange={(event) =>
                field(
                  'starts_at',
                  event.target.value ? new Date(event.target.value).toISOString() : null,
                )
              }
            />
          </label>
          <label>
            Kết thúc (giờ địa phương, tùy chọn)
            <input
              className="field-input"
              type="datetime-local"
              value={localTime(form.ends_at)}
              onChange={(event) =>
                field(
                  'ends_at',
                  event.target.value ? new Date(event.target.value).toISOString() : null,
                )
              }
            />
          </label>
          {voucher && (
            <label>
              Trạng thái
              <select
                className="field-input"
                value={status}
                onChange={(event) => {
                  const next = voucherStatusOptions[voucher.status].find(
                    (value) => value === event.target.value,
                  );
                  if (next) setStatus(next);
                }}
              >
                {voucherStatusOptions[voucher.status].map((value) => (
                  <option key={value} value={value}>
                    {voucherStatusLabel[value]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </fieldset>
        <div className="flex gap-3">
          {canWrite && (
            <button disabled={busy} className="admin-primary">
              {busy ? 'Đang lưu…' : 'Lưu voucher'}
            </button>
          )}
          <button type="button" className="admin-secondary" disabled={busy} onClick={onClose}>
            Đóng
          </button>
        </div>
      </form>
    </Modal>
  );
}
