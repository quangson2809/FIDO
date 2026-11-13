import React from 'react';
import type { ProductFamilyDto } from '../types';
import { familyAttributes, matchingFamilyMembers, optionIsAvailable,
  selectionIsComplete, type FamilySelection } from '../model/productFamilySelection';

export const ProductFamilySelector: React.FC<{
  family: ProductFamilyDto;
  selection: FamilySelection;
  onSelectOption: (attributeId: number, optionId: number) => void;
}> = ({ family, selection, onSelectOption }) => {
  const axes = familyAttributes(family.members);
  const complete = selectionIsComplete(axes, selection);
  const matches = matchingFamilyMembers(family.members, selection);
  if (axes.length === 0 && family.members.length <= 1) return null;
  return (
    <section aria-label="Lựa chọn màu sắc và kích thước" className="space-y-4 border-y border-[#E8E9E3] py-5">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.16em]">Chọn mẫu sản phẩm</h2>
      {axes.map(axis => (
        <fieldset key={axis.attribute_id} className="space-y-2">
          <legend className="text-xs font-bold uppercase tracking-[0.12em]">{axis.name}</legend>
          <div className="flex flex-wrap gap-2">
            {axis.options.map(option => {
              const available = optionIsAvailable(family.members, axes, selection,
                axis.attribute_id, option.attribute_value_id);
              return (
                <button type="button" key={option.attribute_value_id} disabled={!available}
                  aria-pressed={selection[axis.attribute_id] === option.attribute_value_id}
                  onClick={() => onSelectOption(axis.attribute_id, option.attribute_value_id)}
                  className={'min-h-11 border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 '
                    + (selection[axis.attribute_id] === option.attribute_value_id
                      ? 'border-[#0B2419] bg-[#0B2419] text-white'
                      : 'border-[#D9DDD6] bg-white hover:border-[#0B2419]')}>
                  {option.label || option.value}{!available ? ' · Hết hàng' : ''}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      {!complete && <p role="status" className="text-xs text-[#606863]">Chọn đủ tùy chọn của sản phẩm.</p>}
      {complete && matches.length > 1 && <p role="alert" className="text-xs text-amber-800">
        Tổ hợp này chưa xác định được sản phẩm duy nhất. Vui lòng thử lại sau.
      </p>}
      {complete && matches.length === 0 && <p role="status" className="text-xs text-amber-800">
        Tổ hợp này hiện không có. Vui lòng chọn màu hoặc kích thước khác.
      </p>}
    </section>
  );
};
