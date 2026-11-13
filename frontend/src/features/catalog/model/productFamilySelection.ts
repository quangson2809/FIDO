import type { ProductAttributeValueDto, ProductFamilyDto, ProductFamilyMemberDto } from '../types';

export type FamilySelection = Readonly<Record<number, number>>;
export interface FamilyAttribute {
  attribute_id: number;
  name: string;
  sort_order: number;
  options: ProductAttributeValueDto[];
}

export const memberIsPurchasable = (member: ProductFamilyMemberDto): boolean =>
  member.status === 'ACTIVE' && member.purchasable && member.available_quantity > 0;

export const memberSelection = (member: Pick<ProductFamilyMemberDto, 'attribute_values'>): FamilySelection =>
  Object.fromEntries(member.attribute_values.filter(value => value.is_variant_defining)
    .map(value => [value.attribute_id, value.attribute_value_id]));

export const familyAttributes = (members: readonly ProductFamilyMemberDto[]): FamilyAttribute[] => {
  const axes = new Map<number, FamilyAttribute>();
  for (const member of members) {
    if (member.status !== 'ACTIVE') continue;
    for (const value of member.attribute_values) {
      if (!value.is_variant_defining) continue;
      let axis = axes.get(value.attribute_id);
      if (!axis) {
        axis = { attribute_id: value.attribute_id, name: value.attribute_name,
          sort_order: value.sort_order, options: [] };
        axes.set(value.attribute_id, axis);
      }
      if (!axis.options.some(option => option.attribute_value_id === value.attribute_value_id))
        axis.options.push(value);
    }
  }
  return [...axes.values()].sort((a, b) => a.sort_order - b.sort_order || a.attribute_id - b.attribute_id);
};

export const matchingFamilyMembers = (
  members: readonly ProductFamilyMemberDto[], selection: FamilySelection,
): ProductFamilyMemberDto[] => members.filter(member => member.status === 'ACTIVE'
  && Object.entries(selection).every(([attributeId, optionId]) =>
    memberSelection(member)[Number(attributeId)] === optionId));

export const selectionIsComplete = (axes: readonly FamilyAttribute[], selection: FamilySelection): boolean =>
  axes.every(axis => selection[axis.attribute_id] !== undefined);

export const resolveSelectedMember = (
  family: ProductFamilyDto, selection: FamilySelection,
): ProductFamilyMemberDto | undefined => {
  const axes = familyAttributes(family.members);
  if (!selectionIsComplete(axes, selection)) return undefined;
  const matches = matchingFamilyMembers(family.members, selection);
  // Stock must not hide a duplicate combination and make it appear unique.
  return matches.length === 1 ? matches[0] : undefined;
};

/** Earlier metadata-ordered axes constrain later ones; changing an axis clears incompatible successors. */
export const changeFamilySelection = (
  members: readonly ProductFamilyMemberDto[], selection: FamilySelection,
  attributeId: number, optionId: number,
): FamilySelection => {
  const next: Record<number, number> = {};
  for (const axis of familyAttributes(members)) {
    const selected = axis.attribute_id === attributeId ? optionId : selection[axis.attribute_id];
    if (selected === undefined) continue;
    const candidate = { ...next, [axis.attribute_id]: selected };
    if (matchingFamilyMembers(members, candidate).length > 0) next[axis.attribute_id] = selected;
  }
  return next;
};

export const optionIsAvailable = (
  members: readonly ProductFamilyMemberDto[], axes: readonly FamilyAttribute[],
  selection: FamilySelection, attributeId: number, optionId: number,
): boolean => {
  const prefix: Record<number, number> = {};
  for (const axis of axes) {
    if (axis.attribute_id === attributeId) break;
    if (selection[axis.attribute_id] !== undefined) prefix[axis.attribute_id] = selection[axis.attribute_id];
  }
  return matchingFamilyMembers(members, { ...prefix, [attributeId]: optionId }).some(memberIsPurchasable);
};
