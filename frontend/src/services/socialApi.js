import { apiClient } from "./apiClient";

export async function syncSocial() {
  const { data } = await apiClient.post("/social/sync");
  return data;
}

export async function fetchSocialReport(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, value);
    }
  });

  const { data } = await apiClient.get(`/social?${params.toString()}`);
  return data;
}