import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { APP_PATHS } from '../../../routes/paths';
import { StorefrontIcon } from '../../../components/StorefrontIcon';
import { useCatalogCategories } from '../hooks/useCatalogCategories';
import { CategoryMegaMenu } from './CategoryMegaMenu';

interface Props {
  open: boolean;
  active: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: () => void;
}

export function CategoryNavigation({ open, active, onOpenChange, onNavigate }: Props) {
  const { nodes, loading, error, reload } = useCatalogCategories();
  const link = useRef<HTMLAnchorElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const closeAndNavigate = () => { onOpenChange(false); onNavigate(); };
  return <div className="category-navigation" data-open={open}
    onPointerEnter={event => {
      if (event.pointerType === 'mouse' && window.matchMedia('(min-width: 1024px) and (hover: hover)').matches) {
        trigger.current = link.current;
        onOpenChange(true);
      }
    }}
    onPointerLeave={event => { if (event.pointerType === 'mouse') onOpenChange(false); }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) onOpenChange(false); }}
    onKeyDown={event => {
      if (event.key === 'Escape' && open) {
        event.preventDefault(); event.stopPropagation();
        onOpenChange(false); (trigger.current ?? button.current)?.focus();
      }
    }}>
    <Link ref={link} to={APP_PATHS.catalog} onClick={closeAndNavigate}
      aria-current={active ? 'page' : undefined} aria-expanded={open} aria-controls="storefront-category-menu"
      onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === ' ') {
          event.preventDefault(); trigger.current = link.current; onOpenChange(true);
        }
      }} className="category-navigation-link">Sản phẩm</Link>
    <button ref={button} type="button" aria-label="Danh mục sản phẩm" aria-expanded={open} aria-controls="storefront-category-menu"
      onClick={() => { trigger.current = button.current; onOpenChange(!open); }} className="category-navigation-toggle">
      <StorefrontIcon name="grid_view" className="category-navigation-mobile-icon h-5 w-5" />
      <span className="category-navigation-mobile-label">Sản phẩm</span>
      <StorefrontIcon name="expand_more" className={`h-4 w-4 ${open ? 'rotate-180' : ''}`} />
    </button>
    <nav id="storefront-category-menu" aria-label="Danh mục phân cấp" aria-hidden={!open} inert={!open} className="category-mega-panel" data-open={open}>
      <CategoryMegaMenu nodes={nodes} loading={loading} error={error} onRetry={reload} onNavigate={closeAndNavigate} />
    </nav>
  </div>;
}
