import React from 'react';
import type { AttributeDto, ProductStatus } from '../types';
import type { ProductAttributeDraft } from '../model/productAttributeForm';

interface Props {
  attributes: readonly AttributeDto[];
  draft: ProductAttributeDraft;
  status: ProductStatus;
  disabled?: boolean;
  onChange: (attributeId: number, value: string) => void;
}

export const ProductAttributeFields: React.FC<Props> = ({
  attributes,
  draft,
  status,
  disabled = false,
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
      {attributes.map((attribute) => {
        const value = draft[String(attribute.id)] ?? '';
        const required = status === 'ACTIVE' && attribute.is_required;
        const label = attribute.name + ' (' + attribute.data_type + ')';
        return (
          <label key={attribute.id} className="block min-w-0 space-y-1 text-sm">
            <span className="block text-xs font-semibold">
              {label}{attribute.is_required ? ' · bắt buộc khi ACTIVE' : ''}
            </span>
            {attribute.data_type === 'OPTION' ? (
              <select
                aria-label={'Giá trị thuộc tính ' + attribute.code}
                required={required}
                disabled={disabled}
                value={value}
                onChange={(event) => onChange(attribute.id, event.target.value)}
                className="w-full border border-[#D9DDD6] bg-white px-3 py-2"
              >
                <option value="">Chưa thiết lập</option>
                {attribute.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : attribute.data_type === 'TEXT' ? (
              <input
                aria-label={'Giá trị thuộc tính ' + attribute.code}
                type="text"
                maxLength={1000}
                required={required}
                disabled={disabled}
                value={value}
                onChange={(event) => onChange(attribute.id, event.target.value)}
                className="w-full border border-[#D9DDD6] px-3 py-2"
              />
            ) : attribute.data_type === 'NUMBER' ? (
              <input
                aria-label={'Giá trị thuộc tính ' + attribute.code}
                type="number"
                step="0.0001"
                required={required}
                disabled={disabled}
                value={value}
                onChange={(event) => onChange(attribute.id, event.target.value)}
                className="w-full border border-[#D9DDD6] px-3 py-2"
              />
            ) : (
              <select
                aria-label={'Giá trị thuộc tính ' + attribute.code}
                required={required}
                disabled={disabled}
                value={value}
                onChange={(event) => onChange(attribute.id, event.target.value)}
                className="w-full border border-[#D9DDD6] bg-white px-3 py-2"
              >
                <option value="">Chưa thiết lập</option>
                <option value="true">Có</option>
                <option value="false">Không</option>
              </select>
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
