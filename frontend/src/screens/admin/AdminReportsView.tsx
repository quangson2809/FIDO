import { useSearchParams } from 'react-router-dom';
import { useAuthSession } from '../../features/auth/session/useAuthSession';
import { canAccessAdminModule } from '../../features/auth/session/adminAccessPolicy';
import { ReportFilters } from '../../features/report/components/ReportFilters';
import { SalesReport, OrdersReport, ProductsReport } from '../../features/report/components/ReportTabs';
import { readReportFilters, reportSearch } from '../../features/report/model/reportFilters';
import type { ReportTab, TrendQuery } from '../../features/report/types';

const tabs: readonly { key: ReportTab; label: string }[] = [
  { key: 'sales', label: 'Doanh số' }, { key: 'orders', label: 'Đơn hàng' }, { key: 'products', label: 'Sản phẩm' },
];
export function AdminReportsView() {
  const [params, setParams] = useSearchParams();
  const filters = readReportFilters(params);
  const { profile, permissionCodes } = useAuthSession();
  if (!canAccessAdminModule('reports', profile, permissionCodes)) return <section role="alert" className="admin-state">Không có quyền xem báo cáo. Cần REPORT_READ dành cho ADMIN.</section>;
  const change = (query: TrendQuery, tab: ReportTab = filters.tab) => setParams(reportSearch(query, tab));
  const query: TrendQuery = { from: filters.from, to: filters.to, granularity: filters.granularity };
  const key = `${filters.from}/${filters.to}/${filters.granularity}`;
  return <section className="space-y-6 min-w-0">
    <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">FIDO Analytics</p><h1 className="mt-1 font-serif text-3xl text-[#071A12]">Báo cáo kinh doanh</h1><p className="mt-2 max-w-3xl text-sm text-[#606863]">Doanh số và sản phẩm theo ngày hoàn tất; số đơn và trạng thái hiện tại theo ngày tạo. Trả hàng điều chỉnh kỳ hoàn tất ban đầu. Múi giờ Asia/Ho_Chi_Minh.</p></header>
    <ReportFilters key={`${filters.from}/${filters.to}`} query={query} onChange={(value) => change(value)} />
    <nav aria-label="Loại báo cáo" className="flex flex-wrap gap-2">{tabs.map((tab) => <button key={tab.key} type="button" aria-current={tab.key === filters.tab ? 'page' : undefined} className={tab.key === filters.tab ? 'admin-primary' : 'admin-secondary'} onClick={() => change(query, tab.key)}>{tab.label}</button>)}</nav>
    {!filters.valid ? <p role="alert" className="admin-state">Bộ lọc URL không hợp lệ. Chọn khoảng ngày và chu kỳ hợp lệ để tiếp tục.</p> : filters.tab === 'sales' ? <SalesReport key={key} query={query} /> : filters.tab === 'orders' ? <OrdersReport key={key} query={query} canReadOrders={canAccessAdminModule('orders', profile, permissionCodes)} /> : <ProductsReport key={key} query={query} canReadCatalog={canAccessAdminModule('products', profile, permissionCodes)} />}
  </section>;
}
