import React from 'react';
import type { ProductFamilyDto } from '../types';
import { familyAttributes, matchingFamilyMembers, memberIsPurchasable, memberSelection,
  optionIsAvailable, selectionIsComplete, type FamilySelection } from '../model/productFamilySelection';

export const ProductFamilySelector: React.FC<{
  family: ProductFamilyDto;
  currentProductId: number;
  selection: FamilySelection;
  onSelectOption: (attributeId: number, optionId: number) => void;
  onSelectProduct: (productId: number) => void;
}> = ({ family, currentProductId, selection, onSelectOption, onSelectProduct }) => {
  const axes = familyAttributes(family.members);
  const complete = selectionIsComplete(axes, selection);
  const matches = matchingFamilyMembers(family.members, selection);
  const rootWithoutSelectors = axes.length > 0 && family.members.find(member =>
    member.product_id === family.root_product_id && Object.keys(memberSelection(member)).length === 0);
  if (axes.length === 0 && family.members.length <= 1) return null;
  return (
    <section aria-label="Lựa chọn thuộc tính sản phẩm" className="space-y-4 border-y border-[#E8E9E3] py-5">
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
      {!complete && <p role="status" className="text-xs text-[#606863]">Chọn đủ thuộc tính để xác định sản phẩm.</p>}
      {complete && matches.length > 1 && (
        <div role="status" className="space-y-2">
          <p className="text-xs text-[#606863]">Có nhiều SKU phù hợp. Chọn sản phẩm cụ thể:</p>
          {matches.map(member => (
            <button type="button" key={member.product_id} disabled={!memberIsPurchasable(member)}
              onClick={() => onSelectProduct(member.product_id)}
              aria-current={member.product_id === currentProductId ? 'true' : undefined}
              className="mr-2 min-h-11 border border-[#B8C9BD] px-3 py-2 text-xs hover:border-[#0B2419] disabled:opacity-40">
              {member.sku} · {member.selling_price.toLocaleString('vi-VN')}₫
              {!memberIsPurchasable(member) ? ' · Hết hàng' : ''}
            </button>
          ))}
        </div>
      )}
      {complete && matches.length === 0 && <p role="status" className="text-xs text-amber-800">Tổ hợp chưa có Product đang bán; hãy chọn lựa chọn khác.</p>}
      {rootWithoutSelectors && (
        <button type="button" disabled={!memberIsPurchasable(rootWithoutSelectors)}
          onClick={() => onSelectProduct(rootWithoutSelectors.product_id)}
          aria-current={currentProductId === rootWithoutSelectors.product_id ? 'true' : undefined}
          className="min-h-11 border border-[#D9DDD6] px-3 py-2 text-xs hover:border-[#0B2419] disabled:opacity-40">
          Sản phẩm gốc · {rootWithoutSelectors.sku}
          {!memberIsPurchasable(rootWithoutSelectors) ? ' · Hết hàng' : ''}
        </button>
      )}
    </section>
  );
};
