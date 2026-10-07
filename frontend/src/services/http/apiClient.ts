import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { normalizeApiError } from './apiError';

const DEFAULT_API_BASE_URL = 'http://localhost:8080/api/v1';
const ACCESS_TOKEN_STORAGE_KEY = 'fido.accessToken';

const normalizeBaseUrl = (value: string | undefined): string => {
  const normalized = value?.trim().replace(/\/+$/, '');
  return normalized || DEFAULT_API_BASE_URL;
};

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);

const readStoredAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  try {
    const token = window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    return token && token.trim() ? token : null;
  } catch {
    return null;
  }
};

let accessToken: string | null = readStoredAccessToken();

export const setApiAccessToken = (token: string | null): void => {
  accessToken = token && token.trim() ? token : null;

  if (typeof window === 'undefined') return;

  try {
    if (accessToken) {
      window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
    } else {
      window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Keep the in-memory token when browser storage is unavailable.
  }
};

export const hasApiAccessToken = (): boolean => accessToken !== null;

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
  },
});

axiosClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      setApiAccessToken(null);
    }
    return Promise.reject(normalizeApiError(error));
  },
);

const responseBody = async <T>(request: Promise<AxiosResponse<T>>): Promise<T> =>
  (await request).data;

export const apiClient = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return responseBody(axiosClient.get<T>(url, config));
  },

  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return responseBody(axiosClient.post<T>(url, data, config));
  },

  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return responseBody(axiosClient.put<T>(url, data, config));
  },

  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return responseBody(axiosClient.patch<T>(url, data, config));
  },

  delete<T = void>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return responseBody(axiosClient.delete<T>(url, config));
  },
};
