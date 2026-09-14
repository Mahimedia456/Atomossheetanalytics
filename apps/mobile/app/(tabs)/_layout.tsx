import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";

import ScreenLoader from "@/components/ScreenLoader";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/theme/colors";
import { canAccessModule } from "@/utils/permissions";

export default function TabsLayout() {
  const {
    loading,
    isAuthenticated,
    user,
  } =
    useAuth();

  if (loading) {
    return <ScreenLoader />;
  }

  if (!isAuthenticated) {
    return (
      <Redirect href="/(auth)/login" />
    );
  }

  const canTickets =
    canAccessModule(
      user,
      "tickets",
    );

  const canRma =
    canAccessModule(
      user,
      "globalRma",
    );

  const canSocial =
    canAccessModule(
      user,
      "social",
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:
          colors.primary,
        tabBarInactiveTintColor:
          colors.textDim,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: 72,
          paddingTop: 7,
          paddingBottom: 10,
          backgroundColor:
            "#050505",
          borderTopColor:
            colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "800",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="home-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="tickets"
        options={{
          title: "Tickets",
          href:
            canTickets
              ? undefined
              : null,
          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="ticket-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="rma"
        options={{
          title: "RMA",
          href:
            canRma
              ? undefined
              : null,
          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="cube-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="social"
        options={{
          title: "Social",
          href:
            canSocial
              ? undefined
              : null,
          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="share-social-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="grid-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
