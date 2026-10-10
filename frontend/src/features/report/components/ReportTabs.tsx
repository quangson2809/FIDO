import { useNavigate } from 'react-router-dom';
import { useSalesReport, useOrdersReport, useProductsReport, useDashboardReport } from '../hooks/useReportQuery';
import type { TrendQuery } from '../types';
import { orderDrilldown, reportSearch } from '../model/reportFilters';
import { ReportFeedback, RevenueKpis, SalesSection, StatusDistribution, OrdersSection, ProductsSection } from './ReportSections';
import { Link } from 'react-router-dom';

export function SalesReport({ query }: { query: TrendQuery }) {
  const result = useSalesReport(query);
  return <><ReportFeedback {...result} onRetry={result.reload} />{result.data && <><RevenueKpis overview={result.data.overview} /><SalesSection report={result.data.trend} /></>}</>;
}
export function OrdersReport({ query, canReadOrders }: { query: TrendQuery; canReadOrders: boolean }) {
  const result = useOrdersReport(query);
  const navigate = useNavigate();
  return <><ReportFeedback {...result} onRetry={result.reload} />{result.data && <>
    <article className="report-card"><h2>Tổng đơn theo ngày tạo</h2><p className="admin-metric">{Object.values(result.data.overview.orders_by_status).reduce((sum, count) => sum + count, 0)}</p></article>
    <StatusDistribution counts={result.data.overview.orders_by_status} getLink={canReadOrders ? (status) => orderDrilldown(query, status) : undefined} />
    <OrdersSection report={result.data.trend} getPeriodLink={canReadOrders ? (period) => orderDrilldown(query, undefined, period) : undefined} onPeriod={canReadOrders ? (period) => navigate(orderDrilldown(query, undefined, period)) : undefined} />
  </>}</>;
}
export function ProductsReport({ query, canReadCatalog }: { query: TrendQuery; canReadCatalog: boolean }) {
  const result = useProductsReport(query);
  return <><ReportFeedback {...result} onRetry={result.reload} />{result.data && <ProductsSection report={result.data} canReadCatalog={canReadCatalog} />}</>;
}
export function DashboardAnalytics({ query, canReadCatalog }: { query: TrendQuery; canReadCatalog: boolean }) {
  const result = useDashboardReport(query);
  return <section aria-label="Phân tích kinh doanh" className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-serif text-2xl">Kinh doanh 30 ngày gần nhất</h2><p className="report-description">{query.from} → {query.to} · Múi giờ Việt Nam</p></div><Link className="report-link" to={`/admin/reports?${reportSearch(query, 'sales')}`}>Mở báo cáo doanh số →</Link></div>
    <ReportFeedback {...result} onRetry={result.reload} />{result.data && <>
      <RevenueKpis overview={result.data.overview} showOrders />
      <SalesSection report={result.data.trend} />
      <ProductsSection report={result.data.products} canReadCatalog={canReadCatalog} preview />
      <Link className="report-link inline-block" to={`/admin/reports?${reportSearch(query, 'products')}`}>Xem xếp hạng sản phẩm →</Link>
    </>}
  </section>;
}
