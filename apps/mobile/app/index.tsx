import { Redirect } from "expo-router";

import ScreenLoader from "@/components/ScreenLoader";
import { useAuth } from "@/context/AuthContext";

export default function Index() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return <ScreenLoader />;
  }

  return (
    <Redirect
      href={isAuthenticated ? "/(tabs)" : "/(auth)/login"}
    />
  );
}
