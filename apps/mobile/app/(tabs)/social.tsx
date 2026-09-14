import { Ionicons } from "@expo/vector-icons";
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
  fetchSocialReport,
  SocialReport,
  SocialRow,
  syncSocial,
} from "@/services/socialApi";
import { colors } from "@/theme/colors";
import { useDashboardSync } from "@/context/DashboardSyncContext";
import PermissionGuard from "@/components/PermissionGuard";
import CacheNotice from "@/components/CacheNotice";

function cleanText(
  value: unknown,
) {
  return String(
    value ?? "",
  ).trim();
}

function normalizeSentiment(
  value?: string,
) {
  const normalized =
    String(
      value || "",
    )
      .trim()
      .toLowerCase();

  if (
    normalized === "positive"
  ) {
    return "Positive";
  }

  if (
    normalized === "negative"
  ) {
    return "Negative";
  }

  if (
    normalized === "neutral"
  ) {
    return "Neutral";
  }

  return (
    cleanText(value) ||
    "Unknown"
  );
}

function sentimentColor(
  value?: string,
) {
  const sentiment =
    normalizeSentiment(
      value,
    );

  if (
    sentiment === "Positive"
  ) {
    return colors.success;
  }

  if (
    sentiment === "Negative"
  ) {
    return colors.danger;
  }

  if (
    sentiment === "Neutral"
  ) {
    return colors.warning;
  }

  return colors.textDim;
}

function platformColor(
  value?: string,
) {
  const platform =
    String(
      value || "",
    ).toLowerCase();

  if (
    platform.includes(
      "facebook",
    )
  ) {
    return "#1877F2";
  }

  if (
    platform.includes(
      "instagram",
    )
  ) {
    return "#E1306C";
  }

  if (
    platform.includes(
      "reddit",
    )
  ) {
    return "#FF4500";
  }

  if (
    platform.includes(
      "youtube",
    )
  ) {
    return "#FF0000";
  }

  if (
    platform.includes(
      "messenger",
    )
  ) {
    return "#38BDF8";
  }

  return colors.primary;
}

function platformIcon(
  value?: string,
):
  keyof typeof Ionicons.glyphMap {
  const platform =
    String(
      value || "",
    ).toLowerCase();

  if (
    platform.includes(
      "youtube",
    )
  ) {
    return "logo-youtube";
  }

  if (
    platform.includes(
      "instagram",
    )
  ) {
    return "logo-instagram";
  }

  if (
    platform.includes(
      "facebook",
    )
  ) {
    return "logo-facebook";
  }

  if (
    platform.includes(
      "reddit",
    )
  ) {
    return "logo-reddit";
  }

  return "chatbubble-ellipses-outline";
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

function SocialScreenContent() {
  const { syncVersion } = useDashboardSync();

  const [
    report,
    setReport,
  ] =
    useState<SocialReport | null>(
      null,
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    platform,
    setPlatform,
  ] =
    useState("");

  const [
    sentiment,
    setSentiment,
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
    useState<SocialRow | null>(
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
            await fetchSocialReport(
              {
                search,
                socialPlatform:
                  platform,
                platform,
                customerResponse:
                  sentiment,
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
              "Unable to load Social Analytics.",
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        search,
        platform,
        sentiment,
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
      await syncSocial();
      await load(false);
    } catch (
      syncError: any
    ) {
      setError(
        syncError?.response
          ?.data?.message ||
          syncError?.message ||
          "Social sync failed.",
      );
    } finally {
      setSyncing(false);
    }
  }

  const analytics =
    report?.analytics ||
    {};

  const rows =
    useMemo(
      () =>
        [
          ...(report?.rows ||
            []),
        ].sort(
          (
            first,
            second,
          ) => {
            const dateDiff =
              String(
                second.postQueryDate ||
                  "",
              ).localeCompare(
                String(
                  first.postQueryDate ||
                    "",
                ),
              );

            if (
              dateDiff !==
              0
            ) {
              return dateDiff;
            }

            return (
              Number(
                second.sheetRowNumber ||
                  0,
              ) -
              Number(
                first.sheetRowNumber ||
                  0,
              )
            );
          },
        ),
      [report?.rows],
    );

  const platforms =
    report?.filters?.platforms ||
    [];

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
              SOCIAL REPORTING
            </Text>

            <Text
              style={
                styles.title
              }
            >
              Social Analytics
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

        <TextInput
          value={search}
          onChangeText={
            setSearch
          }
          placeholder="Search query, response, product or category..."
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
            label="All platforms"
            active={!platform}
            onPress={() =>
              setPlatform("")
            }
          />

          {platforms.map(
            (item) => (
              <Chip
                key={item}
                label={item}
                active={
                  platform ===
                  item
                }
                onPress={() =>
                  setPlatform(
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
            styles.chips
          }
        >
          {[
            "",
            "Positive",
            "Neutral",
            "Negative",
          ].map(
            (item) => (
              <Chip
                key={
                  item ||
                  "All"
                }
                label={
                  item ||
                  "All sentiments"
                }
                active={
                  sentiment ===
                  item
                }
                onPress={() =>
                  setSentiment(
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
                label="Total Queries"
                value={
                  analytics.totalQueries ||
                  0
                }
              />

              <MetricCard
                label="Products"
                value={
                  analytics.productCount ||
                  0
                }
                accent={
                  colors.info
                }
              />

              <MetricCard
                label="Categories"
                value={
                  analytics.categoryCount ||
                  0
                }
                accent={
                  colors.warning
                }
              />

              <MetricCard
                label="Countries"
                value={
                  analytics.countries ||
                  0
                }
                accent={
                  colors.success
                }
              />
            </View>

            <HorizontalBarChart
              title="Product-wise Social Queries"
              data={
                analytics.byProduct ||
                []
              }
            />

            <HorizontalBarChart
              title="Category-wise Social Queries"
              data={
                analytics.byCategory ||
                []
              }
            />

            <HorizontalBarChart
              title="Social Platform-wise Queries"
              data={
                analytics.byPlatform ||
                []
              }
            />

            <HorizontalBarChart
              title="Customer Sentiments"
              data={
                analytics.byCustomerResponse ||
                []
              }
            />

            <View
              style={
                styles.platformBreakdown
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Social Platform Breakdown
              </Text>

              {(analytics.byPlatform ||
                []).map(
                (
                  item,
                  index,
                ) => (
                  <View
                    key={`${item.name}-${index}`}
                    style={
                      styles.platformRow
                    }
                  >
                    <View
                      style={[
                        styles.platformIcon,
                        {
                          borderColor:
                            platformColor(
                              item.name,
                            ),
                          backgroundColor:
                            `${platformColor(
                              item.name,
                            )}14`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          platformIcon(
                            item.name,
                          )
                        }
                        size={18}
                        color={
                          platformColor(
                            item.name,
                          )
                        }
                      />
                    </View>

                    <Text
                      style={
                        styles.platformName
                      }
                    >
                      {
                        item.name
                      }
                    </Text>

                    <Text
                      style={
                        styles.platformValue
                      }
                    >
                      {
                        item.value
                      }
                    </Text>
                  </View>
                ),
              )}
            </View>

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
                Social Report Data
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
                    key={`${row.id || row.postQueryDate || index}`}
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
                      <View
                        style={
                          styles.platformTitle
                        }
                      >
                        <View
                          style={[
                            styles.platformIcon,
                            {
                              borderColor:
                                platformColor(
                                  row.socialPlatform,
                                ),
                              backgroundColor:
                                `${platformColor(
                                  row.socialPlatform,
                                )}14`,
                            },
                          ]}
                        >
                          <Ionicons
                            name={
                              platformIcon(
                                row.socialPlatform,
                              )
                            }
                            size={18}
                            color={
                              platformColor(
                                row.socialPlatform,
                              )
                            }
                          />
                        </View>

                        <View
                          style={{
                            flex: 1,
                          }}
                        >
                          <Text
                            style={
                              styles.cardPlatform
                            }
                          >
                            {row.socialPlatform ||
                              "Unknown"}
                          </Text>

                          <Text
                            style={
                              styles.date
                            }
                          >
                            {row.postQueryDate ||
                              "-"}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.sentimentBadge,
                          {
                            borderColor:
                              sentimentColor(
                                row.customerResponse,
                              ),
                            backgroundColor:
                              `${sentimentColor(
                                row.customerResponse,
                              )}14`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.sentimentText,
                            {
                              color:
                                sentimentColor(
                                  row.customerResponse,
                                ),
                            },
                          ]}
                        >
                          {normalizeSentiment(
                            row.customerResponse,
                          )}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={
                        styles.product
                      }
                    >
                      {row.product ||
                        "Unknown Product"}
                    </Text>

                    <Text
                      numberOfLines={
                        4
                      }
                      style={
                        styles.query
                      }
                    >
                      {row.postQuery ||
                        "No query"}
                    </Text>

                    <Text
                      numberOfLines={
                        4
                      }
                      style={
                        styles.response
                      }
                    >
                      {row.response ||
                        "No response"}
                    </Text>

                    <Text
                      style={
                        styles.category
                      }
                    >
                      {row.category ||
                        "Uncategorized"}
                    </Text>
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
              {selected?.socialPlatform ||
                "Social Record"}
            </Text>

            {[
              [
                "Date",
                selected?.postQueryDate,
              ],
              [
                "Country",
                selected?.country,
              ],
              [
                "Product",
                selected?.product,
              ],
              [
                "Category",
                selected?.category,
              ],
              [
                "Customer Sentiments",
                selected?.customerResponse,
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
                      value ||
                        "-",
                    )}
                  </Text>
                </View>
              ),
            )}

            <Text
              style={
                styles.detailKey
              }
            >
              POST / QUERY
            </Text>

            <Text
              style={
                styles.queryLarge
              }
            >
              {selected?.postQuery ||
                "-"}
            </Text>

            <Text
              style={[
                styles.detailKey,
                {
                  marginTop: 18,
                },
              ]}
            >
              RESPONSE
            </Text>

            <Text
              style={
                styles.responseLarge
              }
            >
              {selected?.response ||
                "-"}
            </Text>

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


export default function SocialScreen() {
  return (
    <PermissionGuard
      module="social"
      title="Social Analytics"
    >
      <SocialScreenContent />
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
    chips: {
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
    platformBreakdown: {
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 20,
      backgroundColor:
        colors.surface,
      padding: 15,
      gap: 11,
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
      fontSize: 13,
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
    platformRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    platformIcon: {
      width: 38,
      height: 38,
      borderRadius: 13,
      borderWidth: 1,
      alignItems: "center",
      justifyContent:
        "center",
    },
    platformName: {
      flex: 1,
      color:
        colors.textMuted,
      fontSize: 11,
      fontWeight: "800",
    },
    platformValue: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "900",
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
      alignItems:
        "flex-start",
      justifyContent:
        "space-between",
      gap: 10,
    },
    platformTitle: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    cardPlatform: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "900",
    },
    date: {
      color:
        colors.textDim,
      fontSize: 9,
      fontWeight: "700",
      marginTop: 3,
    },
    sentimentBadge: {
      borderWidth: 1,
      borderRadius: 99,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    sentimentText: {
      fontSize: 8,
      fontWeight: "900",
    },
    product: {
      color:
        colors.textMuted,
      fontSize: 10,
      fontWeight: "800",
      marginTop: 12,
    },
    query: {
      color:
        colors.warning,
      fontSize: 11,
      lineHeight: 18,
      fontWeight: "700",
      marginTop: 10,
    },
    response: {
      color:
        colors.primary,
      fontSize: 11,
      lineHeight: 18,
      fontWeight: "700",
      marginTop: 10,
    },
    category: {
      color:
        colors.textDim,
      fontSize: 9,
      fontWeight: "800",
      marginTop: 10,
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
    queryLarge: {
      color:
        colors.warning,
      fontSize: 13,
      lineHeight: 21,
      fontWeight: "700",
      marginTop: 8,
    },
    responseLarge: {
      color:
        colors.primary,
      fontSize: 13,
      lineHeight: 21,
      fontWeight: "700",
      marginTop: 8,
    },
    close: {
      marginTop: 18,
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
