import { Link } from 'react-router-dom';
import { categoryProductsPath } from '../../../routes/paths';
import type { CategoryNode } from '../model/categoryTree';

export function CategoryLinks({ nodes, onNavigate, variant = 'list', depth = 0 }: {
  nodes: readonly CategoryNode[];
  onNavigate?: () => void;
  variant?: 'list' | 'mega';
  depth?: number;
}) {
  const mega = variant === 'mega';
  return <ul className={mega ? depth === 0 ? 'category-mega-branches' : 'category-mega-descendants' : 'space-y-1'}>
    {nodes.map(node => <li key={node.category_id}>
      <Link to={categoryProductsPath(node.category_id)} onClick={onNavigate} className={mega ? `category-mega-link ${node.children.length ? 'category-mega-parent' : ''}` : 'flex min-h-11 items-center rounded px-3 py-2 text-sm font-semibold hover:bg-surface-ivory focus-visible:outline-2'}>{node.name}</Link>
      {node.children.length > 0 && <div className={mega ? depth < 3 ? 'category-mega-indent' : 'category-mega-deep' : 'ml-3 border-l border-border-subtle pl-2'}><CategoryLinks nodes={node.children} onNavigate={onNavigate} variant={variant} depth={depth + 1} /></div>}
    </li>)}
  </ul>;
}
