import { useState } from 'react';
import { adminProductService } from '../api/adminService';
import type { AdminVariantDto } from '../types';
import { getApiErrorMessage } from '../../../services/http/apiError';
import { useDirtyForm } from '../../../shared/admin/dirtyFormContext';

export function VariantPriceEditor({ variant, onSaved, busy, onBusyChange }: { busy: boolean; onBusyChange: (busy: boolean) => void; variant: AdminVariantDto; onSaved: (variant: AdminVariantDto) => void }) {
  const [value, setValue] = useState(variant.override_price === null ? '' : String(variant.override_price));
  const [error, setError] = useState<string | null>(null);
  const dirty = value !== (variant.override_price === null ? '' : String(variant.override_price));
  useDirtyForm(dirty);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const price = value.trim() ? Number(value) : null;
    if (busy || !dirty || (price !== null && (!Number.isFinite(price) || price < 0))) return;
    onBusyChange(true); setError(null);
    try {
      const updated = await adminProductService.updateVariant(variant.product_id, variant.variant_id, { override_price: price });
      setValue(updated.override_price === null ? '' : String(updated.override_price));
      onSaved(updated);
    } catch (failure: unknown) { setError(getApiErrorMessage(failure, 'Không thể lưu giá riêng.')); }
    finally { onBusyChange(false); }
  };
  return <form onSubmit={save} className="mt-3 space-y-2"><label className="block text-xs">Giá riêng (₫)<input aria-label={`Giá riêng ${variant.sku ?? variant.variant_id}`} disabled={busy} type="number" min="0" step="0.01" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Dùng giá cơ sở" className="mt-1 w-full border border-[#D9DDD6] px-3 py-2" /></label><p className="text-xs text-[#606863]">Để trống để dùng giá cơ sở của sản phẩm.</p>{error && <p role="alert" className="text-xs text-red-700">{error}</p>}<button type="submit" disabled={busy || !dirty} className="admin-secondary">{busy ? 'Đang lưu…' : 'Lưu giá'}</button></form>;
}
