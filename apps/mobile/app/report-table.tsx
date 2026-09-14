import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fetchGlobalRmaReport } from "@/services/globalRmaApi";
import { fetchRushRmaReport } from "@/services/rushRmaApi";
import { fetchSatisfactionReport } from "@/services/satisfactionApi";
import { fetchSocialReport } from "@/services/socialApi";
import { fetchTicketReport } from "@/services/ticketApi";
import { colors } from "@/theme/colors";

type ReportType = "tickets" | "satisfaction" | "global-rma" | "rush-rma" | "social";

function textValue(input: unknown) {
  const output = String(input ?? "").trim();
  return output || "-";
}

function firstValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim()) return value;
  }
  return "";
}

function titleFor(type: ReportType) {
  if (type === "tickets") return "Ticket Table";
  if (type === "satisfaction") return "Satisfaction Table";
  if (type === "global-rma") return "Global RMA Table";
  if (type === "rush-rma") return "Rush RMA Table";
  return "Social Table";
}

function fieldsFor(type: ReportType, row: Record<string, unknown>) {
  if (type === "tickets") {
    return [
      ["Ticket ID", firstValue(row, ["ticketNumber","ticketId"])],
      ["Date", row.date],
      ["Region", row.region],
      ["Product", row.product],
      ["Category", row.category],
      ["Subject", row.subject],
      ["Comment", row.comment],
    ];
  }
  if (type === "satisfaction") {
    return [
      ["Ticket ID", firstValue(row, ["ticketId","ticket_id","ticketNumber","ticket_number"])],
      ["Date", firstValue(row, ["date","date_display","updatedDate","updated_date"])],
      ["Rating", row.rating],
      ["Category", firstValue(row, ["category","Category"])],
      ["Comment", firstValue(row, ["comments","comment","feedback"])],
    ];
  }
  if (type === "global-rma") {
    return [
      ["RMA", row.rmaNumber],
      ["Date", row.entryDate],
      ["Processed Date", row.processedDate],
      ["Region", row.region],
      ["Product", firstValue(row, ["productName","deviceName","product"])],
      ["Fault Category", row.faultCategory],
      ["Action Taken", row.actionTaken],
      ["RMA Status", row.rmaStatus],
      ["Customer Return Tracking", row.customerReturnTrackingNumber],
    ];
  }
  if (type === "rush-rma") {
    return [
      ["Region", row.region],
      ["Month", row.month],
      ["Product", row.product],
      ["Actual RMA", row.actualRmaReplacement],
      ["D Stock Received", row.dStockUnitsReceived],
      ["Pending to Ship", row.pendingToShip],
      ["Pending to Receive", row.pendingToReceive],
      ["Description", row.description],
    ];
  }
  return [
    ["Date", row.postQueryDate],
    ["Platform", row.socialPlatform],
    ["Country", row.country],
    ["Product", row.product],
    ["Category", row.category],
    ["Customer Sentiments", row.customerResponse],
    ["Query", row.postQuery],
    ["Response", row.response],
  ];
}

export default function ReportTableScreen() {
  const params = useLocalSearchParams<{
    type?: string;
    search?: string;
    region?: string;
    year?: string;
    product?: string;
    month?: string;
    platform?: string;
    sentiment?: string;
    rating?: string;
  }>();

  const type = (params.type || "tickets") as ReportType;
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      if (type === "tickets") {
        const data = await fetchTicketReport({
          search: params.search || "",
          region: params.region || "",
          limit: 5000,
        });
        setRows(data.rows as Record<string, unknown>[]);
      } else if (type === "satisfaction") {
        const data = await fetchSatisfactionReport({
          search: params.search || "",
          rating: params.rating || "Good",
          limit: 5000,
        });
        setRows(data.rows as Record<string, unknown>[]);
      } else if (type === "global-rma") {
        const data = await fetchGlobalRmaReport({
          search: params.search || "",
          region: params.region || "",
          year: params.year || "",
          limit: 5000,
        });
        setRows(data.rows as Record<string, unknown>[]);
      } else if (type === "rush-rma") {
        const data = await fetchRushRmaReport({
          search: params.search || "",
          region: params.region || "",
          product: params.product || "",
          month: params.month || "",
          limit: 5000,
        });
        setRows(data.rows as Record<string, unknown>[]);
      } else {
        const data = await fetchSocialReport({
          search: params.search || "",
          socialPlatform: params.platform || "",
          platform: params.platform || "",
          customerResponse: params.sentiment || "",
          limit: 5000,
        });
        setRows(data.rows as Record<string, unknown>[]);
      }
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.message ||
        requestError?.message ||
        "Unable to load table."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    type,
    params.search,
    params.region,
    params.year,
    params.product,
    params.month,
    params.platform,
    params.sentiment,
    params.rating,
  ]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={["top","left","right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>REPORT TABLE</Text>
          <Text style={styles.title}>{titleFor(type)}</Text>
          <Text style={styles.count}>{rows.length} records</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
        ) : (
          rows.map((row, index) => {
            const fields = fieldsFor(type, row);
            const comment =
              type === "satisfaction"
                ? String(firstValue(row, ["comments","comment","feedback"]) || "")
                : "";

            return (
              <View key={`${type}-${index}`} style={styles.card}>
                {fields.map(([label, value]) => (
                  <View key={String(label)} style={styles.field}>
                    <Text style={styles.fieldLabel}>{String(label)}</Text>
                    <Text style={styles.fieldValue}>{textValue(value)}</Text>
                  </View>
                ))}

                {type === "satisfaction" && comment ? (
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/satisfaction-ai",
                        params: {
                          ticketId: textValue(firstValue(row, ["ticketId","ticket_id","ticketNumber","ticket_number"])),
                          rating: textValue(row.rating),
                          category: textValue(firstValue(row, ["category","Category"])),
                          comment,
                        },
                      })
                    }
                    style={styles.aiButton}
                  >
                    <Ionicons name="sparkles-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.aiButtonText}>AI Summary</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })
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
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: "900", letterSpacing: 1.5 },
  title: { marginTop: 3, color: colors.text, fontSize: 22, fontWeight: "900" },
  count: { marginTop: 3, color: colors.textDim, fontSize: 10, fontWeight: "700" },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  error: { color: "#FCA5A5", backgroundColor: colors.dangerSoft, borderRadius: 14, padding: 12, fontSize: 11, fontWeight: "700" },
  card: { borderRadius: 18, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, padding: 14 },
  field: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  fieldLabel: { color: colors.textDim, fontSize: 9, fontWeight: "900", textTransform: "uppercase", letterSpacing: .9 },
  fieldValue: { color: colors.text, fontSize: 12, lineHeight: 18, marginTop: 4 },
  aiButton: {
    minHeight: 44,
    borderRadius: 13,
    marginTop: 12,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  aiButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
});
