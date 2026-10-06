import React, { useEffect, useState } from 'react';
import { adminAccessService } from '../../features/adminAccess/api/service';
import type { CustomerDetailDto, CustomerSummaryDto } from '../../features/adminAccess/types';

const formatDate = (value: string | null): string => value
  ? new Date(value).toLocaleString('vi-VN')
  : 'Chưa có đơn';

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
  showToast,
}) => {
  const [queryDraft, setQueryDraft] = useState('');
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<CustomerSummaryDto[]>([]);
  const [detail, setDetail] = useState<CustomerDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await adminAccessService.getCustomers({ q: query || undefined, page: 0, page_size: 50 });
        if (!active) return;
        setCustomers(response.data);
        setError(null);
      } catch {
        if (active) setError('Không thể tải danh sách khách hàng.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [query]);

  useEffect(() => {
    if (!initialCustomerId) return undefined;

    let active = true;
    setDetailLoading(true);
    void adminAccessService.getCustomer(initialCustomerId)
      .then((result) => {
        if (active) setDetail(result);
      })
      .catch(() => {
        if (active) showToast('Không thể tải hồ sơ khách hàng.');
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });

    return () => { active = false; };
  }, [initialCustomerId, showToast]);

  const openDetail = async (customerId: number) => {
    if (onSelectCustomer) {
      onSelectCustomer(customerId);
      return;
    }

    setDetailLoading(true);
    try {
      setDetail(await adminAccessService.getCustomer(customerId));
    } catch {
      showToast('Không thể tải hồ sơ khách hàng.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetail(null);
    onCloseDetail?.();
  };

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">Customer accounts</p>
        <h1 className="mt-1 font-serif text-3xl text-[#0B2419]">Khách hàng</h1>
        <p className="mt-2 max-w-3xl text-sm text-[#606863]">Dữ liệu lấy từ API tài khoản khách hàng. Không hiển thị loyalty, số đo hay CRM note khi backend không có contract tương ứng.</p>
      </header>

      <form onSubmit={(event) => { event.preventDefault(); setLoading(true); setQuery(queryDraft.trim()); }} className="flex max-w-2xl gap-3">
        <input value={queryDraft} onChange={(event) => setQueryDraft(event.target.value)} placeholder="Tìm theo số điện thoại hoặc email" className="min-w-0 flex-1 border border-[#D9DDD6] bg-white px-3 py-2 text-sm" />
        <button type="submit" className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white">Tìm</button>
      </form>

      {error && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-x-auto border border-[#E8E9E3] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F5F6F2] text-xs uppercase text-[#687069]"><tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Điện thoại</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Số đơn</th><th className="px-4 py-3">Đơn gần nhất</th><th className="px-4 py-3" /></tr></thead>
          <tbody className="divide-y divide-[#E8E9E3]">
            {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-[#687069]">Đang tải...</td></tr> : customers.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-[#687069]">Không có khách hàng phù hợp.</td></tr> : customers.map((customer) => (
              <tr key={customer.account_id}>
                <td className="px-4 py-3 font-mono">#{customer.account_id}</td>
                <td className="px-4 py-3 font-semibold">{customer.phone}</td>
                <td className="px-4 py-3">{customer.email ?? '—'}</td>
                <td className="px-4 py-3">{customer.order_count}</td>
                <td className="px-4 py-3">{formatDate(customer.last_order_at)}</td>
                <td className="px-4 py-3 text-right"><button type="button" onClick={() => void openDetail(customer.account_id)} className="border border-[#0B2419] px-3 py-1.5 text-xs font-semibold">Chi tiết</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={closeDetail}>
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto bg-white p-6 shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
            {detailLoading || !detail ? (
              <div className="py-12 text-center text-sm text-[#687069]">Đang tải hồ sơ khách hàng...</div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-wider text-[#687069]">Tài khoản #{detail.account.account_id}</p><h2 className="font-serif text-2xl">{detail.account.phone}</h2><p className="text-sm text-[#687069]">{detail.account.email ?? 'Không có email'}</p></div><button type="button" onClick={closeDetail} className="text-2xl">×</button></div>
                <h3 className="mt-6 font-bold">Địa chỉ</h3>
                <div className="mt-2 space-y-2">{detail.addresses.length === 0 ? <p className="text-sm text-[#687069]">Chưa có địa chỉ.</p> : detail.addresses.map((address) => <div key={address.address_id} className="border border-[#E8E9E3] p-3 text-sm">{address.address_text}</div>)}</div>
                <h3 className="mt-6 font-bold">Đơn hàng gần đây</h3>
                <div className="mt-2 space-y-2">{detail.orders.length === 0 ? <p className="text-sm text-[#687069]">Chưa có đơn hàng.</p> : detail.orders.map((order) => <div key={order.order_id} className="flex justify-between gap-4 border border-[#E8E9E3] p-3 text-sm"><span>{order.order_code} · {order.order_status}</span><strong>{order.total.toLocaleString('vi-VN')}₫</strong></div>)}</div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
