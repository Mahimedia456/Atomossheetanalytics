import { apiClient } from "./apiClient";

export async function syncSatisfaction() {
  const { data } = await apiClient.post("/satisfaction/sync");
  return data;
}

export async function fetchSatisfactionReport(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, value);
    }
  });

  const { data } = await apiClient.get(`/satisfaction?${params.toString()}`);
  return data;
}