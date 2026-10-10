import { Link } from 'react-router-dom';
import { categoryProductsPath } from '../../../routes/paths';
import type { CategoryNode } from '../model/categoryTree';

export function CategoryLinks({ nodes, onNavigate }: { nodes: readonly CategoryNode[]; onNavigate?: () => void }) {
  return <ul className="space-y-1">
    {nodes.map(node => <li key={node.category_id}>
      <Link to={categoryProductsPath(node.category_id)} onClick={onNavigate} className="flex min-h-11 items-center rounded px-3 py-2 text-sm font-semibold hover:bg-surface-ivory focus-visible:outline-2">{node.name}</Link>
      {node.children.length > 0 && <div className="ml-3 border-l border-border-subtle pl-2"><CategoryLinks nodes={node.children} onNavigate={onNavigate} /></div>}
    </li>)}
  </ul>;
}
