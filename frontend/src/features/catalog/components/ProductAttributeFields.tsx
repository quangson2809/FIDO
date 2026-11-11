import React from 'react';
import type { AttributeDto, ProductStatus } from '../types';
import type { ProductAttributeDraft } from '../model/productAttributeForm';
import { productCreateControlId } from '../model/productCreateForm';

interface Props {
  attributes: readonly AttributeDto[];
  draft: ProductAttributeDraft;
  status: ProductStatus;
  disabled?: boolean;
  errors?: Record<string, string>;
  onChange: (attributeId: number, value: string) => void;
}

export const ProductAttributeFields: React.FC<Props> = ({
  attributes,
  draft,
  status,
  disabled = false,
  errors,
  onChange,
}) => {
  if (attributes.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[#D9DDD6] p-4 text-sm text-[#606863]">
        Chưa có Attribute trong metadata catalog. Không có trường thuộc tính để nhập.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[...attributes]
        .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
        .map((attribute) => {
          const value = draft[String(attribute.id)] ?? '';
          const error = errors?.['attribute:' + attribute.id];
          const controlId = errors
            ? productCreateControlId('attribute:' + attribute.id)
            : undefined;
          const required = status === 'ACTIVE' && attribute.is_required;
          return (
            <label key={attribute.id} className="block min-w-0 space-y-1 text-sm">
              <span className="block text-xs font-semibold">
                {attribute.name}
                {attribute.is_required ? ' · bắt buộc khi ACTIVE' : ''}
              </span>
              <select
                id={controlId}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? controlId + '-error' : undefined}
                aria-label={'Giá trị thuộc tính ' + attribute.code}
                required={required}
                disabled={disabled}
                value={value}
                onChange={(event) => onChange(attribute.id, event.target.value)}
                className="w-full border border-[#D9DDD6] bg-white px-3 py-2"
              >
                <option value="">Chưa thiết lập</option>
                {value && !attribute.options.some((option) => String(option.id) === value) && (
                  <option value={value}>Đã lưu · Option #{value} (metadata chưa có)</option>
                )}
                {[...attribute.options]
                  .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
                  .map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
              </select>
              {error && (
                <span id={controlId + '-error'} className="block text-xs text-red-700">
                  {error}
                </span>
              )}
              {attribute.is_variant_defining && (
                <span className="block text-xs text-[#606863]">
                  Thuộc tính mô tả/phân loại; không tự tạo sản phẩm con hoặc biến thể.
                </span>
              )}
            </label>
          );
        })}
    </div>
  );
};
