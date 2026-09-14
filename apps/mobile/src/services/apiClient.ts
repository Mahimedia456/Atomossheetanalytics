import axios from "axios";

const DEFAULT_API_URL = "https://reportatomos.mahimediasolutions.com/api";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_API_URL;

let authToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  authToken = token;
}

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json"
  }
});

apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  return config;
});

export default apiClient;
