import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  analyzeSatisfactionResponse,
  SatisfactionAiResult,
} from "@/services/satisfactionApi";
import { colors } from "@/theme/colors";

export default function SatisfactionAiScreen() {
  const params = useLocalSearchParams<{
    ticketId?: string;
    rating?: string;
    category?: string;
    comment?: string;
  }>();

  const [result, setResult] = useState<SatisfactionAiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function run() {
      const comment = String(params.comment || "").trim();

      if (!comment) {
        setError("No comment is available for AI analysis.");
        setLoading(false);
        return;
      }

      try {
        const data = await analyzeSatisfactionResponse({
          ticketId: String(params.ticketId || ""),
          rating: String(params.rating || ""),
          category: String(params.category || ""),
          comment,
        });

        if (active) setResult(data);
      } catch (requestError: any) {
        if (active) {
          setError(
            requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to generate AI summary."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    run();
    return () => { active = false; };
  }, [params.ticketId, params.rating, params.category, params.comment]);

  return (
    <SafeAreaView style={styles.safe} edges={["top","left","right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>SATISFACTION ANALYTICS</Text>
          <Text style={styles.title}>AI Summary</Text>
          <Text style={styles.meta}>Ticket #{params.ticketId || "-"}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.commentCard}>
          <Text style={styles.label}>CUSTOMER COMMENT</Text>
          <Text style={styles.comment}>{params.comment || "No comment."}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Generating AI summary...</Text>
          </View>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <>
            <View style={styles.badges}>
              <View style={styles.badge}>
                <Text style={styles.badgeLabel}>SENTIMENT</Text>
                <Text style={styles.badgeValue}>{result?.sentiment || "-"}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeLabel}>TEAM</Text>
                <Text style={styles.badgeValue}>{result?.team || "-"}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>SUMMARY</Text>
              <Text style={styles.body}>{result?.summary || "No summary returned."}</Text>
            </View>

            {result?.recommendedAction ? (
              <View style={styles.section}>
                <Text style={styles.label}>RECOMMENDED ACTION</Text>
                <Text style={styles.body}>{result.recommendedAction}</Text>
              </View>
            ) : null}

            {result?.explanation ? (
              <View style={styles.section}>
                <Text style={styles.label}>EXPLANATION</Text>
                <Text style={styles.body}>{result.explanation}</Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: "900", letterSpacing: 1.4 },
  title: { marginTop: 3, color: colors.text, fontSize: 22, fontWeight: "900" },
  meta: { marginTop: 3, color: colors.textDim, fontSize: 10 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  commentCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,220,197,.24)",
    backgroundColor: colors.primarySoft,
    padding: 15,
  },
  label: { color: colors.primary, fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  comment: { marginTop: 8, color: colors.text, fontSize: 13, lineHeight: 20 },
  loadingCard: {
    minHeight: 120,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  error: { color: "#FCA5A5", backgroundColor: colors.dangerSoft, borderRadius: 14, padding: 12, fontSize: 11, fontWeight: "700" },
  badges: { flexDirection: "row", gap: 10 },
  badge: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 14 },
  badgeLabel: { color: colors.textDim, fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  badgeValue: { marginTop: 5, color: colors.text, fontSize: 13, fontWeight: "900" },
  section: { borderRadius: 18, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, padding: 15 },
  body: { marginTop: 8, color: colors.textMuted, fontSize: 13, lineHeight: 20 },
});
