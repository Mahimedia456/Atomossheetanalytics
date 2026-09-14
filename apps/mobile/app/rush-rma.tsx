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

import HorizontalBarChart from "@/components/HorizontalBarChart";
import MetricCard from "@/components/MetricCard";
import {
  fetchRushRmaReport,
  RushRmaReport,
  RushRmaRow,
  syncRushRma,
} from "@/services/rushRmaApi";
import { colors } from "@/theme/colors";
import { useDashboardSync } from "@/context/DashboardSyncContext";
import PermissionGuard from "@/components/PermissionGuard";
import CacheNotice from "@/components/CacheNotice";

type TabKey =
  | "summary"
  | "US RMA"
  | "EMEA RMA";

const tabs: Array<{
  key: TabKey;
  label: string;
}> = [
  {
    key: "summary",
    label: "Summary",
  },
  {
    key: "US RMA",
    label: "US RMA",
  },
  {
    key: "EMEA RMA",
    label: "EMEA RMA",
  },
];

function FilterChip({
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

function regionColor(
  value?: string,
) {
  const normalized =
    String(
      value || "",
    ).toUpperCase();

  if (
    normalized.includes(
      "EMEA",
    )
  ) {
    return colors.primary;
  }

  if (
    normalized.includes(
      "US",
    )
  ) {
    return colors.success;
  }

  return colors.info;
}

function RushRmaScreenContent() {
  const { syncVersion } = useDashboardSync();

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<TabKey>(
      "summary",
    );

  const [
    report,
    setReport,
  ] =
    useState<RushRmaReport | null>(
      null,
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    product,
    setProduct,
  ] =
    useState("");

  const [
    month,
    setMonth,
  ] =
    useState("");

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
    selected,
    setSelected,
  ] =
    useState<RushRmaRow | null>(
      null,
    );

  const effectiveRegion =
    activeTab === "summary"
      ? ""
      : activeTab;

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
            await fetchRushRmaReport(
              {
                search,
                region:
                  effectiveRegion,
                product,
                month,
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
              "Unable to load Rush RMA report.",
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        search,
        effectiveRegion,
        product,
        month,
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
  }, [syncVersion]);

  async function doSync() {
    setSyncing(true);
    setError("");

    try {
      await syncRushRma();
      await load(false);
    } catch (
      syncError: any
    ) {
      setError(
        syncError?.response
          ?.data?.message ||
          syncError?.message ||
          "Rush RMA sync failed.",
      );
    } finally {
      setSyncing(false);
    }
  }

  const analytics =
    report?.analytics ||
    {};

  const rows =
    report?.rows ||
    [];

  const productRows =
    useMemo(
      () =>
        [
          ...(analytics.byProduct ||
            []),
        ].sort(
          (
            first,
            second,
          ) =>
            Number(
              second.value ||
                0,
            ) -
            Number(
              first.value ||
                0,
            ),
        ),
      [analytics.byProduct],
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
          <Pressable
            onPress={() =>
              router.back()
            }
            style={
              styles.back
            }
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={
                colors.text
              }
            />
          </Pressable>

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
              US + EMEA INVENTORY
            </Text>

            <Text
              style={
                styles.title
              }
            >
              Rush RMA
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
                : "Google Sheet report"}
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.tabs
          }
        >
          {tabs.map(
            (tab) => (
              <FilterChip
                key={tab.key}
                label={tab.label}
                active={
                  activeTab ===
                  tab.key
                }
                onPress={() =>
                  setActiveTab(
                    tab.key,
                  )
                }
              />
            ),
          )}
        </ScrollView>

        <TextInput
          value={search}
          onChangeText={
            setSearch
          }
          placeholder="Search product or description..."
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
            styles.tabs
          }
        >
          <FilterChip
            label="All products"
            active={!product}
            onPress={() =>
              setProduct("")
            }
          />

          {(
            report?.filters
              ?.products ||
            []
          )
            .slice(
              0,
              50,
            )
            .map(
              (item) => (
                <FilterChip
                  key={item}
                  label={item}
                  active={
                    product ===
                    item
                  }
                  onPress={() =>
                    setProduct(
                      item,
                    )
                  }
                />
              ),
            )}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.tabs
          }
        >
          <FilterChip
            label="All months"
            active={!month}
            onPress={() =>
              setMonth("")
            }
          />

          {(
            report?.filters
              ?.months ||
            []
          ).map(
            (item) => (
              <FilterChip
                key={item}
                label={item}
                active={
                  month === item
                }
                onPress={() =>
                  setMonth(
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
            Boolean(
              (report as any)?.fromCache,
            )
          }
          cacheSavedAt={
            (report as any)?.cacheSavedAt
          }
          stale={
            Boolean(
              (report as any)?.cacheStale,
            )
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
                label="Actual RMA Replacement"
                value={
                  analytics.actualRmaReplacement ||
                  0
                }
              />

              <MetricCard
                label="D Stock Units Received"
                value={
                  analytics.dStockUnitsReceived ||
                  0
                }
                accent={
                  colors.info
                }
              />

              <MetricCard
                label="Total Queries"
                value={
                  analytics.googleDriveRmaCases ||
                  0
                }
                accent={
                  colors.primary
                }
              />

              <MetricCard
                label="Pending to Ship"
                value={
                  analytics.pendingToShip ||
                  0
                }
                accent={
                  colors.warning
                }
              />

              <MetricCard
                label="Pending to Receive"
                value={
                  analytics.pendingToReceive ||
                  0
                }
                accent={
                  colors.danger
                }
              />
            </View>

            <HorizontalBarChart
              title="Month-wise Actual RMA"
              data={
                analytics.byMonth ||
                []
              }
            />

            <HorizontalBarChart
              title="Product-wise Actual RMA"
              data={
                productRows
              }
            />

            <HorizontalBarChart
              title="Sent Out Summary"
              data={
                analytics.sentOutSummary ||
                []
              }
            />

            {activeTab ===
            "summary" ? (
              <HorizontalBarChart
                title="Region-wise RMA"
                data={
                  analytics.byRegion ||
                  []
                }
              />
            ) : null}

            <HorizontalBarChart
              title="Stock Received Summary"
              data={
                analytics.stockSummary ||
                []
              }
            />

            {/*
              Pending Summary and D Stock Received charts
              remain intentionally disabled to match the
              current web checkpoint.
            */}

            <View
              style={
                styles.sectionHead
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Rush RMA Records
              </Text>

              <Text
                style={
                  styles.count
                }
              >
                {
                  rows.length
                }{" "}
                records
              </Text>
            </View>

            {rows
              .slice(
                0,
                180,
              )
              .map(
                (
                  row,
                  index,
                ) => (
                  <Pressable
                    key={`${row.region}-${row.month}-${row.product}-${index}`}
                    onPress={() =>
                      setSelected(
                        row,
                      )
                    }
                    style={
                      styles.card
                    }
                  >
                    <View
                      style={
                        styles.cardTop
                      }
                    >
                      <Text
                        style={
                          styles.cardProduct
                        }
                      >
                        {row.product ||
                          "Unknown Product"}
                      </Text>

                      <View
                        style={[
                          styles.regionBadge,
                          {
                            borderColor:
                              regionColor(
                                row.region,
                              ),
                            backgroundColor:
                              `${regionColor(
                                row.region,
                              )}18`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.regionText,
                            {
                              color:
                                regionColor(
                                  row.region,
                                ),
                            },
                          ]}
                        >
                          {row.region ||
                            "Unknown"}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={
                        styles.cardMeta
                      }
                    >
                      {row.month ||
                        "No month"}
                    </Text>

                    <Text
                      numberOfLines={
                        3
                      }
                      style={
                        styles.description
                      }
                    >
                      {row.description ||
                        "No description"}
                    </Text>

                    <View
                      style={
                        styles.values
                      }
                    >
                      <Text
                        style={
                          styles.value
                        }
                      >
                        Actual RMA:{" "}
                        {Number(
                          row.actualRmaReplacement ||
                            0,
                        )}
                      </Text>

                      <Text
                        style={
                          styles.value
                        }
                      >
                        Queries:{" "}
                        {Number(
                          row.googleDriveRmaCases ||
                            0,
                        )}
                      </Text>
                    </View>
                  </Pressable>
                ),
              )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={
          Boolean(
            selected,
          )
        }
        transparent
        animationType="slide"
        onRequestClose={() =>
          setSelected(
            null,
          )
        }
      >
        <Pressable
          style={
            styles.backdrop
          }
          onPress={() =>
            setSelected(
              null,
            )
          }
        />

        <View
          style={
            styles.sheet
          }
        >
          <ScrollView
            contentContainerStyle={
              styles.sheetContent
            }
          >
            <View
              style={
                styles.handle
              }
            />

            <Text
              style={
                styles.sheetTitle
              }
            >
              {selected?.product ||
                "Rush RMA"}
            </Text>

            {[
              [
                "Region",
                selected?.region,
              ],
              [
                "Month",
                selected?.month,
              ],
              [
                "Description",
                selected?.description,
              ],
              [
                "Actual RMA Replacement",
                selected?.actualRmaReplacement,
              ],
              [
                "D Stock Units Received",
                selected?.dStockUnitsReceived,
              ],
              [
                "A-Stock Sent Out",
                selected?.aStockSentOut,
              ],
              [
                "RMA Units Sent Out",
                selected?.rmaUnitsSentOut,
              ],
              [
                "B-Stock Sent Out",
                selected?.bStockSentOut,
              ],
              [
                "D - Stock",
                selected?.dStock,
              ],
              [
                "B - Stock",
                selected?.bStock,
              ],
              [
                "A - Stock",
                selected?.aStock,
              ],
              [
                "Pending to Ship",
                selected?.pendingToShip,
              ],
              [
                "Pending to Receive",
                selected?.pendingToReceive,
              ],
              [
                "Total Queries",
                selected?.googleDriveRmaCases,
              ],
            ].map(
              (
                [
                  label,
                  value,
                ],
              ) => (
                <View
                  key={label}
                  style={
                    styles.detail
                  }
                >
                  <Text
                    style={
                      styles.detailKey
                    }
                  >
                    {
                      label
                    }
                  </Text>

                  <Text
                    style={
                      styles.detailValue
                    }
                  >
                    {String(
                      value ??
                        "-",
                    )}
                  </Text>
                </View>
              ),
            )}

            <Pressable
              style={
                styles.close
              }
              onPress={() =>
                setSelected(
                  null,
                )
              }
            >
              <Text
                style={
                  styles.closeText
                }
              >
                Close
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


export default function RushRmaScreen() {
  return (
    <PermissionGuard
      module="rushRma"
      title="Rush RMA"
    >
      <RushRmaScreenContent />
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
      paddingBottom: 34,
      gap: 14,
    },
    header: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      gap: 12,
    },
    back: {
      width: 42,
      height: 42,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      alignItems: "center",
      justifyContent:
        "center",
    },
    eyebrow: {
      color:
        colors.primary,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.5,
    },
    title: {
      color: colors.text,
      fontSize: 27,
      fontWeight: "900",
      marginTop: 4,
    },
    synced: {
      color:
        colors.textDim,
      fontSize: 10,
      marginTop: 5,
    },
    sync: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor:
        colors.primary,
      alignItems: "center",
      justifyContent:
        "center",
    },
    tabs: {
      gap: 8,
      paddingRight: 8,
    },
    chip: {
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 99,
      paddingHorizontal: 14,
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
      fontWeight: "900",
    },
    chipTextActive: {
      color:
        colors.primary,
    },
    search: {
      height: 48,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 15,
      backgroundColor:
        colors.surface,
      color: colors.text,
      paddingHorizontal: 15,
      fontSize: 13,
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
    sectionHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginTop: 4,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 14,
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
    card: {
      borderWidth: 1,
      borderColor:
        colors.borderSoft,
      borderRadius: 20,
      backgroundColor:
        colors.surface,
      padding: 15,
    },
    cardTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      gap: 10,
    },
    cardProduct: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      fontWeight: "900",
    },
    regionBadge: {
      borderWidth: 1,
      borderRadius: 99,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    regionText: {
      fontSize: 9,
      fontWeight: "900",
    },
    cardMeta: {
      marginTop: 8,
      color:
        colors.primary,
      fontSize: 10,
      fontWeight: "900",
    },
    description: {
      marginTop: 9,
      color:
        colors.textMuted,
      fontSize: 11,
      lineHeight: 17,
    },
    values: {
      marginTop: 11,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    value: {
      color:
        colors.textDim,
      fontSize: 10,
      fontWeight: "800",
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor:
        "rgba(0,0,0,.76)",
    },
    sheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      maxHeight: "88%",
      backgroundColor:
        colors.surfaceRaised,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderColor:
        colors.border,
    },
    sheetContent: {
      padding: 20,
      paddingBottom: 30,
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
      color: colors.text,
      fontSize: 21,
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
  });
