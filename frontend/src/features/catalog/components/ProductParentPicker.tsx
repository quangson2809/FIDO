import { useCallback, useState } from 'react';
import { adminProductService } from '../api/adminService';
import { useRemoteQuery } from '../../../shared/hooks/useRemoteQuery';
import { productCreateControlId } from '../model/productCreateForm';

export function ProductParentPicker({
  value,
  onChange,
  disabled,
  error,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled: boolean;
  error?: string;
}) {
  const [searching, setSearching] = useState(false);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const selected = useRemoteQuery(
    useCallback(
      () => (value ? adminProductService.getProduct(Number(value)) : Promise.resolve(null)),
      [value],
    ),
  );
  const matches = useRemoteQuery(
    useCallback(
      () =>
        searching
          ? adminProductService.getProducts({
              q: search || undefined,
              root_only: true,
              page,
              page_size: 5,
            })
          : Promise.resolve(null),
      [searching, search, page],
    ),
  );
  const id = productCreateControlId('parentProductId');
  return (
    <div className="space-y-2 rounded-lg border border-[#E2E5DE] p-3">
      <p className="text-xs font-semibold">Sản phẩm cha (tùy chọn)</p>
      {value ? (
        <>
          {selected.loading ? (
            <p role="status">Đang tải sản phẩm cha...</p>
          ) : selected.error || !selected.data || selected.data.parent_product_id !== null ? (
            <p role="alert">Không thể dùng sản phẩm cha này. Hãy chọn lại hoặc bỏ quan hệ.</p>
          ) : (
            <p className="break-words text-sm">
              <strong>{selected.data.sku}</strong> · {selected.data.name ?? 'Chưa đặt tên'} · #
              {selected.data.product_id}
            </p>
          )}
          <button
            type="button"
            disabled={disabled}
            className="text-sm underline"
            onClick={() => onChange('')}
          >
            Bỏ sản phẩm cha
          </button>
        </>
      ) : (
        <p className="text-xs text-[#606863]">
          Đang tạo sản phẩm độc lập. Chọn cha nếu muốn tạo sản phẩm con.
        </p>
      )}
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? id + '-error' : undefined}
        aria-expanded={searching}
        className="admin-secondary"
        onClick={() => setSearching((current) => !current)}
      >
        {searching ? 'Ẩn tìm sản phẩm cha' : 'Chọn sản phẩm cha'}
      </button>
      {error && (
        <p id={id + '-error'} className="text-sm text-red-700">
          {error}
        </p>
      )}
      {searching && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <input
              aria-label="Tìm sản phẩm cha theo SKU hoặc tên"
              value={input}
              disabled={disabled}
              onChange={(event) => setInput(event.target.value)}
              className="min-w-0 flex-1 border px-3 py-2 text-sm"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  setSearch(input.trim());
                  setPage(1);
                  matches.reload();
                }
              }}
            />
            <button
              type="button"
              disabled={disabled}
              className="admin-secondary"
              onClick={() => {
                setSearch(input.trim());
                setPage(1);
                matches.reload();
              }}
            >
              Tìm cha
            </button>
          </div>
          {matches.loading && <p role="status">Đang tìm sản phẩm cha...</p>}
          {matches.error && (
            <p role="alert">
              Không thể tải danh sách cha.{' '}
              <button type="button" className="underline" onClick={matches.reload}>
                Thử tìm lại
              </button>
            </p>
          )}
          {matches.data?.data.length === 0 && <p>Không có sản phẩm cha phù hợp.</p>}
          <ul className="space-y-1">
            {matches.data?.data.map((product) => (
              <li key={product.product_id}>
                <button
                  type="button"
                  disabled={disabled}
                  className="w-full break-words rounded border p-2 text-left text-sm"
                  onClick={() => {
                    onChange(String(product.product_id));
                    setSearching(false);
                  }}
                >
                  Chọn {product.sku} · {product.name ?? 'Chưa đặt tên'} · #{product.product_id}
                </button>
              </li>
            ))}
          </ul>
          {matches.data && (
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                disabled={disabled || matches.loading || page <= 1}
                onClick={() => setPage((n) => n - 1)}
              >
                Trang cha trước
              </button>
              <span>
                Trang {page} · {matches.data.meta.total} sản phẩm cấp gốc
              </span>
              <button
                type="button"
                disabled={disabled || matches.loading || page >= matches.data.meta.total_pages}
                onClick={() => setPage((n) => n + 1)}
              >
                Trang cha sau
              </button>
            </div>
          )}
        </div>
      )}
      <p className="text-xs text-[#606863]">
        Sản phẩm con có SKU, giá, thuộc tính và ảnh riêng; các trường để trống không lấy dữ liệu từ
        cha.
      </p>
    </div>
  );
}
