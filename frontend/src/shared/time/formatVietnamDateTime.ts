const formatter = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' });
export function formatVietnamDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  // Backend LocalDateTime audit/order fields are recorded in UTC, without an offset.
  const utcValue = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`;
  const date = new Date(utcValue);
  return Number.isNaN(date.getTime()) ? '—' : formatter.format(date);
}
