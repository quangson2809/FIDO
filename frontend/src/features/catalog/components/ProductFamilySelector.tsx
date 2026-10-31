import React, { useMemo } from 'react';
import type { ProductFamilyDto } from '../types';
import {
  deriveProductSelectionMetadata,
  matchingFamilyMembers,
  matchingPurchasableMembers,
  memberOption,
  type FamilyOptionCode,
} from '../model/productFamilySelection';

export const ProductFamilySelector: React.FC<{
  family: ProductFamilyDto;
  currentProductId: number;
  colorId: number | null;
  sizeId: number | null;
  onSelectOption: (code: FamilyOptionCode, optionId: number) => void;
  onSelectProduct: (productId: number) => void;
}> = ({ family, currentProductId, colorId, sizeId, onSelectOption, onSelectProduct }) => {
  const metadata = useMemo(() => deriveProductSelectionMetadata(family), [family]);
  const colors = metadata.color_options;
  const sizes = metadata.size_options;
  if (colors.length === 0 && sizes.length === 0) return null;

  const matches = matchingFamilyMembers(family.members, colorId, sizeId);
  const buyableMatches = matchingPurchasableMembers(family.members, colorId, sizeId);
  const rootWithoutSelectors = family.members.find((member) =>
    member.product_id === family.root_product_id
      && !memberOption(member, 'COLOR') && !memberOption(member, 'SIZE'));

  const renderOptions = (
    code: FamilyOptionCode,
    options: typeof colors,
    selected: number | null,
    title: string,
  ) => options.length > 0 && (
    <fieldset className="space-y-2">
      <legend className="text-xs font-bold uppercase tracking-[0.12em]">{title}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          // A color is sold out only when every size is sold out.
          // A size is available only if at least one SKU of the selected color has stock.
          const available = code === 'COLOR'
            ? matchingPurchasableMembers(family.members, option.option_id, null).length > 0
            : matchingPurchasableMembers(family.members, colorId, option.option_id).length > 0;
          return (
            <button
              type="button"
              key={option.option_id}
              disabled={!available}
              aria-pressed={selected === option.option_id}
              onClick={() => onSelectOption(code, option.option_id)}
              className={
                'min-h-11 border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ' +
                (selected === option.option_id
                  ? 'border-[#0B2419] bg-[#0B2419] text-white'
                  : 'border-[#D9DDD6] bg-white hover:border-[#0B2419]')
              }
            >
              {option.label || option.value}{!available ? ' · Hết hàng' : ''}
            </button>
          );
        })}
      </div>
    </fieldset>
  );

  return (
    <section aria-label="Lựa chọn màu sắc và kích thước" className="space-y-4 border-y border-[#E8E9E3] py-5">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.16em]">Chọn mẫu sản phẩm</h2>
      {renderOptions('COLOR', colors, colorId, 'Màu sắc')}
      {renderOptions('SIZE', sizes, sizeId, 'Kích thước')}
      {matches.length > 1 && (colorId !== null || sizeId !== null) && (
        <div role="status" className="space-y-2">
          <p className="text-xs text-[#606863]">
            {colorId === null || sizeId === null
              ? 'Chọn thêm màu và kích thước để xác định sản phẩm.'
              : 'Có nhiều SKU cùng màu và kích thước. Chọn sản phẩm cụ thể:'}
          </p>
          {colorId !== null && sizeId !== null && matches.map((member) => (
            <button type="button" key={member.product_id}
              disabled={!member.purchasable}
              onClick={() => onSelectProduct(member.product_id)}
              aria-current={member.product_id === currentProductId ? 'true' : undefined}
              className="mr-2 min-h-11 border border-[#B8C9BD] px-3 py-2 text-xs hover:border-[#0B2419] disabled:opacity-40"
            >
              {member.sku} · {member.selling_price.toLocaleString('vi-VN')}₫
              {!member.purchasable ? ' · Hết hàng' : ''}
            </button>
          ))}
        </div>
      )}
      {matches.length === 0 && (colorId !== null || sizeId !== null) && (
        <p role="status" className="text-xs text-amber-800">
          Tổ hợp chưa có Product đang bán; hãy chọn lựa chọn khác.
        </p>
      )}
      {matches.length > 0 && buyableMatches.length === 0 && (colorId !== null || sizeId !== null) && (
        <p role="status" className="text-xs text-amber-800">
          Các SKU của tổ hợp này hiện đã hết hàng.
        </p>
      )}
      {rootWithoutSelectors && (
        <button type="button" onClick={() => onSelectProduct(rootWithoutSelectors.product_id)}
          aria-current={currentProductId === rootWithoutSelectors.product_id ? 'true' : undefined}
          className="min-h-11 border border-[#D9DDD6] px-3 py-2 text-xs hover:border-[#0B2419]">
          Sản phẩm gốc · {rootWithoutSelectors.sku}
          {!rootWithoutSelectors.purchasable ? ' · Hết hàng' : ''}
        </button>
      )}
    </section>
  );
};
