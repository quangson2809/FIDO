import type { CategoryDto } from '../types';

export interface CategoryNode extends CategoryDto {
  children: CategoryNode[];
}

export function buildCategoryTree(categories: readonly CategoryDto[]): CategoryNode[] {
  const nodes = new Map<number, CategoryNode>(categories.map(category => [category.category_id, { ...category, children: [] }]));
  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parent_category_id === null ? undefined : nodes.get(node.parent_category_id);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/**
 * Return the full root-to-parent chain without trusting hierarchy metadata to be acyclic.
 * An incomplete or cyclic chain must not be presented as a valid breadcrumb path.
 */
export function getCategoryAncestors(categories: readonly CategoryDto[], categoryId: number): CategoryDto[] {
  const byId = new Map(categories.map(category => [category.category_id, category]));
  const visited = new Set([categoryId]);
  const ancestors: CategoryDto[] = [];
  let current = byId.get(categoryId);

  while (current && current.parent_category_id !== null) {
    const parentId = current.parent_category_id;
    if (visited.has(parentId)) return [];
    const parent = byId.get(parentId);
    if (!parent) return [];
    visited.add(parentId);
    ancestors.push(parent);
    current = parent;
  }

  return ancestors.reverse();
}
