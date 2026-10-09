import { useRef, useState, type FormEvent } from 'react';
import type { VoucherDetail, VoucherInput } from '../types';
import { voucherService } from '../api/service';
import { Modal } from '../../../shared/admin/Modal';
import { getApiErrorMessage } from '../../../services/http/apiError';

const blank: VoucherInput = { code: '', discount_type: 'FIXED_AMOUNT', discount_value: 0, maximum_discount: null,
  minimum_amount: 0, starts_at: '', ends_at: '', scope: 'ALL', product_ids: [], category_ids: [],
  global_limit: null, customer_limit: 1, enabled: false };
const localTime = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export function VoucherForm({ voucher, canWrite, onClose, onSaved }: {
  voucher: VoucherDetail | null; canWrite: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<VoucherInput>(voucher ?? blank);
  const [targets, setTargets] = useState((voucher?.scope === 'PRODUCT' ? voucher.product_ids : voucher?.category_ids ?? []).join(', '));
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const locked = voucher?.ever_used === true;
  const field = <K extends keyof VoucherInput>(key: K, value: VoucherInput[K]) => setForm(current => ({ ...current, [key]: value }));
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (pending.current || !canWrite) return;
    const ids = targets.trim() ? targets.split(',').map(value => Number(value.trim())) : [];
    if (form.scope !== 'ALL' && (!ids.length || ids.some(id => !Number.isSafeInteger(id) || id <= 0))) {
      setError('Nhập các ID sản phẩm hoặc danh mục hợp lệ, phân cách bằng dấu phẩy.'); return;
    }
    if (new Date(form.ends_at) <= new Date(form.starts_at)) { setError('Ngày kết thúc phải sau ngày bắt đầu.'); return; }
    pending.current = true; setBusy(true); setError(null);
    try {
      const input = { ...form, code: form.code.trim(), product_ids: form.scope === 'PRODUCT' ? ids : [], category_ids: form.scope === 'CATEGORY' ? ids : [] };
      if (voucher) await voucherService.update(voucher.voucher_id, input); else await voucherService.create(input);
      onSaved();
    } catch (error: unknown) { setError(getApiErrorMessage(error, 'Không thể lưu voucher.')); }
    finally { pending.current = false; setBusy(false); }
  };
  return <Modal title={voucher ? `Voucher ${voucher.code}` : 'Tạo voucher'} onClose={onClose} busy={busy}>
    <form onSubmit={save} className="space-y-4">
      {locked && <p className="text-sm">Đã có lượt sử dụng: chỉ được gia hạn, tăng giới hạn hoặc bật/tắt.</p>}
      {voucher && <p className="text-sm">Lượt đang tính: {voucher.active_usage}. Hủy đơn hoàn lượt; trả hàng không hoàn lượt.</p>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <fieldset disabled={busy || !canWrite} className="grid gap-4 sm:grid-cols-2">
        <label>Mã voucher<input className="field-input" required maxLength={80} disabled={locked} value={form.code} onChange={e => field('code', e.target.value)} /></label>
        <label>Loại giảm<select className="field-input" disabled={locked} value={form.discount_type} onChange={e => { if (e.target.value === 'FIXED_AMOUNT' || e.target.value === 'PERCENTAGE') field('discount_type', e.target.value); }}><option value="FIXED_AMOUNT">Số tiền</option><option value="PERCENTAGE">Phần trăm</option></select></label>
        <label>Giá trị giảm<input className="field-input" type="number" required min="0.01" step="0.01" max={form.discount_type === 'PERCENTAGE' ? 100 : undefined} disabled={locked} value={form.discount_value} onChange={e => field('discount_value', Number(e.target.value))} /></label>
        <label>Giảm tối đa (bắt buộc cho %)<input className="field-input" type="number" min="0.01" step="0.01" required={form.discount_type === 'PERCENTAGE'} disabled={locked} value={form.maximum_discount ?? ''} onChange={e => field('maximum_discount', e.target.value ? Number(e.target.value) : null)} /></label>
        <label>Tiền hàng đủ điều kiện tối thiểu<input className="field-input" type="number" required min="0" step="0.01" disabled={locked} value={form.minimum_amount} onChange={e => field('minimum_amount', Number(e.target.value))} /></label>
        <label>Phạm vi<select className="field-input" disabled={locked} value={form.scope} onChange={e => { const value = e.target.value; if (value === 'ALL' || value === 'PRODUCT' || value === 'CATEGORY') { field('scope', value); setTargets(''); } }}><option value="ALL">Toàn bộ sản phẩm</option><option value="CATEGORY">Danh mục và danh mục con</option><option value="PRODUCT">Sản phẩm</option></select></label>
        {form.scope !== 'ALL' && <label className="sm:col-span-2">{form.scope === 'PRODUCT' ? 'ID sản phẩm' : 'ID danh mục'} (phân cách bằng dấu phẩy)<input className="field-input" required disabled={locked} value={targets} onChange={e => setTargets(e.target.value)} /></label>}
        <label>Bắt đầu (giờ địa phương)<input className="field-input" type="datetime-local" required disabled={locked} value={localTime(form.starts_at)} onChange={e => field('starts_at', e.target.value ? new Date(e.target.value).toISOString() : '')} /></label>
        <label>Kết thúc (giờ địa phương)<input className="field-input" type="datetime-local" required value={localTime(form.ends_at)} onChange={e => field('ends_at', e.target.value ? new Date(e.target.value).toISOString() : '')} /></label>
        <label>Tổng lượt (trống = không giới hạn)<input className="field-input" type="number" min="1" step="1" value={form.global_limit ?? ''} onChange={e => field('global_limit', e.target.value ? Number(e.target.value) : null)} /></label>
        <label>Lượt mỗi khách hàng<input className="field-input" type="number" required min="1" step="1" value={form.customer_limit} onChange={e => field('customer_limit', Number(e.target.value))} /></label>
        <label className="flex gap-2"><input type="checkbox" checked={form.enabled} onChange={e => field('enabled', e.target.checked)} />Bật voucher</label>
      </fieldset>
      <div className="flex gap-3">{canWrite && <button disabled={busy} className="admin-primary">{busy ? 'Đang lưu…' : 'Lưu voucher'}</button>}<button type="button" className="admin-secondary" disabled={busy} onClick={onClose}>Đóng</button></div>
    </form>
  </Modal>;
}
