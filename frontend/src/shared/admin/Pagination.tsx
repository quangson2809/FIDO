import type { PaginationMeta } from '../../types/api';
export function Pagination({ meta, loading, onPage }: { meta: PaginationMeta | null | undefined; loading?: boolean; onPage: (page: number) => void }) {
  if (!meta) return null;
  return <nav aria-label="Phân trang" className="admin-pagination"><span>{meta.total} kết quả · Trang {meta.page} / {Math.max(1, meta.total_pages)}</span><div><button type="button" disabled={loading || meta.page <= 1} onClick={() => onPage(meta.page - 1)}>Trước</button><button type="button" disabled={loading || meta.page >= meta.total_pages} onClick={() => onPage(meta.page + 1)}>Sau</button></div></nav>;
}
