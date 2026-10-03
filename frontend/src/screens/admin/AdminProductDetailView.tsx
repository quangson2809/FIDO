import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { adminProductService } from '../../features/catalog/api/adminService';
import type { AdminProductDetailDto } from '../../features/catalog/types';
import { resolveImageUrl } from '../../services/media/imageUrl';

interface AdminProductDetailViewProps {
  onNavigateTab: (tab: string, breadcrumb: string) => void;
  showToast: (message: string) => void;
}

export const AdminProductDetailView: React.FC<AdminProductDetailViewProps> = ({
  onNavigateTab,
  showToast,
}) => {
  const { selectedProductId } = useApp();
  const [product, setProduct] = useState<AdminProductDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const productId = Number(selectedProductId);

    if (!Number.isInteger(productId) || productId <= 0) {
      setError('Product ID không hợp lệ.');
      setLoading(false);
      return () => {
        active = false;
      };
    }

    void adminProductService.getProduct(productId)
      .then((detail) => {
        if (!active) return;
        setProduct(detail);
        setError(null);
      })
      .catch(() => {
        if (active) {
          setError('Không thể tải chi tiết sản phẩm quản trị.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedProductId]);

  const copyProductId = () => {
    if (!product) return;
    void navigator.clipboard?.writeText(String(product.product_id));
    showToast(`Đã sao chép Product ID #${product.product_id}.`);
  };

  if (loading) {
    return <div className="py-16 text-center text-sm text-[#687069]">Đang tải chi tiết sản phẩm...</div>;
  }

  if (error || !product) {
    return (
      <div className="space-y-4 border border-red-200 bg-white p-6">
        <p className="text-sm text-red-700">{error ?? 'Không tìm thấy sản phẩm.'}</p>
        <button
          type="button"
          onClick={() => onNavigateTab('products', 'Quản lý sản phẩm')}
          className="border border-[#0B2419] px-4 py-2 text-sm font-semibold"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <button
            type="button"
            onClick={() => onNavigateTab('products', 'Quản lý sản phẩm')}
            className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-[#687069] hover:text-[#0B2419]"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Danh sách sản phẩm
          </button>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#687069]">
            Product #{product.product_id}
          </p>
          <h1 className="mt-1 font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419]">
            {product.name}
          </h1>
          <p className="mt-2 text-sm text-[#424844]">
            {product.description || 'Chưa có mô tả.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copyProductId}
            className="border border-[#D9DDD6] bg-white px-4 py-2 text-sm font-semibold"
          >
            Sao chép ID
          </button>
          <span className="bg-[#FAF4DF] px-4 py-2 text-sm font-bold">
            {product.sale_status}
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <section className="border border-[#E8E9E3] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-['Playfair_Display',serif] text-2xl font-bold">Hình ảnh sản phẩm</h2>
              <p className="mt-1 text-xs text-[#687069]">
                Detail API trả toàn bộ images[]. Không áp dụng sort_order; thứ tự hiện tại theo image_id.
              </p>
            </div>
            <span className="text-sm text-[#687069]">{product.images.length} ảnh</span>
          </div>

          {product.images.length === 0 ? (
            <div className="flex min-h-64 items-center justify-center bg-[#F3F4EF] text-sm text-[#8A918B]">
              Sản phẩm chưa có ảnh
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {product.images.map((image, index) => {
                const imageUrl = resolveImageUrl(image.image_url);
                return (
                  <figure key={image.image_id} className="overflow-hidden border border-[#E8E9E3] bg-[#F8FAF7]">
                    <div className="aspect-[3/4] bg-[#F3F4EF]">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={image.alt_text ?? product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-[#8A918B]">
                          URL ảnh không hợp lệ
                        </div>
                      )}
                    </div>
                    <figcaption className="space-y-1 p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">Ảnh {index + 1}</span>
                        <span className="font-mono text-[#687069]">#{image.image_id}</span>
                      </div>
                      <p className="truncate text-[#687069]">{image.alt_text ?? 'Không có alt text'}</p>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="border border-[#E8E9E3] bg-white p-5 shadow-sm">
            <h2 className="font-['Playfair_Display',serif] text-xl font-bold">Thông tin catalog</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[#687069]">Category</dt>
                <dd className="font-semibold">#{product.category_id}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#687069]">Brand</dt>
                <dd className="font-semibold">{product.brand_id ? `#${product.brand_id}` : '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#687069]">Size system</dt>
                <dd className="font-semibold">#{product.size_system_id}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-[#E8E9E3] pt-3">
                <dt className="text-[#687069]">Giá cơ sở</dt>
                <dd className="font-mono font-bold">{product.base_price.toLocaleString('vi-VN')}₫</dd>
              </div>
            </dl>
          </section>

          <section className="border border-[#E8E9E3] bg-white p-5 shadow-sm">
            <h2 className="font-['Playfair_Display',serif] text-xl font-bold">Biến thể</h2>
            <div className="mt-4 space-y-3">
              {product.variants.length === 0 ? (
                <p className="text-sm text-[#687069]">Chưa có biến thể.</p>
              ) : (
                product.variants.map((variant) => (
                  <div key={variant.variant_id} className="border border-[#E8E9E3] p-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <strong>{variant.size.display_name} · {variant.color.name}</strong>
                      <span className="text-xs text-[#687069]">{variant.sale_status}</span>
                    </div>
                    <div className="mt-2 flex justify-between gap-3 text-xs text-[#687069]">
                      <span>{variant.sku ?? `Variant #${variant.variant_id}`}</span>
                      <span>Tồn khả dụng: {variant.available_quantity}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};
