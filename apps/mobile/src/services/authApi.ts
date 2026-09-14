import { apiClient } from "./apiClient";
import type { LoginResponse, MeResponse } from "@/types/auth";

export async function loginRequest(payload: {
  email: string;
  password: string;
}) {
  const { data } = await apiClient.post<LoginResponse>(
    "/auth/login",
    payload
  );

  return data;
}

export async function fetchMe() {
  const { data } = await apiClient.get<MeResponse>("/auth/me");
  return data;
}
