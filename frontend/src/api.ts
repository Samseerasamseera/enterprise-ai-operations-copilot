import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Use a separate client for refresh requests to avoid interceptor loops.
const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
});

export function setAccessToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

const savedToken = sessionStorage.getItem("access_token");

if (savedToken) {
  setAccessToken(savedToken);
}

type RetryableRequest = InternalAxiosRequestConfig & {
  _authRetry?: boolean;
};

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<{ access_token: string; token_type: string }>("/auth/refresh")
      .then((response) => {
        const newToken = response.data.access_token;
        sessionStorage.setItem("access_token", newToken);
        setAccessToken(newToken);
        return newToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as RetryableRequest | undefined;

    if (
      error.response?.status !== 401 ||
      !request ||
      request._authRetry ||
      request.url?.includes("/auth/login") ||
      request.url?.includes("/auth/register") ||
      request.url?.includes("/auth/refresh") ||
      request.url?.includes("/auth/logout")
    ) {
      return Promise.reject(error);
    }

    request._authRetry = true;

    try {
      const newToken = await refreshAccessToken();
      request.headers.Authorization = `Bearer ${newToken}`;
      return api(request);
    } catch (refreshError) {
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("selected_tenant");
      setAccessToken(null);

      window.dispatchEvent(new Event("auth:expired"));

      return Promise.reject(refreshError);
    }
  },
);

export interface Tenant {
  id: string;
  name: string;
}

export interface DocumentItem {
  id: string;
  filename: string;
  status: string;
  created_at?: string;
}

export interface SearchResult {
  content: string;
  document_id: string;
  chunk_index: number;
  distance?: number;
}

export interface Source {
  source: string;
  document_id: string;
  chunk_index: number;
}
