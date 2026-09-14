import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  colors,
} from "@/theme/colors";

export default function CacheNotice({
  fromCache,
  cacheSavedAt,
  stale,
}: {
  fromCache?: boolean;
  cacheSavedAt?: string;
  stale?: boolean;
}) {
  if (!fromCache) {
    return null;
  }

  return (
    <View
      style={
        styles.card
      }
    >
      <Text
        style={
          styles.title
        }
      >
        {stale
          ? "Cached data · may be outdated"
          : "Cached data"}
      </Text>

      <Text
        style={
          styles.meta
        }
      >
        {cacheSavedAt
          ? `Saved ${new Date(
              cacheSavedAt,
            ).toLocaleString()}`
          : "Live API is unavailable."}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    card: {
      borderWidth: 1,
      borderColor:
        "rgba(245,158,11,.32)",
      borderRadius: 14,
      backgroundColor:
        "rgba(245,158,11,.08)",
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    title: {
      color:
        colors.warning,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: .5,
    },
    meta: {
      marginTop: 3,
      color:
        colors.textDim,
      fontSize: 9,
    },
  });
