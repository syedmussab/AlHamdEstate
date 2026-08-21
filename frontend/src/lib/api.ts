"use client";

import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

const TOKEN_KEY = "alhamd_access";
const REFRESH_KEY = "alhamd_refresh";

export const getAccessToken = () => localStorage.getItem(TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);

export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
};

export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const isAuthCall = original?.url?.includes("/auth/");

    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        if (typeof window !== "undefined") window.location.href = "/login";
        return Promise.reject(error);
      }
      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });
        setTokens(data.accessToken, data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        clearTokens();
        if (typeof window !== "undefined") window.location.href = "/login";
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    if (Array.isArray(data?.message)) return data!.message.join(", ");
    if (data?.message) return data.message;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}
