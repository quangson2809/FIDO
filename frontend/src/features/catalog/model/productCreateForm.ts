import type {
  AdminCatalogMetaDto,
  CatalogMetaDto,
  ImageUploadLimits,
  ProductCreateInput,
  ProductStatus,
} from '../types';
import { buildProductAttributeValueIds, type ProductAttributeDraft } from './productAttributeForm';

export interface ProductCreateForm {
  sku: string;
  name: string;
  slug: string;
  categoryId: string;
  brandId: string;
  parentProductId: string;
  sellingPrice: string;
  costPrice: string;
  description: string;
  status: ProductStatus;
}
export const emptyProductCreateForm: ProductCreateForm = {
  sku: '',
  name: '',
  slug: '',
  categoryId: '',
  brandId: '',
  parentProductId: '',
  sellingPrice: '',
  costPrice: '',
  description: '',
  status: 'DRAFT',
};
export type ProductCreateErrors = Record<string, string>;
export const productCreateControlId = (field: string) =>
  'product-create-' + field.replace(':', '-');

export const buildProductCreate = (
  form: ProductCreateForm,
  draft: ProductAttributeDraft,
  catalog: CatalogMetaDto | null,
  admin: AdminCatalogMetaDto | null,
): { payload: ProductCreateInput | null; errors: ProductCreateErrors } => {
  const errors: ProductCreateErrors = {};
  const sku = form.sku.trim();
  if (!sku || sku.length > 100) errors.sku = 'Nhập SKU, tối đa 100 ký tự.';
  const price = Number(form.sellingPrice);
  const cost = form.costPrice.trim() ? Number(form.costPrice) : null;
  if (!form.sellingPrice.trim() || !Number.isSafeInteger(price) || price < 0)
    errors.sellingPrice = 'Nhập giá bán VND nguyên, không âm (bắt buộc cả khi lưu nháp).';
  if (cost !== null && (!Number.isSafeInteger(cost) || cost < 0))
    errors.costPrice = 'Giá vốn phải là số VND nguyên, không âm.';
  if (form.name.length > 255) errors.name = 'Tên tối đa 255 ký tự.';
  if (form.slug.length > 200) errors.slug = 'Slug tối đa 200 ký tự.';
  const id = (key: 'categoryId' | 'brandId' | 'parentProductId'): number | null => {
    if (!form[key].trim()) return null;
    const value = Number(form[key]);
    if (!Number.isSafeInteger(value) || value <= 0) errors[key] = 'Chọn một giá trị hợp lệ.';
    return value;
  };
  const category = id('categoryId');
  const brand = id('brandId');
  const parent = id('parentProductId');
  if (
    category !== null &&
    !catalog?.categories.some((row) => row.category_id === category && row.status === 'ACTIVE')
  )
    errors.categoryId =
      'Danh mục chưa được xác nhận đang hoạt động. Tải lại danh mục hoặc bỏ lựa chọn.';
  if (
    brand !== null &&
    !catalog?.brands.some((row) => row.brand_id === brand && row.status === 'ACTIVE')
  )
    errors.brandId =
      'Thương hiệu chưa được xác nhận đang hoạt động. Tải lại thương hiệu hoặc bỏ lựa chọn.';
  if (!admin && (form.status === 'ACTIVE' || Object.values(draft).some(Boolean)))
    errors.attributes = 'Tải lại thuộc tính trước khi lưu. Các lựa chọn đã nhập vẫn được giữ.';
  const attributes = admin?.attributes ?? [];
  for (const attribute of attributes) {
    const selected = draft[String(attribute.id)] ?? '';
    const checked = buildProductAttributeValueIds(
      [attribute],
      { [attribute.id]: selected },
      form.status,
    );
    if (checked.errors[0]) errors['attribute:' + attribute.id] = checked.errors[0];
  }
  const checked = buildProductAttributeValueIds(attributes, draft, form.status);
  if (
    Object.entries(draft).some(
      ([key, value]) => value && !attributes.some((a) => String(a.id) === key),
    )
  )
    errors.attributes =
      'Một lựa chọn thuộc tính không còn trong metadata. Tải lại hoặc bỏ lựa chọn đó trước khi lưu.';
  return {
    errors,
    payload: Object.keys(errors).length
      ? null
      : {
          sku,
          name: form.name.trim() || null,
          slug: form.slug.trim() || null,
          description: form.description.trim() || null,
          selling_price: price,
          cost_price: cost,
          parent_product_id: parent,
          category_id: category,
          brand_id: brand,
          status: form.status,
          attribute_value_ids: checked.attributeValueIds,
        },
  };
};

export const productCreateServerError = (code: string | undefined): [string, string] | null => {
  switch (code) {
    case 'PRODUCT_SKU_ALREADY_EXISTS':
      return ['sku', 'SKU đã tồn tại. Chọn SKU khác hoặc mở sản phẩm đang có.'];
    case 'PRODUCT_PARENT_INVALID':
      return ['parentProductId', 'Chọn sản phẩm cha cấp gốc; quan hệ chỉ có một cấp con.'];
    case 'PRODUCT_PARENT_NOT_FOUND':
      return ['parentProductId', 'Sản phẩm cha không còn tồn tại. Chọn lại sản phẩm cha.'];
    case 'PRODUCT_CATEGORY_INACTIVE':
      return ['categoryId', 'Danh mục đã ngừng hoạt động. Chọn lại hoặc để trống.'];
    case 'PRODUCT_BRAND_INACTIVE':
      return ['brandId', 'Thương hiệu đã ngừng hoạt động. Chọn lại hoặc để trống.'];
    case 'PRODUCT_CATEGORY_NOT_FOUND':
      return ['categoryId', 'Danh mục không còn tồn tại. Chọn lại hoặc để trống.'];
    case 'PRODUCT_BRAND_NOT_FOUND':
      return ['brandId', 'Thương hiệu không còn tồn tại. Chọn lại hoặc để trống.'];
    default:
      return null;
  }
};

export const validateProductImageFiles = (
  files: readonly File[],
  limits?: ImageUploadLimits,
): string | null => {
  if (!files.length) return null;
  if (!limits) return 'Chưa tải được giới hạn ảnh. Tải lại metadata trước khi tạo kèm ảnh.';
  if (files.length > limits.max_files)
    return `Mỗi lần tải tối đa ${limits.max_files} ảnh. Bỏ bớt ảnh để tiếp tục.`;
  for (const file of files) {
    if (!file.size) return `Ảnh "${file.name}" đang rỗng.`;
    if (!limits.content_types.includes(file.type))
      return `Ảnh "${file.name}" không thuộc định dạng JPEG, PNG hoặc WebP được hỗ trợ.`;
    if (file.size > limits.max_file_bytes)
      return `Ảnh "${file.name}" vượt giới hạn ${(limits.max_file_bytes / 1024 / 1024).toLocaleString('vi-VN')} MB.`;
  }
  // Multipart headers add overhead; the server still enforces the exact request limit.
  if (
    limits.max_request_bytes > 0 &&
    files.reduce((total, file) => total + file.size, 0) >= limits.max_request_bytes
  )
    return 'Tổng dung lượng ảnh vượt giới hạn một lần tải. Bỏ bớt ảnh để tiếp tục.';
  return null;
};
