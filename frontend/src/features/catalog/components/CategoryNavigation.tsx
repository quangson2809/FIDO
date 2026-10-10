import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { catalogService } from '../api/service';
import { buildCategoryTree } from '../model/categoryTree';
import { CategoryLinks } from './CategoryLinks';
import { StorefrontIcon } from '../../../components/StorefrontIcon';
import { useRemoteQuery } from '../../../shared/hooks/useRemoteQuery';
import { QueryFeedback } from '../../../shared/ui/storefront/QueryFeedback';
import { getStorefrontErrorMessage } from '../../../services/http/storefrontError';

export function CategoryNavigation({ onNavigate }: { onNavigate: () => void }) {
  const metadata = useRemoteQuery(useCallback(() => catalogService.getMeta(), []));
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); onNavigate(); };
  const nodes = buildCategoryTree(metadata.data?.categories ?? []);
  return <div className="relative"
    onMouseEnter={() => { if (window.matchMedia('(hover: hover)').matches) setOpen(true); }}
    onMouseLeave={() => { if (!button.current?.parentElement?.contains(document.activeElement)) setOpen(false); }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); button.current?.focus(); } }}>
    <button ref={button} type="button" aria-label="Danh mục sản phẩm" aria-expanded={open} aria-controls="storefront-category-menu" onClick={() => setOpen(value => window.matchMedia('(hover: hover)').matches ? true : !value)} className="flex min-h-11 items-center gap-1.5 text-[13px] font-semibold">
      <StorefrontIcon name="grid_view" className="h-5 w-5" /><span className="hidden sm:inline">Danh mục</span><StorefrontIcon name="expand_more" className={`h-4 w-4 ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <nav id="storefront-category-menu" aria-label="Danh mục phân cấp" className="absolute left-0 top-full max-h-[70vh] w-72 max-w-[calc(100vw-9rem)] overflow-auto border border-border-subtle bg-white p-2 shadow-xl">
      <Link to="/products" onClick={close} className="flex min-h-11 items-center border-b border-border-subtle px-3 text-sm font-semibold">Tất cả sản phẩm</Link>
      <QueryFeedback loading={metadata.loading} error={metadata.error ? getStorefrontErrorMessage(metadata.error, 'Không thể tải danh mục.') : null} onRetry={metadata.reload} />
      {!metadata.loading && !metadata.error && (nodes.length ? <CategoryLinks nodes={nodes} onNavigate={close} /> : <p className="p-3 text-sm">Chưa có danh mục.</p>)}
    </nav>}
  </div>;
}
