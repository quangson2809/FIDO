import type { ApiClientError } from '../../services/http/apiError';

export function QueryFeedback({ loading, error, empty = false, filtered = false, onRetry }: {
  loading?: boolean; error?: ApiClientError | string | null; empty?: boolean; filtered?: boolean; onRetry?: () => void;
}) {
  if (loading) return <div role="status" className="admin-state">Đang tải dữ liệu…</div>;
  if (error) return <div role="alert" className="admin-state admin-error"><strong>{typeof error !== 'string' && error.status === 403 ? 'Bạn không có quyền thực hiện thao tác này.' : 'Không thể hoàn thành yêu cầu.'}</strong><p>{typeof error === 'string' ? error : error.message}</p>{onRetry && <button type="button" onClick={onRetry} className="admin-secondary">Thử lại</button>}</div>;
  if (empty) return <div role="status" className="admin-state">{filtered ? 'Không có kết quả phù hợp. Hãy thay đổi bộ lọc.' : 'Chưa có dữ liệu.'}</div>;
  return null;
}
