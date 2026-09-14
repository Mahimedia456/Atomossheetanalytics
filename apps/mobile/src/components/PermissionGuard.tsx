import { Ionicons } from "@expo/vector-icons";
import {
  PropsWithChildren,
} from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  router,
} from "expo-router";

import {
  useAuth,
} from "@/context/AuthContext";
import {
  canAccessModule,
  MobileModuleKey,
} from "@/utils/permissions";
import {
  colors,
} from "@/theme/colors";

type Props = PropsWithChildren<{
  module: MobileModuleKey;
  title?: string;
}>;

export default function PermissionGuard({
  module,
  title = "This report",
  children,
}: Props) {
  const {
    user,
  } =
    useAuth();

  if (
    canAccessModule(
      user,
      module,
    )
  ) {
    return <>{children}</>;
  }

  return (
    <View
      style={
        styles.container
      }
    >
      <View
        style={
          styles.icon
        }
      >
        <Ionicons
          name="lock-closed-outline"
          size={30}
          color={
            colors.primary
          }
        />
      </View>

      <Text
        style={
          styles.title
        }
      >
        Access restricted
      </Text>

      <Text
        style={
          styles.copy
        }
      >
        Your Atomos account does not currently have permission to open {title}.
      </Text>

      <Pressable
        onPress={() =>
          router.replace(
            "/(tabs)",
          )
        }
        style={
          styles.button
        }
      >
        <Text
          style={
            styles.buttonText
          }
        >
          Back to Tickets
        </Text>
      </Pressable>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        colors.background,
      alignItems:
        "center",
      justifyContent:
        "center",
      padding: 28,
    },
    icon: {
      width: 64,
      height: 64,
      borderRadius: 22,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        colors.primarySoft,
      borderWidth: 1,
      borderColor:
        "rgba(0,220,197,.28)",
    },
    title: {
      color:
        colors.text,
      fontSize: 22,
      fontWeight: "900",
      marginTop: 18,
    },
    copy: {
      maxWidth: 330,
      marginTop: 9,
      color:
        colors.textMuted,
      fontSize: 12,
      lineHeight: 19,
      textAlign: "center",
    },
    button: {
      marginTop: 22,
      minHeight: 46,
      borderRadius: 14,
      backgroundColor:
        colors.primary,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal: 20,
    },
    buttonText: {
      color: "#000",
      fontSize: 12,
      fontWeight: "900",
    },
  });
