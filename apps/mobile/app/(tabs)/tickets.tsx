import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CacheNotice from "@/components/CacheNotice";
import HorizontalBarChart from "@/components/HorizontalBarChart";
import MetricCard from "@/components/MetricCard";
import PermissionGuard from "@/components/PermissionGuard";
import { useDashboardSync } from "@/context/DashboardSyncContext";
import {
  fetchTicketReport,
  syncTickets,
  TicketReport,
  TicketRow,
} from "@/services/ticketApi";
import { colors } from "@/theme/colors";

function regionColor(
  value?: string,
) {
  const normalized =
    String(
      value || "",
    ).toUpperCase();

  if (normalized === "EMEA") {
    return colors.primary;
  }

  if (
    ["US", "USA", "NA"].includes(
      normalized,
    )
  ) {
    return colors.success;
  }

  if (normalized === "APAC") {
    return colors.info;
  }

  return colors.warning;
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active &&
          styles.chipActive,
      ]}
    >
      <Text
        style={[
          styles.chipText,
          active &&
            styles.chipTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TicketsScreenContent() {
  const {
    syncVersion,
  } = useDashboardSync();

  const [
    report,
    setReport,
  ] =
    useState<TicketReport | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    syncing,
    setSyncing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    region,
    setRegion,
  ] =
    useState("");

  const [
    selected,
    setSelected,
  ] =
    useState<TicketRow | null>(
      null,
    );

  const load =
    useCallback(
      async (
        showLoading = true,
      ) => {
        if (showLoading) {
          setLoading(true);
        }

        setError("");

        try {
          const data =
            await fetchTicketReport(
              {
                search,
                region,
                limit: 5000,
              },
            );

          setReport(data);
        } catch (
          requestError: any
        ) {
          setError(
            requestError?.response
              ?.data?.message ||
              requestError?.message ||
              "Unable to load ticket report.",
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        search,
        region,
      ],
    );

  useEffect(() => {
    const timer =
      setTimeout(
        () => load(),
        250,
      );

    return () =>
      clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (syncVersion > 0) {
      load(false);
    }
  }, [
    syncVersion,
    load,
  ]);

  async function doSync() {
    setSyncing(true);
    setError("");

    try {
      await syncTickets();
      await load(false);
    } catch (
      syncError: any
    ) {
      setError(
        syncError?.response
          ?.data?.message ||
          syncError?.message ||
          "Ticket sync failed.",
      );
    } finally {
      setSyncing(false);
    }
  }

  const analytics =
    report?.analytics || {};

  const rows =
    report?.rows || [];

  const regions =
    report?.filters?.regions || [];

  const topRegion =
    useMemo(
      () =>
        [
          ...(analytics.byRegion ||
            []),
        ].sort(
          (
            first,
            second,
          ) =>
            Number(
              second.value,
            ) -
            Number(
              first.value,
            ),
        )[0],
      [analytics.byRegion],
    );

  return (
    <SafeAreaView
      style={styles.safe}
      edges={[
        "top",
        "left",
        "right",
      ]}
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            tintColor={
              colors.primary
            }
            onRefresh={() => {
              setRefreshing(true);
              load(false);
            }}
          />
        }
      >
        <View
          style={
            styles.header
          }
        >
          <View
            style={{
              flex: 1,
            }}
          >
            <Text
              style={
                styles.eyebrow
              }
            >
              REPORTING ANALYTICS
            </Text>

            <Text
              style={
                styles.title
              }
            >
              Ticket Analytics
            </Text>

            <Text
              style={
                styles.synced
              }
            >
              {report?.syncedAt
                ? `Synced ${new Date(
                    report.syncedAt,
                  ).toLocaleString()}`
                : "Not synced"}
            </Text>
          </View>

          <Pressable
            onPress={
              doSync
            }
            disabled={
              syncing
            }
            style={
              styles.sync
            }
          >
            {syncing ? (
              <ActivityIndicator
                color="#000"
              />
            ) : (
              <Ionicons
                name="sync"
                size={18}
                color="#000"
              />
            )}
          </Pressable>
        </View>

        <TextInput
          value={search}
          onChangeText={
            setSearch
          }
          placeholder="Search ticket, product, subject..."
          placeholderTextColor={
            colors.textDim
          }
          style={
            styles.search
          }
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.chips
          }
        >
          <Chip
            label="All regions"
            active={!region}
            onPress={() =>
              setRegion("")
            }
          />

          {regions.map(
            (item) => (
              <Chip
                key={item}
                label={item}
                active={
                  region ===
                  item
                }
                onPress={() =>
                  setRegion(
                    item,
                  )
                }
              />
            ),
          )}
        </ScrollView>

        {error ? (
          <Text
            style={
              styles.error
            }
          >
            {error}
          </Text>
        ) : null}

        <CacheNotice
          fromCache={
            report?.fromCache
          }
          cacheSavedAt={
            report?.cacheSavedAt
          }
          stale={
            report?.cacheStale
          }
        />

        {loading &&
        !report ? (
          <ActivityIndicator
            size="large"
            color={
              colors.primary
            }
            style={{
              marginTop: 50,
            }}
          />
        ) : (
          <>
            <View
              style={
                styles.metrics
              }
            >
              <MetricCard
                label="Total Tickets"
                value={
                  analytics.totalTickets ??
                  report?.total ??
                  0
                }
              />

              <MetricCard
                label="Top Region"
                value={
                  topRegion?.name ||
                  "-"
                }
                accent={
                  regionColor(
                    topRegion?.name,
                  )
                }
              />
            </View>

            <HorizontalBarChart
              title="Product-wise Tickets"
              data={
                analytics.byProduct ||
                []
              }
            />

            <HorizontalBarChart
              title="Category-wise Tickets"
              data={
                analytics.byCategory ||
                []
              }
            />

            <HorizontalBarChart
              title="Region-wise Tickets"
              data={
                analytics.byRegion ||
                []
              }
            />

            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/report-table",
                  params: {
                    type: "tickets",
                    search,
                    region,
                  },
                })
              }
              style={styles.viewTableButton}
            >
              <Ionicons name="list-outline" size={18} color="#FFFFFF" />
              <Text style={styles.viewTableText}>View Table</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function TicketsScreen() {
  return (
    <PermissionGuard
      module="tickets"
      title="Ticket Analytics"
    >
      <TicketsScreenContent />
    </PermissionGuard>
  );
}

const styles =
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor:
        colors.background,
    },
    content: {
      padding: 16,
      paddingBottom: 36,
      gap: 14,
    },
    header: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems:
        "flex-start",
      gap: 12,
    },
    eyebrow: {
      color:
        colors.primary,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.6,
    },
    title: {
      color:
        colors.text,
      fontSize: 28,
      fontWeight: "900",
      marginTop: 5,
    },
    synced: {
      color:
        colors.textDim,
      fontSize: 10,
      marginTop: 6,
    },
    sync: {
      width: 44,
      height: 44,
      borderRadius: 15,
      backgroundColor:
        colors.primary,
      alignItems: "center",
      justifyContent:
        "center",
    },
    search: {
      height: 48,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 15,
      backgroundColor:
        colors.surface,
      color:
        colors.text,
      paddingHorizontal: 15,
      fontSize: 13,
    },
    chips: {
      gap: 8,
      paddingRight: 10,
    },
    chip: {
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 99,
      paddingHorizontal: 13,
      paddingVertical: 9,
      backgroundColor:
        colors.surface,
    },
    chipActive: {
      borderColor:
        colors.primary,
      backgroundColor:
        colors.primarySoft,
    },
    chipText: {
      color:
        colors.textMuted,
      fontSize: 10,
      fontWeight: "800",
    },
    chipTextActive: {
      color:
        colors.primary,
    },
    error: {
      color: "#FCA5A5",
      backgroundColor:
        colors.dangerSoft,
      borderRadius: 14,
      padding: 12,
      fontSize: 11,
      fontWeight: "700",
    },
    metrics: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    section: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      marginTop: 4,
    },
    sectionTitle: {
      color:
        colors.text,
      fontSize: 15,
      fontWeight: "900",
      textTransform:
        "uppercase",
      letterSpacing: 1,
    },
    count: {
      color:
        colors.textDim,
      fontSize: 10,
      fontWeight: "800",
    },
    ticket: {
      borderWidth: 1,
      borderColor:
        colors.borderSoft,
      borderRadius: 18,
      backgroundColor:
        colors.surface,
      padding: 14,
    },
    ticketTop: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
    },
    ticketNumber: {
      color:
        colors.text,
      fontSize: 14,
      fontWeight: "900",
    },
    region: {
      borderWidth: 1,
      borderRadius: 99,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    regionText: {
      fontSize: 9,
      fontWeight: "900",
    },
    subject: {
      color:
        colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 10,
    },
    ticketBottom: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      gap: 12,
      marginTop: 11,
    },
    date: {
      color:
        colors.textDim,
      fontSize: 10,
      fontWeight: "700",
    },
    product: {
      flex: 1,
      textAlign: "right",
      color:
        colors.primary,
      fontSize: 10,
      fontWeight: "800",
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor:
        "rgba(0,0,0,.72)",
    },
    sheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      maxHeight: "82%",
      backgroundColor:
        colors.surfaceRaised,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderColor:
        colors.border,
      padding: 20,
    },
    handle: {
      width: 42,
      height: 4,
      borderRadius: 99,
      backgroundColor:
        colors.border,
      alignSelf: "center",
      marginBottom: 18,
    },
    sheetTitle: {
      color:
        colors.text,
      fontSize: 20,
      fontWeight: "900",
      marginBottom: 10,
    },
    detail: {
      borderBottomWidth: 1,
      borderBottomColor:
        colors.borderSoft,
      paddingVertical: 9,
    },
    detailKey: {
      color:
        colors.textDim,
      fontSize: 9,
      fontWeight: "900",
      textTransform:
        "uppercase",
      letterSpacing: 1,
    },
    detailValue: {
      color:
        colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
    },
    close: {
      marginTop: 16,
      height: 46,
      borderRadius: 14,
      backgroundColor:
        colors.primary,
      alignItems: "center",
      justifyContent:
        "center",
    },
    closeText: {
      color: "#000",
      fontWeight: "900",
    },
viewTableButton: {
  minHeight: 50,
  borderRadius: 16,
  backgroundColor: colors.primary,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  paddingHorizontal: 18,
  marginTop: 4,
},
viewTableText: {
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: "900",
  letterSpacing: .5,
},

  });
