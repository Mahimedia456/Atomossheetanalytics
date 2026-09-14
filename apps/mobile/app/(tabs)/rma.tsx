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
import Svg, {
  Circle,
} from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import HorizontalBarChart from "@/components/HorizontalBarChart";
import MetricCard from "@/components/MetricCard";
import {
  fetchGlobalRmaReport,
  GlobalRmaReport,
  GlobalRmaRow,
  syncGlobalRma,
  YearCategoryRow,
} from "@/services/globalRmaApi";
import { colors } from "@/theme/colors";
import { useDashboardSync } from "@/context/DashboardSyncContext";
import PermissionGuard from "@/components/PermissionGuard";
import CacheNotice from "@/components/CacheNotice";

const donutColors = [
  "#00DCC5",
  "#38BDF8",
  "#22C55E",
  "#F59E0B",
  "#F97316",
  "#A855F7",
  "#EF4444",
  "#14B8A6",
];

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

function regionAccent(
  value?: string,
) {
  const normalized =
    String(
      value || "",
    ).toUpperCase();

  if (
    normalized === "USA"
  ) {
    return colors.success;
  }

  if (
    normalized === "EMEA"
  ) {
    return colors.primary;
  }

  return colors.info;
}

function Donut({
  data,
  total,
}: {
  data: Array<{
    name: string;
    value: number;
  }>;
  total: number;
}) {
  const size = 148;
  const stroke = 18;
  const radius =
    (size - stroke) / 2;
  const circumference =
    2 *
    Math.PI *
    radius;

  let offset = 0;

  return (
    <View
      style={
        styles.donutWrap
      }
    >
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={
            colors.borderSoft
          }
          strokeWidth={
            stroke
          }
          fill="none"
        />

        {data.map(
          (
            item,
            index,
          ) => {
            const fraction =
              total > 0
                ? item.value /
                  total
                : 0;

            const length =
              circumference *
              fraction;

            const currentOffset =
              offset;

            offset += length;

            return (
              <Circle
                key={`${item.name}-${index}`}
                cx={
                  size / 2
                }
                cy={
                  size / 2
                }
                r={
                  radius
                }
                stroke={
                  donutColors[
                    index %
                      donutColors.length
                  ]
                }
                strokeWidth={
                  stroke
                }
                strokeLinecap="butt"
                fill="none"
                strokeDasharray={`${length} ${
                  circumference -
                  length
                }`}
                strokeDashoffset={
                  -currentOffset
                }
                rotation="-90"
                origin={`${size / 2}, ${size / 2}`}
              />
            );
          },
        )}
      </Svg>

      <View
        style={
          styles.donutCenter
        }
      >
        <Text
          style={
            styles.donutTotal
          }
        >
          {total}
        </Text>

        <Text
          style={
            styles.donutCaption
          }
        >
          RMA
        </Text>
      </View>
    </View>
  );
}

function YearCategoryCard({
  year,
  rows,
}: {
  year: string;
  rows: YearCategoryRow[];
}) {
  const data =
    useMemo(
      () =>
        rows
          .filter(
            (item) =>
              String(
                item.year,
              ) ===
              String(year),
          )
          .map(
            (item) => ({
              name:
                item.category ||
                "Uncategorized",
              value:
                Number(
                  item.value ||
                    0,
                ),
            }),
          )
          .filter(
            (item) =>
              item.value >
              0,
          )
          .sort(
            (a, b) =>
              b.value -
              a.value,
          ),
      [
        rows,
        year,
      ],
    );

  const total =
    data.reduce(
      (
        sum,
        item,
      ) =>
        sum +
        item.value,
      0,
    );

  return (
    <View
      style={
        styles.yearCard
      }
    >
      <Text
        style={
          styles.yearTitle
        }
      >
        {year}
      </Text>

      <Donut
        data={data}
        total={total}
      />

      <View
        style={
          styles.legend
        }
      >
        {data
          .slice(
            0,
            8,
          )
          .map(
            (
              item,
              index,
            ) => (
              <View
                key={`${item.name}-${index}`}
                style={
                  styles.legendRow
                }
              >
                <View
                  style={[
                    styles.legendDot,
                    {
                      backgroundColor:
                        donutColors[
                          index %
                            donutColors.length
                        ],
                    },
                  ]}
                />

                <Text
                  numberOfLines={
                    1
                  }
                  style={
                    styles.legendName
                  }
                >
                  {
                    item.name
                  }
                </Text>

                <Text
                  style={
                    styles.legendValue
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
    </View>
  );
}

function GlobalRmaScreenContent() {
  const { syncVersion } = useDashboardSync();

  const [
    report,
    setReport,
  ] =
    useState<GlobalRmaReport | null>(
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
    year,
    setYear,
  ] =
    useState("");

  const [
    selected,
    setSelected,
  ] =
    useState<GlobalRmaRow | null>(
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
            await fetchGlobalRmaReport(
              {
                search,
                region,
                year,
                limit: 20000,
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
              "Unable to load Global RMA report.",
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        search,
        region,
        year,
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

  const doSync =
    async () => {
      setSyncing(true);
      setError("");

      try {
        await syncGlobalRma();
        await load(false);
      } catch (
        syncError: any
      ) {
        setError(
          syncError?.response
            ?.data?.message ||
            syncError?.message ||
            "Global RMA sync failed.",
        );
      } finally {
        setSyncing(false);
      }
    };

  const analytics =
    report?.analytics ||
    {};

  const rows =
    report?.rows ||
    [];

  const regions =
    report?.filters?.regions ||
    [];

  const years =
    report?.filters?.years ||
    [];

  const yearRows =
    analytics.yearCategoryWiseRma ||
    [];

  const visibleYears =
    useMemo(
      () =>
        (
          year
            ? [year]
            : Array.from(
                new Set(
                  yearRows.map(
                    (
                      item,
                    ) =>
                      String(
                        item.year,
                      ),
                  ),
                ),
              )
        )
          .filter(
            Boolean,
          )
          .sort(
            (
              first,
              second,
            ) =>
              Number(
                second,
              ) -
              Number(
                first,
              ),
          ),
      [
        year,
        yearRows,
      ],
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
              USA + EMEA ANALYTICS
            </Text>

            <Text
              style={
                styles.title
              }
            >
              Global RMA
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
          placeholder="Search RMA, product, serial, customer..."
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
            label="All years"
            active={!year}
            onPress={() =>
              setYear("")
            }
          />

          {years.map(
            (item) => (
              <Chip
                key={item}
                label={item}
                active={
                  year ===
                  item
                }
                onPress={() =>
                  setYear(
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
                label="Total Global RMA"
                value={
                  analytics.totalRma ||
                  0
                }
              />

              <MetricCard
                label="USA RMA"
                value={
                  analytics.totalUsa ||
                  0
                }
                accent={
                  colors.success
                }
              />

              <MetricCard
                label="EMEA RMA"
                value={
                  analytics.totalEmea ||
                  0
                }
                accent={
                  colors.primary
                }
              />

              <MetricCard
                label="Replaced"
                value={
                  analytics.totalReplaced ||
                  0
                }
                accent={
                  colors.info
                }
              />

              <MetricCard
                label="Repaired"
                value={
                  analytics.totalRepaired ||
                  0
                }
                accent={
                  colors.warning
                }
              />

              <MetricCard
                label="D Stock Received"
                value={
                  analytics.totalDStockReceived ||
                  0
                }
              />
            </View>

            <HorizontalBarChart
              title="USA / EMEA RMA Distribution"
              data={
                analytics.byRegion ||
                []
              }
            />

            <HorizontalBarChart
              title="RMA by Status"
              data={
                analytics.byRmaStatus ||
                []
              }
            />

            <HorizontalBarChart
              title="Action Taken"
              data={
                analytics.byActionTaken ||
                []
              }
            />

            <HorizontalBarChart
              title="RMA by Customer Channel"
              data={
                analytics.byAccountType ||
                analytics.byCustomerType ||
                []
              }
            />

            <HorizontalBarChart
              title="Product Trend — High / Low"
              data={
                analytics.productNameTrend ||
                []
              }
            />

            <HorizontalBarChart
              title="Fault Category Trend — High / Low"
              data={
                analytics.faultCategoryTrend ||
                []
              }
            />

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
                Year & Category
              </Text>

              <Text
                style={
                  styles.count
                }
              >
                {
                  visibleYears.length
                }{" "}
                years
              </Text>
            </View>

            {visibleYears.map(
              (
                item,
              ) => (
                <YearCategoryCard
                  key={
                    item
                  }
                  year={
                    item
                  }
                  rows={
                    yearRows
                  }
                />
              ),
            )}

            <HorizontalBarChart
              title="Stock Received vs Stock Sent"
              data={
                analytics.stockMovementSummary ||
                []
              }
            />

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
                Global RMA Records
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
                150,
              )
              .map(
                (
                  row,
                  index,
                ) => (
                  <Pressable
                    key={`${row.id || row.rmaNumber || index}`}
                    onPress={() =>
                      setSelected(
                        row,
                      )
                    }
                    style={
                      styles.rmaCard
                    }
                  >
                    <View
                      style={
                        styles.rmaTop
                      }
                    >
                      <Text
                        style={
                          styles.rmaNumber
                        }
                      >
                        RMA{" "}
                        {row.rmaNumber ||
                          "-"}
                      </Text>

                      <View
                        style={[
                          styles.regionBadge,
                          {
                            borderColor:
                              regionAccent(
                                row.region,
                              ),
                            backgroundColor:
                              `${regionAccent(
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
                                regionAccent(
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
                      numberOfLines={
                        2
                      }
                      style={
                        styles.product
                      }
                    >
                      {row.productName ||
                        row.deviceName ||
                        row.product ||
                        "Unknown Product"}
                    </Text>

                    <View
                      style={
                        styles.dateRow
                      }
                    >
                      <Text
                        style={
                          styles.date
                        }
                      >
                        Date:{" "}
                        {row.entryDate ||
                          "-"}
                      </Text>

                      <Text
                        style={
                          styles.date
                        }
                      >
                        Processed:{" "}
                        {row.processedDate ||
                          "-"}
                      </Text>
                    </View>

                    <Text
                      numberOfLines={
                        2
                      }
                      style={
                        styles.fault
                      }
                    >
                      {row.faultCategory ||
                        row.faultDescription ||
                        "No fault category"}
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
              RMA{" "}
              {selected?.rmaNumber ||
                "-"}
            </Text>

            {[
              [
                "Region",
                selected?.region,
              ],
              [
                "Date",
                selected?.entryDate,
              ],
              [
                "Processed Date",
                selected?.processedDate,
              ],
              [
                "Product",
                selected?.productName,
              ],
              [
                "Product SKU",
                selected?.productSku,
              ],
              [
                "Faulty Serial Number",
                selected?.serialNumber,
              ],
              [
                "RMA Type",
                selected?.rmaType,
              ],
              [
                "Stock Type",
                selected?.stockType,
              ],
              [
                "Fault Category",
                selected?.faultCategory,
              ],
              [
                "Return Reason",
                selected?.faultDescription,
              ],
              [
                "Action Taken",
                selected?.actionTaken,
              ],
              [
                "RMA Status",
                selected?.rmaStatus,
              ],
              [
                "Customer Channel",
                selected?.customerType,
              ],
              [
                "Company",
                selected?.companyName,
              ],
              [
                "Tracking Number",
                selected?.trackingNumber,
              ],
              [
                "Replacement Order",
                selected?.replacementOrderNumber,
              ],
              [
                "RO Notes",
                selected?.roNotes,
              ],
              [
                "Customer Return Tracking",
                selected?.customerReturnTrackingNumber,
              ],
            ].map(
              (
                [
                  label,
                  value,
                ],
              ) => (
                <View
                  key={
                    label
                  }
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


export default function GlobalRmaScreen() {
  return (
    <PermissionGuard
      module="globalRma"
      title="Global RMA"
    >
      <GlobalRmaScreenContent />
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
      color: colors.text,
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
      color: colors.text,
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
    sectionHead: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
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
    yearCard: {
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 22,
      backgroundColor:
        colors.surface,
      padding: 16,
    },
    yearTitle: {
      color:
        colors.primary,
      fontSize: 17,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 10,
    },
    donutWrap: {
      width: 148,
      height: 148,
      alignSelf: "center",
      alignItems: "center",
      justifyContent:
        "center",
    },
    donutCenter: {
      position:
        "absolute",
      alignItems: "center",
    },
    donutTotal: {
      color: colors.text,
      fontSize: 23,
      fontWeight: "900",
    },
    donutCaption: {
      color:
        colors.textDim,
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1,
    },
    legend: {
      marginTop: 14,
      gap: 8,
    },
    legendRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 99,
    },
    legendName: {
      flex: 1,
      color:
        colors.textMuted,
      fontSize: 10,
      fontWeight: "700",
    },
    legendValue: {
      color:
        colors.text,
      fontSize: 10,
      fontWeight: "900",
    },
    rmaCard: {
      borderWidth: 1,
      borderColor:
        colors.borderSoft,
      borderRadius: 19,
      backgroundColor:
        colors.surface,
      padding: 14,
    },
    rmaTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      gap: 10,
    },
    rmaNumber: {
      color: colors.text,
      fontSize: 13,
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
    product: {
      color:
        colors.primary,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: "800",
      marginTop: 10,
    },
    dateRow: {
      marginTop: 10,
      gap: 4,
    },
    date: {
      color:
        colors.textMuted,
      fontSize: 10,
      fontWeight: "700",
    },
    fault: {
      marginTop: 10,
      color:
        colors.textDim,
      fontSize: 11,
      lineHeight: 17,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor:
        "rgba(0,0,0,.75)",
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
