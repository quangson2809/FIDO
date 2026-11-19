import axios from 'axios';
import messages from '../../../../contracts/error-messages.vi.json';

const publicMessages: Readonly<Record<string, string>> = messages;
const knownMessage = (code: string | undefined): string | undefined =>
  code && Object.hasOwn(publicMessages, code) ? publicMessages[code] : undefined;

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
  readonly code?: string;
  readonly path?: string;
  readonly cause: unknown;

  constructor(message: string, status?: number, path?: string, cause?: unknown, code?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.path = path;
    this.cause = cause;
  }
}

export const normalizeApiError = (error: unknown): ApiClientError => {
  if (error instanceof ApiClientError) return error;

  if (axios.isAxiosError(error)) {
    const payload = error.response?.data;
    const status = error.response?.status ?? numericStatus(objectProperty(payload, 'status'));
    const code = nonBlank(objectProperty(payload, 'code')) ??
      (knownMessage(nonBlank(objectProperty(payload, 'message')))
        ? nonBlank(objectProperty(payload, 'message')) : undefined);
    const message = (status && status < 500 ? knownMessage(code) : undefined) ??
      (status ? messages.REQUEST_REJECTED : 'Không thể kết nối. Vui lòng kiểm tra kết nối mạng và thử lại.');
    return new ApiClientError(message, status, nonBlank(objectProperty(payload, 'path')), error, code);
  }

  if (error instanceof Error) {
    return new ApiClientError(
      messages.REQUEST_REJECTED,
      undefined,
      undefined,
      error,
    );
  }

  return new ApiClientError(messages.REQUEST_REJECTED, undefined, undefined, error);
};

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const normalized = normalizeApiError(error);
  if (!normalized.status || normalized.status >= 500) return fallback;
  if (normalized.status === 401) {
    return normalized.code === 'INVALID_CREDENTIALS'
      ? messages.INVALID_CREDENTIALS : messages.UNAUTHENTICATED;
  }
  if (normalized.status === 403) {
    return normalized.code === 'ACCOUNT_NOT_ACTIVE'
      ? messages.ACCOUNT_NOT_ACTIVE : messages.FORBIDDEN;
  }
  if (normalized.status === 404) return knownMessage(normalized.code) ?? messages.RESOURCE_NOT_FOUND;
  return knownMessage(normalized.code) ?? knownMessage(normalized.message.trim()) ?? fallback;
};
