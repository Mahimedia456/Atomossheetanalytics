import { apiClient } from "./apiClient";

export async function syncTickets() {
  const { data } = await apiClient.post("/tickets/sync");
  return data;
}

export async function fetchTicketReport(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, value);
    }
  });

  const { data } = await apiClient.get(`/tickets?${params.toString()}`);
  return data;
}