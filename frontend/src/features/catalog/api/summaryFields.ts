import type { SizeValueDto } from '../types';

export function summaryMaterialCare(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new Error('Thông tin chất liệu sản phẩm không hợp lệ.');
  return value;
}

export function summarySizes(value: unknown): SizeValueDto[] | null {
  // Older deployments do not provide summary sizes yet; do not imply there are none.
  if (value === undefined) return null;
  if (!Array.isArray(value)) throw new Error('Thông tin kích cỡ sản phẩm không hợp lệ.');
  return value.map((size: unknown) => {
    if (typeof size !== 'object' || size === null ||
      !('size_value_id' in size) || !('size_system_id' in size) ||
      !('code' in size) || !('display_name' in size) || !('sort_order' in size) ||
      typeof size.size_value_id !== 'number' || !Number.isSafeInteger(size.size_value_id) || size.size_value_id <= 0 ||
      typeof size.size_system_id !== 'number' || !Number.isSafeInteger(size.size_system_id) || size.size_system_id <= 0 ||
      typeof size.code !== 'string' || typeof size.display_name !== 'string' ||
      typeof size.sort_order !== 'number' || !Number.isSafeInteger(size.sort_order)) {
      throw new Error('Thông tin kích cỡ sản phẩm không hợp lệ.');
    }
    return {
      size_value_id: size.size_value_id, size_system_id: size.size_system_id,
      code: size.code, display_name: size.display_name, sort_order: size.sort_order,
    };
  });
}
