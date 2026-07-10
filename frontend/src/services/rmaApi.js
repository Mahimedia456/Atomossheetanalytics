import { apiClient } from "./apiClient";

export async function syncGlobalRma() {
  const { data } = await apiClient.post("/rma/sync");
  return data;
}

export async function fetchGlobalRmaReport(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, value);
    }
  });

  const { data } = await apiClient.get(`/rma?${params.toString()}`);
  return data;
}