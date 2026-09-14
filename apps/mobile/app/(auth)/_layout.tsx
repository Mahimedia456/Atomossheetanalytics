import { Redirect, Stack } from "expo-router";

import ScreenLoader from "@/components/ScreenLoader";
import { useAuth } from "@/context/AuthContext";

export default function AuthLayout() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return <ScreenLoader />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
