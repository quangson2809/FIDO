import { useCallback, useState } from 'react';
import { useRemoteQuery } from '../../shared/hooks/useRemoteQuery';
import { QueryFeedback } from '../../shared/admin/QueryFeedback';
import { voucherService } from '../../features/promotion/api/service';
import { VoucherForm } from '../../features/promotion/components/VoucherForm';
import type { VoucherDetail } from '../../features/promotion/types';

export function AdminVouchersView({ canWrite, showToast }: { canWrite: boolean; showToast: (message: string) => void }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<{ voucher: VoucherDetail | null } | null>(null);
  const list = useRemoteQuery(useCallback(() => voucherService.list(query, page), [query, page]));
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="font-serif text-3xl">Voucher</h1><p>Quản lý ưu đãi tiền hàng, điều kiện và lượt sử dụng.</p></div>{canWrite && <button className="admin-primary" onClick={() => setEditing({ voucher: null })}>Tạo voucher</button>}</header>
    <form className="flex gap-3" onSubmit={e => { e.preventDefault(); setPage(1); setQuery(search.trim()); list.reload(); }}><input aria-label="Tìm mã voucher" className="field-input min-w-0" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã voucher" /><button className="admin-secondary">Tìm</button></form>
    <QueryFeedback loading={list.loading} error={list.error} onRetry={list.reload} empty={!list.loading && !list.error && list.data?.data.length === 0} filtered={Boolean(query)} />
    {!list.loading && !list.error && <div className="overflow-x-auto rounded border bg-white"><table className="min-w-full text-left text-sm"><thead><tr>{['Mã', 'Mức giảm', 'Phạm vi', 'Hiệu lực', 'Lượt đang tính', 'Trạng thái', 'Thao tác'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{list.data?.data.map(v => <tr key={v.voucher_id} className="border-t"><td className="p-3 font-semibold">{v.code}</td><td className="p-3">{v.discount_value?.toLocaleString('vi-VN')}{v.discount_type === 'PERCENTAGE' ? '%' : '₫'}</td><td className="p-3">{v.scope === 'ALL' ? 'Tất cả' : v.scope === 'PRODUCT' ? 'Sản phẩm' : 'Danh mục'}</td><td className="p-3">{v.starts_at ? new Date(v.starts_at).toLocaleString('vi-VN') : 'Chưa cấu hình'}<br />{v.ends_at && new Date(v.ends_at).toLocaleString('vi-VN')}</td><td className="p-3">{v.active_usage} / {v.global_limit ?? '∞'}</td><td className="p-3">{v.enabled ? 'Đang bật' : 'Đang tắt'}</td><td className="p-3"><button className="underline" onClick={() => setEditing({ voucher: v })}>{canWrite ? 'Xem / Sửa' : 'Chi tiết'}</button></td></tr>)}</tbody></table></div>}
    <nav aria-label="Phân trang voucher" className="flex items-center gap-4"><button className="admin-secondary" disabled={page <= 1 || list.loading} onClick={() => setPage(p => p - 1)}>Trước</button><span>Trang {page}</span><button className="admin-secondary" disabled={list.loading || page >= (list.data?.meta.total_pages ?? 0)} onClick={() => setPage(p => p + 1)}>Sau</button></nav>
    {editing && <VoucherForm voucher={editing.voucher} canWrite={canWrite} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.reload(); showToast('Đã lưu voucher.'); }} />}
  </div>;
}
