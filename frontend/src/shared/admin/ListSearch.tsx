export function ListSearch({ label, value, onChange, count }: { label: string; value: string; onChange: (value: string) => void; count: number }) {
  return <div className="flex flex-wrap items-end gap-3">
    <label className="min-w-0 flex-1 space-y-1"><span className="block text-sm font-semibold">{label}</span><input type="search" value={value} onChange={event => onChange(event.target.value)} className="w-full" /></label>
    {value && <button type="button" onClick={() => onChange('')} className="admin-secondary">Xóa tìm kiếm</button>}
    <p role="status" className="py-3 text-sm text-[#606863]">{count} kết quả</p>
  </div>;
}
