import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
const ACCESS_TOKEN_STORAGE_KEY = 'fido.accessToken';

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

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      setApiAccessToken(null);
    }
    return Promise.reject(error);
  },
);
