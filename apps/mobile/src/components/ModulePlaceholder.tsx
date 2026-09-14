import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";

type Props = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export default function ModulePlaceholder({ title, description, icon }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.iconShell}>
          <Ionicons name={icon} size={28} color={colors.primary} />
        </View>
        <Text style={styles.eyebrow}>ATOMOS REPORTING</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.pill}>
          <Text style={styles.pillText}>UI module scheduled for next phase</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center"
  },
  iconShell: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: "rgba(0,220,197,0.28)"
  },
  eyebrow: {
    marginTop: 22,
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2
  },
  title: {
    marginTop: 8,
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center"
  },
  description: {
    marginTop: 10,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 340
  },
  pill: {
    marginTop: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  pillText: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "800"
  }
});
