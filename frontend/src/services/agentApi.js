import { apiClient } from "./apiClient";

function buildQuery(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      params.append(key, value);
    }
  });

  return params.toString();
}

export async function fetchAgentReport(filters = {}) {
  const query = buildQuery(filters);
  const url = query ? `/agents?${query}` : "/agents";

  const { data } = await apiClient.get(url);

  return data;
}

export async function syncAgents() {
  const { data } = await apiClient.post("/agents/sync");
  return data;
}

export async function unsyncAgents() {
  const { data } = await apiClient.post("/agents/unsync");
  return data;
}
