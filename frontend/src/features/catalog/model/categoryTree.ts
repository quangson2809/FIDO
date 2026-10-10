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
