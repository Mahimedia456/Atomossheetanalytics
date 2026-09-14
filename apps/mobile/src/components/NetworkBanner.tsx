import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useNetworkStatus,
} from "@/context/NetworkContext";
import {
  colors,
} from "@/theme/colors";

export default function NetworkBanner() {
  const {
    isConnected,
    isInternetReachable,
  } =
    useNetworkStatus();

  const offline =
    isConnected === false ||
    isInternetReachable === false;

  if (!offline) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={
        styles.banner
      }
    >
      <Text
        style={
          styles.text
        }
      >
        Offline mode · cached reports will be used where available
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    banner: {
      position: "absolute",
      zIndex: 1000,
      left: 12,
      right: 12,
      top: 8,
      minHeight: 32,
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        "rgba(245,158,11,.45)",
      backgroundColor:
        "rgba(22,16,5,.96)",
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 12,
    },
    text: {
      color:
        colors.warning,
      fontSize: 9,
      lineHeight: 13,
      fontWeight: "900",
      textAlign: "center",
    },
  });
