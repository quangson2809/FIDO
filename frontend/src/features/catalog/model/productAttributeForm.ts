import type {
  AttributeDto,
  ProductAttributeValueDto,
  ProductStatus,
} from '../types';

export type ProductAttributeDraft = Record<string, string>;

export interface ProductAttributeBuildResult {
  attributeValueIds: number[];
  errors: string[];
}

export const attributeDraftFromValues = (
  attributes: readonly AttributeDto[],
  values: readonly ProductAttributeValueDto[],
): ProductAttributeDraft => {
  const draft: ProductAttributeDraft = {};
  for (const attribute of attributes) draft[String(attribute.id)] = '';
  for (const value of values) {
    const key = String(value.attribute_id);
    if (Object.hasOwn(draft, key)) draft[key] = String(value.attribute_value_id);
  }
  return draft;
};

export const productAttributeValuesToIds = (
  values: readonly ProductAttributeValueDto[],
): number[] => values.map((value) => value.attribute_value_id);

export const buildProductAttributeValueIds = (
  attributes: readonly AttributeDto[],
  draft: ProductAttributeDraft,
  status: ProductStatus,
): ProductAttributeBuildResult => {
  const attributeValueIds: number[] = [];
  const errors: string[] = [];

  for (const attribute of attributes) {
    const normalized = (draft[String(attribute.id)] ?? '').trim();
    const required = status === 'ACTIVE' && attribute.is_required;

    if (!normalized) {
      if (required) errors.push(
        'Thuộc tính "' + attribute.name + '" là bắt buộc khi sản phẩm ở trạng thái ACTIVE.',
      );
      continue;
    }

    const optionId = Number(normalized);
    if (!Number.isSafeInteger(optionId) || optionId <= 0
        || !attribute.options.some((option) => option.id === optionId)) {
      errors.push('Hãy chọn một giá trị hợp lệ cho thuộc tính "' + attribute.name + '".');
      continue;
    }
    attributeValueIds.push(optionId);
  }

  return { attributeValueIds, errors };
};

export const preserveUnmanagedProductAttributeValueIds = (
  currentValues: readonly ProductAttributeValueDto[],
  attributes: readonly AttributeDto[],
  replacement: readonly number[],
): number[] => {
  const managedIds = new Set(attributes.map((attribute) => attribute.id));
  const unmanagedIds = currentValues
    .filter((value) => !managedIds.has(value.attribute_id))
    .map((value) => value.attribute_value_id);
  return [...replacement, ...unmanagedIds];
};

export const sameProductAttributeValueIds = (
  left: readonly number[],
  right: readonly number[],
): boolean => {
  const normalize = (values: readonly number[]) => [...values].sort((a, b) => a - b);
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
};
