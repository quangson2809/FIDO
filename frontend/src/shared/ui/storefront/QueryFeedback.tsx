export function QueryFeedback({ loading, error, onRetry }: { loading?: boolean; error?: string | null; onRetry?: () => void }) {
  if (loading) return <p role="status" className="border border-border-subtle bg-surface-ivory p-6 text-sm text-muted-grey">Đang tải dữ liệu...</p>;
  if (!error) return null;
  return <div role="alert" className="border border-red-200 bg-red-50 p-5 text-sm text-red-700"><p>{error}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-3 min-h-11 border border-red-700 px-4 font-semibold">Thử lại</button>}</div>;
}
