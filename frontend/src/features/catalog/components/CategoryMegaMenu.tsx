import { Link } from 'react-router-dom';
import { APP_PATHS, categoryProductsPath } from '../../../routes/paths';
import type { CategoryNode } from '../model/categoryTree';
import { CategoryLinks } from './CategoryLinks';
import { QueryFeedback } from '../../../shared/ui/storefront/QueryFeedback';

interface Props {
  nodes: readonly CategoryNode[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onNavigate: () => void;
}

export function CategoryMegaMenu({ nodes, loading, error, onRetry, onNavigate }: Props) {
  return <div className="category-mega-layout">
    <div className="category-mega-catalog" aria-busy={loading}>
      <Link to={APP_PATHS.catalog} onClick={onNavigate} className="category-mega-all">Tất cả sản phẩm <span aria-hidden="true">↗</span></Link>
      <QueryFeedback loading={loading} error={error} onRetry={onRetry} />
      {!loading && !error && (nodes.length ? <ul className="category-mega-groups">
        {nodes.map(node => <li key={node.category_id} className="category-mega-group">
          <Link to={categoryProductsPath(node.category_id)} onClick={onNavigate} className="category-mega-heading">{node.name}</Link>
          {node.children.length > 0 && <CategoryLinks nodes={node.children} onNavigate={onNavigate} variant="mega" />}
        </li>)}
      </ul> : <p className="category-mega-empty">Chưa có danh mục.</p>)}
    </div>
    <aside className="category-mega-visual" aria-label="Khám phá FIDO">
      <Link to={APP_PATHS.about} onClick={onNavigate} className="category-mega-feature">
        <img src="/images/about/wardrobe.svg" alt="" decoding="async" />
        <span>FIDO Ready-to-Wear</span>
      </Link>
      <Link to={APP_PATHS.catalog} onClick={onNavigate} className="category-mega-feature">
        <img src="/images/about/details.svg" alt="" decoding="async" />
        <span>Khám phá sản phẩm</span>
      </Link>
    </aside>
  </div>;
}
