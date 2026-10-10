import type { SizeSystemPatchInput } from '../types';

type SizeValues = NonNullable<SizeSystemPatchInput['size_values']>;

export function SizeValueFields({ values, onChange }: { values: SizeValues; onChange: (values: SizeValues) => void }) {
  const update = (index: number, patch: Partial<SizeValues[number]>) => onChange(values.map((value, i) => i === index ? { ...value, ...patch } : value));
  return <section aria-label="Các kích cỡ trong hệ" className="col-span-full space-y-4">
    <div className="rounded-lg border border-[#E2E5DE] bg-[#F8FAF4] p-4 text-sm leading-6"><p>Mỗi size có mã, tên hiển thị và thứ tự. Size đã được sử dụng chỉ có thể đổi thứ tự.</p><p>Xóa một dòng rồi lưu để xóa size khỏi hệ.</p></div>
    {values.length === 0 && <p className="p-4 text-sm text-[#606863]">Chưa có size. Chọn “Thêm size” để bắt đầu.</p>}
    {values.map((value, index) => <fieldset key={value.size_value_id ?? `new-${index}`} className="rounded-xl border border-[#E2E5DE] bg-white p-4">
      <legend className="px-2 text-sm font-semibold">Size {index + 1}{value.display_name && ` · ${value.display_name}`}</legend>
      <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.5fr_100px_auto]">
        <label className="space-y-1"><span className="block text-sm font-semibold">Mã size *</span><input className="w-full" required maxLength={50} value={value.code} onChange={event => update(index, { code: event.target.value })} placeholder="Ví dụ: M" /></label>
        <label className="space-y-1"><span className="block text-sm font-semibold">Tên hiển thị *</span><input className="w-full" required maxLength={100} value={value.display_name} onChange={event => update(index, { display_name: event.target.value })} placeholder="Ví dụ: Medium" /></label>
        <label className="space-y-1"><span className="block text-sm font-semibold">Thứ tự *</span><input className="w-full" required type="number" step="1" min={-2147483648} max={2147483647} value={Number.isNaN(value.sort_order) ? '' : value.sort_order} onChange={event => update(index, { sort_order: event.target.valueAsNumber })} /></label>
        <button type="button" className="admin-danger" aria-label={`Xóa size ${index + 1}`} onClick={() => onChange(values.filter((_, i) => i !== index))}>Xóa dòng</button>
      </div>
    </fieldset>)}
    <button type="button" className="admin-secondary" onClick={() => onChange([...values, { code: '', display_name: '', sort_order: values.length }])}>Thêm size</button>
  </section>;
}
