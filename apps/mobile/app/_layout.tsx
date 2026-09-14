import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";

import NetworkBanner from "@/components/NetworkBanner";
import { AuthProvider } from "@/context/AuthContext";
import { DashboardSyncProvider } from "@/context/DashboardSyncContext";
import { NetworkProvider } from "@/context/NetworkContext";
import { colors } from "@/theme/colors";

export default function RootLayout() {
  return (
    <AuthProvider>
      <NetworkProvider>
        <DashboardSyncProvider>
          <View
            style={{
              flex: 1,
              backgroundColor:
                colors.background,
            }}
          >
            <StatusBar
              style="light"
            />

            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor:
                    colors.background,
                },
                animation: "fade",
              }}
            />

            <NetworkBanner />
          </View>
        </DashboardSyncProvider>
      </NetworkProvider>
    </AuthProvider>
  );
}
