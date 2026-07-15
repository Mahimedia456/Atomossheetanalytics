import { apiClient } from "./apiClient";

function cleanParams(filters = {}) {
  return Object.entries(filters).reduce(
    (params, [key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        params[key] = value;
      }

      return params;
    },
    {},
  );
}

export async function fetchGlobalRmaReport(
  filters = {},
) {
  const response = await apiClient.get(
    "/global-rma",
    {
      params: cleanParams(filters),
    },
  );

  return response.data;
}

export async function syncGlobalRma() {
  const response = await apiClient.post(
    "/global-rma/sync",
  );

  return response.data;
}

export async function fetchGlobalRmaFilterOptions() {
  const response = await apiClient.get(
    "/global-rma/filters",
  );

  return response.data;
}

export async function fetchGlobalRmaStatus() {
  const response = await apiClient.get(
    "/global-rma/status",
  );

  return response.data;
}