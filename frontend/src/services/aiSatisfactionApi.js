import { apiClient } from "./apiClient";

export async function analyzeSatisfactionResponse(payload) {
  const { data } = await apiClient.post("/ai/satisfaction/analyze", payload);
  return data?.data || data;
}