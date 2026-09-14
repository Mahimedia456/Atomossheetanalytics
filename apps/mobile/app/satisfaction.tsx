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
  analyzeSatisfactionResponse,
  fetchSatisfactionReport,
  SatisfactionAiResult,
  SatisfactionReport,
  SatisfactionRow,
  syncSatisfaction,
} from "@/services/satisfactionApi";
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

function getTicketId(
  row: SatisfactionRow,
) {
  return (
    row.ticketId ||
    row.ticket_id ||
    row.ticketNumber ||
    row.ticket_number ||
    "-"
  );
}

function getComment(
  row: SatisfactionRow,
) {
  return cleanText(
    row.comments ||
      row.comment ||
      row.feedback,
  );
}

function getCategory(
  row: SatisfactionRow,
) {
  return cleanText(
    row.category ||
      row.Category,
  );
}

function getDate(
  row: SatisfactionRow,
) {
  return cleanText(
    row.date ||
      row.date_display ||
      row.updatedDate ||
      row.updated_date,
  ) || "-";
}

function normalizeRating(
  value: unknown,
) {
  const rating =
    cleanText(
      value,
    ).toLowerCase();

  if (
    [
      "good",
      "positive",
      "satisfied",
      "very satisfied",
      "excellent",
      "4",
      "5",
    ].includes(rating)
  ) {
    return "Good";
  }

  if (
    [
      "bad",
      "negative",
      "dissatisfied",
      "unsatisfied",
      "poor",
      "1",
      "2",
    ].includes(rating)
  ) {
    return "Bad";
  }

  if (
    rating === "offered"
  ) {
    return "Offered";
  }

  return (
    cleanText(value) ||
    "Unknown"
  );
}

function RatingChip({
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

function RatingBadge({
  rating,
}: {
  rating: string;
}) {
  const isGood =
    rating === "Good";

  const isBad =
    rating === "Bad";

  return (
    <View
      style={[
        styles.ratingBadge,
        isGood &&
          styles.ratingGood,
        isBad &&
          styles.ratingBad,
      ]}
    >
      <Ionicons
        name={
          isGood
            ? "happy-outline"
            : isBad
              ? "sad-outline"
              : "ellipse-outline"
        }
        size={14}
        color={
          isGood
            ? "#34D399"
            : isBad
              ? "#F87171"
              : colors.textDim
        }
      />

      <Text
        style={[
          styles.ratingText,
          isGood && {
            color: "#34D399",
          },
          isBad && {
            color: "#F87171",
          },
        ]}
      >
        {rating}
      </Text>
    </View>
  );
}

function SatisfactionScreenContent() {
  const { syncVersion } = useDashboardSync();

  const [
    report,
    setReport,
  ] =
    useState<SatisfactionReport | null>(
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
    rating,
    setRating,
  ] =
    useState("");

  const [
    selected,
    setSelected,
  ] =
    useState<SatisfactionRow | null>(
      null,
    );

  const [
    aiResult,
    setAiResult,
  ] =
    useState<SatisfactionAiResult | null>(
      null,
    );

  const [
    aiLoading,
    setAiLoading,
  ] =
    useState(false);

  const [
    aiError,
    setAiError,
  ] =
    useState("");

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
            await fetchSatisfactionReport(
              {
                search,
                rating,
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
              "Unable to load Satisfaction report.",
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        search,
        rating,
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
        await syncSatisfaction();
        await load(false);
      } catch (
        syncError: any
      ) {
        setError(
          syncError?.response
            ?.data?.message ||
            syncError?.message ||
            "Satisfaction sync failed.",
        );
      } finally {
        setSyncing(false);
      }
    };

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
          ) =>
            String(
              getDate(second),
            ).localeCompare(
              String(
                getDate(first),
              ),
            ),
        ),
      [report?.rows],
    );

  const analytics =
    report?.analytics ||
    {};

  async function openSummary(
    row: SatisfactionRow,
  ) {
    setSelected(row);
    setAiResult(null);
    setAiError("");

    const comment =
      getComment(row);

    if (!comment) {
      return;
    }

    setAiLoading(true);

    try {
      const result =
        await analyzeSatisfactionResponse(
          {
            ticketId:
              String(
                getTicketId(row),
              ),
            rating:
              normalizeRating(
                row.rating,
              ),
            category:
              getCategory(row),
            comment,
          },
        );

      setAiResult(result);
    } catch (
      analysisError: any
    ) {
      setAiError(
        analysisError?.response
          ?.data?.message ||
          analysisError?.message ||
          "Unable to analyze this response.",
      );
    } finally {
      setAiLoading(false);
    }
  }

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
            style={
              styles.headingCopy
            }
          >
            <Text
              style={
                styles.eyebrow
              }
            >
              CUSTOMER FEEDBACK
            </Text>

            <Text
              style={
                styles.title
              }
            >
              Satisfaction
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
          placeholder="Search ticket, comment or category..."
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
          {[
            "",
            "Good",
            "Bad",
          ].map(
            (item) => (
              <RatingChip
                key={
                  item ||
                  "All"
                }
                label={
                  item ||
                  "All"
                }
                active={
                  rating ===
                  item
                }
                onPress={() =>
                  setRating(
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
                label="Responses"
                value={
                  analytics.totalResponses ||
                  0
                }
              />

              <MetricCard
                label="Good"
                value={
                  analytics.goodResponses ||
                  0
                }
                accent={
                  colors.success
                }
              />

              <MetricCard
                label="Bad"
                value={
                  analytics.badResponses ||
                  0
                }
                accent={
                  colors.danger
                }
              />
            </View>

            <HorizontalBarChart
              title="With Comments vs Without Comments"
              data={
                analytics.byCommentStatus ||
                []
              }
            />

            <HorizontalBarChart
              title="Satisfaction by Category"
              data={
                analytics.byCategory ||
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
                Responses
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
                ) => {
                  const currentRating =
                    normalizeRating(
                      row.rating,
                    );

                  const comment =
                    getComment(
                      row,
                    );

                  return (
                    <View
                      key={`${getTicketId(
                        row,
                      )}-${index}`}
                      style={
                        styles.responseCard
                      }
                    >
                      <View
                        style={
                          styles.responseTop
                        }
                      >
                        <Text
                          style={
                            styles.ticket
                          }
                        >
                          #
                          {
                            getTicketId(
                              row,
                            )
                          }
                        </Text>

                        <RatingBadge
                          rating={
                            currentRating
                          }
                        />
                      </View>

                      <View
                        style={
                          styles.metaRow
                        }
                      >
                        <Text
                          style={
                            styles.date
                          }
                        >
                          {
                            getDate(
                              row,
                            )
                          }
                        </Text>

                        <Text
                          style={
                            styles.category
                          }
                        >
                          {getCategory(
                            row,
                          ) ||
                            "Unknown"}
                        </Text>
                      </View>

                      <Text
                        numberOfLines={
                          4
                        }
                        style={[
                          styles.comment,
                          currentRating ===
                          "Bad"
                            ? styles.badComment
                            : styles.goodComment,
                        ]}
                      >
                        {comment ||
                          "No comment provided."}
                      </Text>

                      <Pressable
                        onPress={() =>
                          openSummary(
                            row,
                          )
                        }
                        disabled={
                          !comment
                        }
                        style={[
                          styles.summaryButton,
                          !comment &&
                            styles.summaryDisabled,
                        ]}
                      >
                        <Ionicons
                          name="sparkles-outline"
                          size={16}
                          color={
                            comment
                              ? "#000"
                              : colors.textDim
                          }
                        />

                        <Text
                          style={[
                            styles.summaryText,
                            !comment &&
                              styles.summaryDisabledText,
                          ]}
                        >
                          View Summary
                        </Text>
                      </Pressable>
                    </View>
                  );
                },
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
                styles.sheetEyebrow
              }
            >
              AI SATISFACTION ANALYSIS
            </Text>

            <Text
              style={
                styles.sheetTitle
              }
            >
              Ticket #
              {selected
                ? getTicketId(
                    selected,
                  )
                : "-"}
            </Text>

            <Text
              style={
                styles.originalComment
              }
            >
              {selected
                ? getComment(
                    selected,
                  ) ||
                  "No comment provided."
                : ""}
            </Text>

            {aiLoading ? (
              <View
                style={
                  styles.aiLoading
                }
              >
                <ActivityIndicator
                  color={
                    colors.primary
                  }
                />

                <Text
                  style={
                    styles.aiLoadingText
                  }
                >
                  Mahimedia AI is analyzing this response...
                </Text>
              </View>
            ) : null}

            {aiError ? (
              <Text
                style={
                  styles.error
                }
              >
                {aiError}
              </Text>
            ) : null}

            {aiResult ? (
              <View
                style={
                  styles.aiResult
                }
              >
                <View
                  style={
                    styles.aiBadges
                  }
                >
                  <View
                    style={
                      styles.aiBadge
                    }
                  >
                    <Text
                      style={
                        styles.aiBadgeText
                      }
                    >
                      {aiResult.sentiment ||
                        "Unknown"}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.aiBadge
                    }
                  >
                    <Text
                      style={
                        styles.aiBadgeText
                      }
                    >
                      {aiResult.team ||
                        "Unassigned"}
                    </Text>
                  </View>
                </View>

                <Text
                  style={
                    styles.aiLabel
                  }
                >
                  SUMMARY
                </Text>

                <Text
                  style={
                    styles.aiCopy
                  }
                >
                  {aiResult.summary ||
                    "-"}
                </Text>

                <Text
                  style={
                    styles.aiLabel
                  }
                >
                  RECOMMENDED ACTION
                </Text>

                <Text
                  style={
                    styles.aiCopy
                  }
                >
                  {aiResult.recommendedAction ||
                    "-"}
                </Text>
              </View>
            ) : null}

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


export default function SatisfactionScreen() {
  return (
    <PermissionGuard
      module="satisfaction"
      title="Satisfaction"
    >
      <SatisfactionScreenContent />
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
    headingCopy: {
      flex: 1,
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
      paddingRight: 10,
    },
    chip: {
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 99,
      paddingHorizontal: 15,
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
      letterSpacing: 1.1,
      textTransform:
        "uppercase",
    },
    count: {
      color:
        colors.textDim,
      fontSize: 10,
      fontWeight: "800",
    },
    responseCard: {
      borderWidth: 1,
      borderColor:
        colors.borderSoft,
      borderRadius: 20,
      backgroundColor:
        colors.surface,
      padding: 15,
    },
    responseTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      gap: 12,
    },
    ticket: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "900",
    },
    ratingBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 99,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor:
        colors.surfaceRaised,
    },
    ratingGood: {
      borderColor:
        "rgba(34,197,94,.35)",
      backgroundColor:
        "rgba(34,197,94,.10)",
    },
    ratingBad: {
      borderColor:
        "rgba(239,68,68,.35)",
      backgroundColor:
        "rgba(239,68,68,.10)",
    },
    ratingText: {
      color:
        colors.textDim,
      fontSize: 9,
      fontWeight: "900",
    },
    metaRow: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      gap: 12,
    },
    date: {
      color:
        colors.textMuted,
      fontSize: 10,
      fontWeight: "800",
    },
    category: {
      color:
        colors.textDim,
      fontSize: 10,
      fontWeight: "800",
    },
    comment: {
      marginTop: 12,
      fontSize: 12,
      lineHeight: 19,
      fontWeight: "700",
    },
    goodComment: {
      color:
        colors.primary,
    },
    badComment: {
      color: "#F87171",
    },
    summaryButton: {
      alignSelf:
        "flex-start",
      marginTop: 13,
      minHeight: 40,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 7,
      borderRadius: 12,
      backgroundColor:
        colors.primary,
      paddingHorizontal: 13,
    },
    summaryDisabled: {
      backgroundColor:
        colors.borderSoft,
    },
    summaryText: {
      color: "#000",
      fontSize: 10,
      fontWeight: "900",
    },
    summaryDisabledText: {
      color:
        colors.textDim,
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
      marginBottom: 20,
    },
    sheetEyebrow: {
      color:
        colors.primary,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.4,
    },
    sheetTitle: {
      color:
        colors.text,
      fontSize: 22,
      fontWeight: "900",
      marginTop: 6,
    },
    originalComment: {
      color:
        colors.textMuted,
      fontSize: 12,
      lineHeight: 19,
      marginTop: 13,
      borderWidth: 1,
      borderColor:
        colors.borderSoft,
      borderRadius: 16,
      padding: 13,
      backgroundColor:
        colors.surface,
    },
    aiLoading: {
      minHeight: 120,
      alignItems: "center",
      justifyContent:
        "center",
      gap: 12,
      marginTop: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        "rgba(0,220,197,.25)",
      backgroundColor:
        colors.primarySoft,
    },
    aiLoadingText: {
      color:
        colors.primary,
      fontSize: 11,
      fontWeight: "800",
    },
    aiResult: {
      marginTop: 14,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 18,
      padding: 15,
      backgroundColor:
        colors.surface,
    },
    aiBadges: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    aiBadge: {
      borderWidth: 1,
      borderColor:
        "rgba(0,220,197,.25)",
      borderRadius: 99,
      backgroundColor:
        colors.primarySoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    aiBadgeText: {
      color:
        colors.primary,
      fontSize: 9,
      fontWeight: "900",
    },
    aiLabel: {
      color:
        colors.textDim,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.2,
      marginTop: 16,
    },
    aiCopy: {
      color:
        colors.text,
      fontSize: 12,
      lineHeight: 19,
      fontWeight: "700",
      marginTop: 6,
    },
    close: {
      marginTop: 18,
      minHeight: 46,
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
