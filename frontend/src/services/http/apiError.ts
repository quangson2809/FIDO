import axios from 'axios';

const objectProperty = (value: unknown, key: string): unknown => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return Reflect.get(value, key);
};

const nonBlank = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const numericStatus = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isInteger(value) ? value : undefined;

export class ApiClientError extends Error {
  readonly status?: number;
  readonly path?: string;
  readonly cause: unknown;

  constructor(message: string, status?: number, path?: string, cause?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.path = path;
    this.cause = cause;
  }
}

export const normalizeApiError = (error: unknown): ApiClientError => {
  if (error instanceof ApiClientError) return error;

  if (axios.isAxiosError(error)) {
    const payload = error.response?.data;
    const status = error.response?.status ?? numericStatus(objectProperty(payload, 'status'));
    const message =
      nonBlank(objectProperty(payload, 'message'))
      ?? nonBlank(objectProperty(payload, 'error'))
      ?? (status ? `Yêu cầu API thất bại (${status}).` : nonBlank(error.message))
      ?? 'Không thể kết nối tới API.';

    return new ApiClientError(
      message,
      status,
      nonBlank(objectProperty(payload, 'path')),
      error,
    );
  }

  if (error instanceof Error) {
    return new ApiClientError(error.message || 'Đã xảy ra lỗi không xác định.', undefined, undefined, error);
  }

  return new ApiClientError('Đã xảy ra lỗi không xác định.', undefined, undefined, error);
};

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const normalized = normalizeApiError(error);
  const message = normalized.message.trim();

  if (!message || /^Yêu cầu API thất bại \(\d+\)\.$/.test(message)) {
    return normalized.status ? `${fallback} (HTTP ${normalized.status})` : fallback;
  }

  return message;
};
