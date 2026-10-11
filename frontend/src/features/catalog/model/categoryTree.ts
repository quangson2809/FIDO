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


/**
 * Present real catalog categories in breadth-first order: parent navigation first,
 * then available subcategories. A store with one broad root can still show its
 * actual child categories without inventing categories or additional API calls.
 */
export function selectHomepageCategories(categories: readonly CategoryDto[], limit = 8): CategoryDto[] {
  const queue: CategoryNode[] = buildCategoryTree(categories);
  const selected: CategoryDto[] = [];
  const visited = new Set<number>();

  for (let index = 0; index < queue.length && selected.length < limit; index++) {
    const category = queue[index];
    if (visited.has(category.category_id)) continue;
    visited.add(category.category_id);
    selected.push(category);
    queue.push(...category.children);
  }

  return selected;
}

/**
 * Only top-level categories with descendants own a homepage showcase.
 * Products in the showcase are queried by the root category ID; the public
 * catalog API includes its full descendant tree in the result.
 */
export function selectHomepageParentCategories(categories: readonly CategoryDto[]): CategoryDto[] {
  return buildCategoryTree(categories).filter(
    category => category.parent_category_id === null && category.children.length > 0,
  );
}
