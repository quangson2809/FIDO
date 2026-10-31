import React from 'react';
import { Link } from 'react-router-dom';
import { adminProductDetailPath } from '../../../routes/paths';
import type { AdminProductDetailDto, AdminProductRelationDto, ProductImageDto } from '../types';
import { resolveImageUrl } from '../../../services/media/imageUrl';
import { StatusBadge } from '../../../shared/admin/StatusBadge';

const displayMoney = (value: number | null): string =>
  value === null ? '—' : value.toLocaleString('vi-VN') + '₫';

const primaryImage = (images: readonly ProductImageDto[]): string | null => {
  const primary = images.find((image) => image.is_primary);
  const first = [...images].sort((left, right) => left.sort_order - right.sort_order)[0];
  return resolveImageUrl((primary ?? first)?.image_url ?? null) ?? null;
};

const RelationCard: React.FC<{
  relation: AdminProductRelationDto;
  relationType: 'parent' | 'child';
}> = ({ relation, relationType }) => {
  const image = primaryImage(relation.images);
  const isParent = relationType === 'parent';
  const destination = adminProductDetailPath(relation.product_id);
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-lg border border-[#E2E5DE] bg-white p-4 sm:flex-row">
      <div className="h-32 w-full shrink-0 overflow-hidden rounded bg-[#F5F6F2] sm:h-32 sm:w-24">
        {image ? (
          <img src={image} alt={'Ảnh ' + relation.sku}
            className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[#687069]">
            Chưa có ảnh
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#606863]">
            {isParent ? 'Product cha' : 'Product con'} #{relation.product_id}
          </p>
          <StatusBadge status={relation.status} />
        </div>
        <div>
          <h4 className="break-words text-sm font-bold">{relation.name ?? relation.sku}</h4>
          <p className="mt-1 break-all font-mono text-xs text-[#606863]">{relation.sku}</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span><span className="text-[#606863]">Giá bán:</span>{' '}
            <strong>{displayMoney(relation.selling_price)}</strong></span>
          <span><span className="text-[#606863]">Giá vốn:</span>{' '}
            <strong>{displayMoney(relation.cost_price)}</strong></span>
        </div>
        {relation.attribute_values.length > 0 && (
          <dl className="flex flex-wrap gap-2">
            {relation.attribute_values.map((value) => (
              <div key={value.attribute_id}
                className="rounded border border-[#E2E5DE] bg-[#F8FAF4] px-2 py-1 text-xs">
                <dt className="inline text-[#606863]">{value.attribute_name}: </dt>
                <dd className="inline font-semibold">{value.label || value.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <Link to={destination}
          aria-label={isParent
            ? 'Xem Product cha #' + relation.product_id
            : 'Xem chi tiết Product #' + relation.product_id}
          className="mt-auto inline-flex min-h-10 items-center justify-center self-start border border-[#0B2419] px-3 py-2 text-xs font-bold text-[#0B2419] transition hover:bg-[#0B2419] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          {isParent ? 'Mở Product cha' : 'Xem chi tiết'} →
        </Link>
      </div>
    </article>
  );
};

/**
 * Admin detail already returns parent_product and direct children.
 * Each link opens the complete detail of that exact persisted Product ID.
 * A child's siblings remain discoverable through its parent, without inventing a new API.
 */
export const AdminProductRelationsSection: React.FC<{ product: AdminProductDetailDto }> = ({
  product,
}) => (
  <section aria-label="Quan hệ Product"
    className="space-y-4 rounded-lg border border-[#E2E5DE] bg-[#FFFDF5] p-5">
    <div>
      <h2 className="font-serif text-xl font-bold">Product cha &amp; Product con</h2>
      <p className="mt-1 text-xs text-[#606863]">
        Chọn một Product để mở thông tin riêng, ảnh, giá và Attribute của SKU đó.
      </p>
    </div>
    {product.parent_product && (
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider">Product cha</h3>
        <RelationCard relation={product.parent_product} relationType="parent" />
        <p className="text-xs text-[#606863]">
          Mở Product cha để xem những Product cùng cấp với Product hiện tại.
        </p>
      </div>
    )}
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider">
        Product con ({product.children.length})
      </h3>
      {product.children.length ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {product.children.map((child) => (
            <RelationCard key={child.product_id} relation={child} relationType="child" />
          ))}
        </div>
      ) : (
        <p className="rounded border border-dashed border-[#D9DDD6] px-4 py-3 text-sm text-[#606863]">
          {product.parent_product
            ? 'Product này chưa có con trực tiếp. Mở Product cha để xem các Product cùng nhóm.'
            : 'Product này chưa có Product con.'}
        </p>
      )}
    </div>
  </section>
);
