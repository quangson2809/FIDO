import type {
  AttributeDto,
  ProductAttributeValueDto,
  ProductAttributeValueInput,
  ProductStatus,
} from '../types';

export type ProductAttributeDraft = Record<string, string>;

export interface ProductAttributeBuildResult {
  values: ProductAttributeValueInput[];
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
    if (!Object.hasOwn(draft, key)) continue;
    switch (value.data_type) {
      case 'OPTION':
        draft[key] = value.option_id === null ? '' : String(value.option_id);
        break;
      case 'TEXT':
        draft[key] = value.text_value ?? '';
        break;
      case 'NUMBER':
        draft[key] = value.number_value === null ? '' : String(value.number_value);
        break;
      case 'BOOLEAN':
        draft[key] =
          value.boolean_value === null ? '' : value.boolean_value ? 'true' : 'false';
        break;
    }
  }
  return draft;
};

export const productAttributeValuesToInputs = (
  values: readonly ProductAttributeValueDto[],
): ProductAttributeValueInput[] => {
  const inputs: ProductAttributeValueInput[] = [];
  for (const value of values) {
    switch (value.data_type) {
      case 'OPTION':
        if (value.option_id !== null) {
          inputs.push({ attribute_id: value.attribute_id, option_id: value.option_id });
        }
        break;
      case 'TEXT':
        if (value.text_value !== null) {
          inputs.push({ attribute_id: value.attribute_id, text_value: value.text_value });
        }
        break;
      case 'NUMBER':
        if (value.number_value !== null) {
          inputs.push({ attribute_id: value.attribute_id, number_value: value.number_value });
        }
        break;
      case 'BOOLEAN':
        if (value.boolean_value !== null) {
          inputs.push({ attribute_id: value.attribute_id, boolean_value: value.boolean_value });
        }
        break;
    }
  }
  return inputs;
};

export const buildProductAttributeInputs = (
  attributes: readonly AttributeDto[],
  draft: ProductAttributeDraft,
  status: ProductStatus,
): ProductAttributeBuildResult => {
  const values: ProductAttributeValueInput[] = [];
  const errors: string[] = [];

  for (const attribute of attributes) {
    const raw = draft[String(attribute.id)] ?? '';
    const normalized = raw.trim();
    const required = status === 'ACTIVE' && attribute.is_required;

    if (!normalized) {
      if (required) {
        errors.push('Thuộc tính "' + attribute.name + '" là bắt buộc khi sản phẩm ở trạng thái ACTIVE.');
      }
      continue;
    }

    switch (attribute.data_type) {
      case 'OPTION': {
        const optionId = Number(normalized);
        if (
          !Number.isSafeInteger(optionId) ||
          optionId <= 0 ||
          !attribute.options.some((option) => option.id === optionId)
        ) {
          errors.push('Hãy chọn một option hợp lệ cho thuộc tính "' + attribute.name + '".');
          continue;
        }
        values.push({ attribute_id: attribute.id, option_id: optionId });
        break;
      }
      case 'TEXT':
        if (raw.length > 1000) {
          errors.push('Giá trị "' + attribute.name + '" không được vượt quá 1000 ký tự.');
          continue;
        }
        values.push({ attribute_id: attribute.id, text_value: raw });
        break;
      case 'NUMBER': {
        if (!/^-?\d+(?:\.\d{1,4})?$/.test(normalized)) {
          errors.push('Giá trị "' + attribute.name + '" phải là số có tối đa 4 chữ số thập phân.');
          continue;
        }
        const integerPart = normalized.split('.')[0].replace('-', '');
        const significantInteger = integerPart.replace(/^0+/, '');
        const numberValue = Number(normalized);
        if (significantInteger.length > 14 || !Number.isFinite(numberValue)) {
          errors.push('Giá trị "' + attribute.name + '" vượt độ chính xác cho phép.');
          continue;
        }
        values.push({ attribute_id: attribute.id, number_value: numberValue });
        break;
      }
      case 'BOOLEAN':
        if (normalized !== 'true' && normalized !== 'false') {
          errors.push('Hãy chọn Có hoặc Không cho thuộc tính "' + attribute.name + '".');
          continue;
        }
        values.push({ attribute_id: attribute.id, boolean_value: normalized === 'true' });
        break;
    }
  }

  return { values, errors };
};

export const preserveUnmanagedProductAttributeValues = (
  currentValues: readonly ProductAttributeValueDto[],
  attributes: readonly AttributeDto[],
  replacement: readonly ProductAttributeValueInput[],
): ProductAttributeValueInput[] => {
  const managedIds = new Set(attributes.map((attribute) => attribute.id));
  const unmanaged = productAttributeValuesToInputs(
    currentValues.filter((value) => !managedIds.has(value.attribute_id)),
  );
  return [...replacement, ...unmanaged];
};

export const sameProductAttributeValues = (
  left: readonly ProductAttributeValueInput[],
  right: readonly ProductAttributeValueInput[],
): boolean => {
  const normalize = (values: readonly ProductAttributeValueInput[]) =>
    [...values]
      .map((value) => ({
        attribute_id: value.attribute_id,
        option_id: value.option_id ?? null,
        text_value: value.text_value ?? null,
        number_value: value.number_value ?? null,
        boolean_value: value.boolean_value ?? null,
      }))
      .sort((a, b) => a.attribute_id - b.attribute_id);
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
};
