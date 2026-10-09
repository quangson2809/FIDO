import { formatVietnamDateTime } from '../../shared/time/formatVietnamDateTime';
import { statusLabel } from '../../shared/admin/statusLabels';
import { useRemoteQuery } from '../../shared/hooks/useRemoteQuery';
import { QueryFeedback } from '../../shared/admin/QueryFeedback';
import { Pagination } from '../../shared/admin/Pagination';
import { Modal } from '../../shared/admin/Modal';
import React, { useCallback, useState } from 'react';
import { adminAccessService } from '../../features/adminAccess/api/service';


interface AdminCustomersViewProps {
  initialCustomerId?: number;
  onSelectCustomer?: (customerId: number) => void;
  onCloseDetail?: () => void;
  showToast: (msg: string) => void;
}

export const AdminCustomersView: React.FC<AdminCustomersViewProps> = ({
  initialCustomerId,
  onSelectCustomer,
  onCloseDetail,
}) => {
  const [queryDraft, setQueryDraft] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [localCustomerId, setLocalCustomerId] = useState<number | null>(null);
  const list = useRemoteQuery(useCallback(() => adminAccessService.getCustomers({ q: query || undefined, page, page_size: 20 }), [query, page]));
  const customers = list.data?.data ?? [];
  const loading = list.loading;
  const openDetail = (id: number) => onSelectCustomer ? onSelectCustomer(id) : setLocalCustomerId(id);
  const closeDetail = () => { setLocalCustomerId(null); onCloseDetail?.(); };
  const detailId = initialCustomerId ?? localCustomerId;

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">Customer accounts</p>
        <h1 className="mt-1 font-serif text-3xl text-[#0B2419]">Khách hàng</h1>
        <p className="mt-2 max-w-3xl text-sm text-[#606863]">Tra cứu thông tin liên hệ, địa chỉ và lịch sử mua hàng của khách hàng.</p>
      </header>

      <form onSubmit={(event) => { event.preventDefault(); setPage(1); list.reload(); setQuery(queryDraft.trim()); }} className="flex max-w-2xl gap-3">
        <input aria-label="Tìm theo số điện thoại hoặc email" value={queryDraft} onChange={(event) => setQueryDraft(event.target.value)} placeholder="Tìm theo số điện thoại hoặc email" className="min-w-0 flex-1 border border-[#D9DDD6] bg-white px-3 py-2 text-sm" />
        <button type="submit" className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white">Tìm</button>
      </form>

      <QueryFeedback error={list.error} onRetry={list.reload} />

      <div className="overflow-x-auto border border-[#E8E9E3] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F5F6F2] text-xs uppercase text-[#687069]"><tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Điện thoại</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Số đơn</th><th className="px-4 py-3">Đơn gần nhất</th><th className="px-4 py-3" /></tr></thead>
          <tbody className="divide-y divide-[#E8E9E3]">
            {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-[#687069]">Đang tải...</td></tr> : list.error ? null : customers.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-[#687069]">Không có khách hàng phù hợp.</td></tr> : customers.map((customer) => (
              <tr key={customer.account_id}>
                <td className="px-4 py-3 font-mono">#{customer.account_id}</td>
                <td className="px-4 py-3 font-semibold">{customer.phone}</td>
                <td className="px-4 py-3">{customer.email ?? '—'}</td>
                <td className="px-4 py-3">{customer.order_count}</td>
                <td className="px-4 py-3">{formatVietnamDateTime(customer.last_order_at)}</td>
                <td className="px-4 py-3 text-right"><button type="button" onClick={() => void openDetail(customer.account_id)} className="border border-[#0B2419] px-3 py-1.5 text-xs font-semibold">Chi tiết</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination meta={list.data?.meta} loading={loading} onPage={setPage} />
      {detailId && <CustomerDetail key={detailId} customerId={detailId} onClose={closeDetail} />}
    </section>
  );
};

function CustomerDetail({ customerId, onClose }: { customerId: number; onClose: () => void }) {
  const query = useRemoteQuery(useCallback(() => adminAccessService.getCustomer(customerId), [customerId]));
  const detail = query.data;
  return <Modal title="Hồ sơ khách hàng" onClose={onClose}>
    <QueryFeedback loading={query.loading} error={query.error} onRetry={query.reload} />
    {detail && <div className="space-y-4"><h3>{detail.account.phone}</h3><p>{detail.account.email ?? 'Không có email'}</p>
      <h3>Địa chỉ</h3>{detail.addresses.length ? detail.addresses.map((address) => <p key={address.address_id}>{address.address_text}</p>) : <p>Chưa có địa chỉ.</p>}
      <h3>Đơn hàng gần đây</h3>{detail.orders.length ? detail.orders.map((order) => <p key={order.order_id}>{order.order_code} · {statusLabel(order.order_status)} · {order.total.toLocaleString('vi-VN')}₫</p>) : <p>Chưa có đơn hàng.</p>}
    </div>}
  </Modal>;
}
