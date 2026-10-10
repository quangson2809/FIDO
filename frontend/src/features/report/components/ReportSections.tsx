import { Link } from 'react-router-dom';
import { QueryFeedback } from '../../../shared/admin/QueryFeedback';
import type { ApiClientError } from '../../../services/http/apiError';
import { statusLabel } from '../../../shared/admin/statusLabels';
import type { ReportOverviewDto, SalesTrendDto, OrdersTrendDto, ProductPerformanceDto, StatusCounts } from '../types';
import { reportStatuses } from '../types';
import { SalesChart, OrdersChart } from './ReportCharts';
import { formatReportMoney } from '../model/formatReportMoney';

export function ReportFeedback({ loading, error, onRetry }: { loading: boolean; error: ApiClientError | null; onRetry: () => void }) {
  if (loading) return <div role="status" aria-label="Đang tải báo cáo" className="grid animate-pulse gap-4 sm:grid-cols-3">{[1, 2, 3].map((key) => <div key={key} className="h-28 rounded-lg bg-[#E2E5DE]" />)}<span className="sr-only">Đang tải báo cáo…</span></div>;
  return <QueryFeedback error={error} onRetry={onRetry} />;
}
export function RevenueKpis({ overview, showOrders = false }: { overview: ReportOverviewDto; showOrders?: boolean }) {
  const metrics = [['Doanh số hoàn tất', formatReportMoney(overview.completed_sales)], ['Điều chỉnh trả hàng', formatReportMoney(overview.returned_adjustment)], ['Doanh số thuần', formatReportMoney(overview.net_sales)]];
  if (showOrders) metrics.push(['Đơn theo ngày tạo', String(reportStatuses.reduce((sum, status) => sum + overview.orders_by_status[status], 0))]);
  return <div className={`grid gap-4 sm:grid-cols-2 ${showOrders ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>{metrics.map(([label, value]) => <article key={label} className="report-card min-w-0"><p className="text-xs text-[#606863]">{label}</p><p className="mt-3 break-words font-serif text-2xl font-bold text-[#071A12]">{value}</p></article>)}</div>;
}
export function SalesSection({ report }: { report: SalesTrendDto }) {
  const empty = report.points.every((point) => point.completed_sales === 0 && point.returned_adjustment === 0);
  return <article className="report-card"><h2>Doanh số theo kỳ hoàn tất</h2><p className="report-description">{report.from} → {report.to} · Trả hàng điều chỉnh vào kỳ hoàn tất ban đầu.</p>
    {empty && <p role="status" className="report-empty">Chưa có doanh số trong khoảng này. Các kỳ được hiển thị với giá trị 0.</p>}
    <SalesChart points={report.points} />
    <details className="mt-4"><summary className="cursor-pointer font-semibold">Bảng doanh số chính xác</summary><div className="report-table-scroll"><table className="report-table"><caption className="sr-only">Doanh số theo kỳ (VND)</caption><thead><tr><th>Kỳ bắt đầu</th><th>Hoàn tất (₫)</th><th>Trả hàng (₫)</th><th>Thuần (₫)</th></tr></thead><tbody>{report.points.map((point) => <tr key={point.period_start}><th scope="row">{point.period_start}</th><td>{formatReportMoney(point.completed_sales)}</td><td>{formatReportMoney(point.returned_adjustment)}</td><td>{formatReportMoney(point.net_sales)}</td></tr>)}</tbody></table></div></details>
  </article>;
}
export function StatusDistribution({ counts, getLink }: { counts: StatusCounts; getLink?: (status: string) => string }) {
  const max = Math.max(1, ...Object.values(counts));
  return <article className="report-card"><h2>Phân bố trạng thái hiện tại</h2><p className="report-description">Đơn được chọn theo ngày tạo; không phải lịch sử chuyển trạng thái.</p><div className="mt-4 grid gap-4 sm:grid-cols-2">{reportStatuses.map((status) => <div key={status}>
    <div className="flex justify-between gap-2 text-sm">{getLink ? <Link className="report-link" to={getLink(status)}>{statusLabel(status)}</Link> : <span>{statusLabel(status)}</span>}<strong>{counts[status]} đơn</strong></div>
    <div className="mt-2 h-2 bg-[#E8E9E3]" aria-hidden="true"><div className="h-2 bg-[#1B5038]" style={{ width: `${counts[status] / max * 100}%` }} /></div>
  </div>)}</div></article>;
}
export function OrdersSection({ report, getPeriodLink, onPeriod }: { report: OrdersTrendDto; getPeriodLink?: (period: string) => string; onPeriod?: (period: string) => void }) {
  return <article className="report-card"><h2>Số đơn theo ngày tạo</h2>{report.points.every((point) => point.total_orders === 0) && <p role="status" className="report-empty">Chưa có đơn trong khoảng này.</p>}
    <OrdersChart points={report.points} onPeriod={onPeriod} />
    <details className="mt-4"><summary className="cursor-pointer font-semibold">Bảng số đơn theo trạng thái</summary><div className="report-table-scroll"><table className="report-table"><thead><tr><th>Kỳ bắt đầu</th><th>Tổng đơn</th>{reportStatuses.map((status) => <th key={status}>{statusLabel(status)}</th>)}</tr></thead><tbody>{report.points.map((point) => <tr key={point.period_start}><th scope="row">{getPeriodLink ? <Link className="report-link" to={getPeriodLink(point.period_start)}>{point.period_start}</Link> : point.period_start}</th><td>{point.total_orders}</td>{reportStatuses.map((status) => <td key={status}>{point.orders_by_status[status]}</td>)}</tr>)}</tbody></table></div></details>
  </article>;
}
export function ProductsSection({ report, canReadCatalog, preview = false }: { report: ProductPerformanceDto; canReadCatalog: boolean; preview?: boolean }) {
  const max = Math.max(1, ...report.items.map((item) => item.net_units));
  return <article className="report-card"><h2>{preview ? 'Top 5 sản phẩm' : 'Top sản phẩm bán thuần'}</h2><p className="report-description">Theo ngày hoàn tất · Gộp mọi biến thể · Trừ số lượng trả hàng toàn đơn.</p>
    {report.items.length === 0 ? <p className="report-empty" role="status">Chưa có sản phẩm hoàn tất trong khoảng này.</p> : <>
      {!preview && <div className="my-5 space-y-3" aria-label="Biểu đồ sản phẩm theo số lượng bán thuần">{report.items.map((item, index) => <div key={item.product_id}><div className="flex justify-between gap-3 text-sm"><span className="min-w-0 break-words">{index + 1}. {item.product_name}</span><strong className="shrink-0">{item.net_units} SP</strong></div><div className="mt-1 h-3 bg-[#E8E9E3]" aria-hidden="true"><div className="h-3 bg-[#1B5038]" style={{ width: `${item.net_units / max * 100}%` }} /></div></div>)}</div>}
      <div className="report-table-scroll"><table className="report-table"><caption className="sr-only">Xếp hạng sản phẩm theo số lượng bán thuần</caption><thead><tr><th>Sản phẩm</th>{!preview && <><th>Hoàn tất</th><th>Trả hàng</th></>}<th>Thuần (SP)</th></tr></thead><tbody>{report.items.map((item, index) => <tr key={item.product_id}><th scope="row"><div className="flex items-center gap-3"><span>{index + 1}</span>{item.thumbnail ? <img src={item.thumbnail} alt="" loading="lazy" className="h-10 w-10 shrink-0 object-cover" /> : <span aria-label="Không có ảnh" className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#F6F7F2] text-xs">—</span>}{canReadCatalog ? <Link className="report-link max-w-60 break-words" to={`/admin/products/${item.product_id}`}>{item.product_name}</Link> : <span className="max-w-60 break-words">{item.product_name}</span>}</div></th>{!preview && <><td>{item.completed_units}</td><td>{item.returned_units}</td></>}<td>{item.net_units}</td></tr>)}</tbody></table></div>
    </>}
  </article>;
}
