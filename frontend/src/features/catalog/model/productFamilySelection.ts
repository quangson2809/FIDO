import type {
  ProductAttributeValueDto,
  ProductFamilyDto,
  ProductFamilyMemberDto,
} from '../types';

export type FamilyOptionCode = 'COLOR' | 'SIZE';

export interface ProductSelectionMetadata {
  root_product_id: number;
  color_options: { option_id: number; value: string; label: string }[];
  size_options: { option_id: number; value: string; label: string }[];
  product_choices: {
    product_id: number;
    sku: string;
    color_option_id: number | null;
    size_option_id: number | null;
    selling_price: number;
    available_quantity: number;
    purchasable: boolean;
  }[];
}

export const memberOption = (
  member: ProductFamilyMemberDto,
  code: FamilyOptionCode,
): ProductAttributeValueDto | undefined =>
  member.attribute_values.find((value) => value.attribute_code === code);

export const memberIsPurchasable = (member: ProductFamilyMemberDto): boolean =>
  member.status === 'ACTIVE' && member.purchasable && member.available_quantity > 0;

export const familyOptions = (
  members: readonly ProductFamilyMemberDto[],
  code: FamilyOptionCode,
): ProductAttributeValueDto[] => {
  const unique = new Map<number, ProductAttributeValueDto>();
  for (const member of members) {
    if (member.status !== 'ACTIVE') continue;
    const option = memberOption(member, code);
    if (option && !unique.has(option.attribute_value_id))
      unique.set(option.attribute_value_id, option);
  }
  return [...unique.values()].sort((a, b) => a.label.localeCompare(b.label, 'vi'));
};

export const matchingFamilyMembers = (
  members: readonly ProductFamilyMemberDto[],
  colorId: number | null,
  sizeId: number | null,
): ProductFamilyMemberDto[] =>
  members.filter((member) =>
    member.status === 'ACTIVE'
      && (colorId === null || memberOption(member, 'COLOR')?.attribute_value_id === colorId)
      && (sizeId === null || memberOption(member, 'SIZE')?.attribute_value_id === sizeId));

export const matchingPurchasableMembers = (
  members: readonly ProductFamilyMemberDto[],
  colorId: number | null,
  sizeId: number | null,
): ProductFamilyMemberDto[] =>
  matchingFamilyMembers(members, colorId, sizeId).filter(memberIsPurchasable);

export const deriveProductSelectionMetadata = (family: ProductFamilyDto): ProductSelectionMetadata => {
  const choices = (code: FamilyOptionCode) =>
    familyOptions(family.members, code).map((option) => ({
      option_id: option.attribute_value_id,
      value: option.value,
      label: option.label,
    }));
  return {
    root_product_id: family.root_product_id,
    color_options: choices('COLOR'),
    size_options: choices('SIZE'),
    product_choices: family.members.map((member) => ({
      product_id: member.product_id,
      sku: member.sku,
      color_option_id: memberOption(member, 'COLOR')?.attribute_value_id ?? null,
      size_option_id: memberOption(member, 'SIZE')?.attribute_value_id ?? null,
      selling_price: member.selling_price,
      available_quantity: member.available_quantity,
      purchasable: memberIsPurchasable(member),
    })),
  };
};
