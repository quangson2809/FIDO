import type { ProductAttributeValueDto, ProductFamilyMemberDto } from '../types';

export type FamilyOptionCode = 'COLOR' | 'SIZE';

export const memberOption = (
  member: ProductFamilyMemberDto,
  code: FamilyOptionCode,
): ProductAttributeValueDto | undefined =>
  member.attribute_values.find((value) => value.attribute_code === code);

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
