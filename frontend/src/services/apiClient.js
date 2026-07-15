import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL?.trim() ||
  "http://localhost:5000/api";

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000,
});

apiClient.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("atomos_token") ||
      localStorage.getItem("atomos_auth_token");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("atomos_token");
      localStorage.removeItem("atomos_auth_token");
      localStorage.removeItem("atomos_auth_user");
    }

    return Promise.reject(error);
  }
);

export default apiClient;