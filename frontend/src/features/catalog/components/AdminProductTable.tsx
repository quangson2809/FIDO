import type { AdminProductSummaryDto, CatalogMetaDto } from '../types';
import { resolveImageUrl } from '../../../services/media/imageUrl';
import { StatusBadge } from '../../../shared/admin/StatusBadge';

export function AdminProductTable({
  products,
  meta,
  onOpen,
  onEdit,
}: {
  products: readonly AdminProductSummaryDto[];
  meta: CatalogMetaDto | null;
  onOpen: (id: number) => void;
  onEdit?: (id: number) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#E2E5DE] bg-white">
      <table className="w-full">
        <thead>
          <tr>
            <th>Sản phẩm / SKU</th>
            <th>Category / Brand</th>
            <th>Product cha</th>
            <th>Giá bán</th>
            <th>Trạng thái</th>
            <th aria-label="Thao tác" />
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const image = resolveImageUrl(product.thumbnail);
            return (
              <tr key={product.product_id}>
                <td>
                  <div className="flex min-w-52 items-center gap-3">
                    {image ? (
                      <img src={image} alt="" className="h-14 w-11 rounded object-cover" />
                    ) : (
                      <div aria-hidden="true" className="h-14 w-11 rounded bg-[#F1F3ED]" />
                    )}
                    <div className="min-w-0">
                      <strong className="block break-words">{product.name ?? product.sku}</strong>
                      <p className="mt-1 font-mono text-xs text-[#606863]">{product.sku}</p>
                      <p className="text-xs text-[#606863]">Product #{product.product_id}</p>
                    </div>
                  </div>
                </td>
                <td>
                  {meta?.categories.find((category) => category.category_id === product.category_id)
                    ?.name ?? (product.category_id === null ? '—' : '#' + product.category_id)}
                  <p className="text-xs text-[#606863]">
                    {meta?.brands.find((brand) => brand.brand_id === product.brand_id)?.name ??
                      (product.brand_id === null ? '—' : '#' + product.brand_id)}
                  </p>
                </td>
                <td className="whitespace-nowrap text-sm">
                  {product.parent_product_id === null ? 'Độc lập' : '#' + product.parent_product_id}
                </td>
                <td className="whitespace-nowrap font-semibold">
                  {product.selling_price.toLocaleString('vi-VN')}₫
                  <p className="mt-1 text-xs font-normal text-[#606863]">
                    Giá vốn: {product.cost_price === null ? '—' : product.cost_price.toLocaleString('vi-VN') + '₫'}
                  </p>
                </td>
                <td>
                  <StatusBadge status={product.status} />
                </td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="admin-secondary"
                      onClick={() => onOpen(product.product_id)}
                    >
                      Chi tiết
                    </button>
                    {onEdit && (
                      <button
                        type="button"
                        className="admin-secondary"
                        onClick={() => onEdit(product.product_id)}
                      >
                        Sửa
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
