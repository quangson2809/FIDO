import type { AdminProductSummaryDto, CatalogMetaDto } from '../types';
import { resolveImageUrl } from '../../../services/media/imageUrl';
import { StatusBadge } from '../../../shared/admin/StatusBadge';
export function AdminProductTable({ products, meta, onOpen }: { products: readonly AdminProductSummaryDto[]; meta: CatalogMetaDto | null; onOpen: (id: number) => void }) {
  return <div className="overflow-x-auto rounded-xl border border-[#E2E5DE] bg-white"><table><thead><tr><th>Sản phẩm</th><th>Danh mục / thương hiệu</th><th>Giá cơ sở</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{products.map((product) => {
    const image = resolveImageUrl(product.thumbnail);
    return <tr key={product.product_id}><td><div className="flex items-center gap-3">{image && <img src={image} alt="" className="h-14 w-11 rounded object-cover" />}<div><strong>{product.name}</strong><p className="text-xs text-[#606863]">#{product.product_id}</p></div></div></td><td>{meta?.categories.find((category) => category.category_id === product.category_id)?.name ?? `#${product.category_id}`}<p className="text-xs text-[#606863]">{meta?.brands.find((brand) => brand.brand_id === product.brand_id)?.name ?? '—'}</p></td><td className="whitespace-nowrap font-semibold">{product.base_price.toLocaleString('vi-VN')}₫</td><td><StatusBadge status={product.sale_status} /></td><td><button type="button" className="admin-secondary" onClick={() => onOpen(product.product_id)}>Chi tiết</button></td></tr>;
  })}</tbody></table></div>;
}
