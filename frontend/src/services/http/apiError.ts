import axios from 'axios';

interface ErrorPayload {
  status?: number;
  error?: string;
  message?: string;
  path?: string;
}

const asErrorPayload = (value: unknown): ErrorPayload | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as ErrorPayload;
};

const nonBlank = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

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
    const payload = asErrorPayload(error.response?.data);
    const status = error.response?.status ?? payload?.status;
    const message =
      nonBlank(payload?.message)
      ?? nonBlank(payload?.error)
      ?? (status ? `Yêu cầu API thất bại (${status}).` : nonBlank(error.message))
      ?? 'Không thể kết nối tới API.';

    return new ApiClientError(message, status, nonBlank(payload?.path), error);
  }

  if (error instanceof Error) {
    return new ApiClientError(error.message || 'Đã xảy ra lỗi không xác định.', undefined, undefined, error);
  }

  return new ApiClientError('Đã xảy ra lỗi không xác định.', undefined, undefined, error);
};

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const message = normalizeApiError(error).message.trim();
  return message || fallback;
};
