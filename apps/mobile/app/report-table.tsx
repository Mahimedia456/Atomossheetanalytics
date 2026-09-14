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

type ReportType =
  | "tickets"
  | "satisfaction"
  | "global-rma"
  | "rush-rma"
  | "social";

type AnyRow = Record<string, any>;

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function firstValue(row: AnyRow, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && cleanText(value)) {
      return value;
    }
  }
  return "";
}

function normalizeRating(value: unknown) {
  const rating = cleanText(value).toLowerCase();
  if (rating.includes("bad")) return "Bad";
  if (rating.includes("good")) return "Good";
  return cleanText(value) || "Unknown";
}

function getTicketId(row: AnyRow) {
  return (
    cleanText(
      firstValue(row, [
        "ticketId",
        "ticket_id",
        "ticketNumber",
        "ticket_number",
      ]),
    ) || "-"
  );
}

function getComment(row: AnyRow) {
  return cleanText(
    firstValue(row, [
      "comments",
      "comment",
      "feedback",
      "Comment",
    ]),
  );
}

function getCategory(row: AnyRow) {
  return cleanText(
    firstValue(row, [
      "category",
      "Category",
      "subject",
    ]),
  );
}

function getDate(row: AnyRow) {
  return (
    cleanText(
      firstValue(row, [
        "date",
        "date_display",
        "updatedDate",
        "updated_date",
      ]),
    ) || "-"
  );
}

function regionColor(region: unknown) {
  const value = cleanText(region).toUpperCase();

  if (value.includes("EMEA")) {
    return "#38BDF8";
  }

  if (
    value === "US" ||
    value === "USA" ||
    value.includes("US RMA")
  ) {
    return "#F59E0B";
  }

  if (
    value === "NA" ||
    value === "UAE"
  ) {
    return colors.primary;
  }

  return colors.textMuted;
}

function sentimentColor(value: unknown) {
  const sentiment = cleanText(value).toLowerCase();

  if (
    sentiment.includes("positive") ||
    sentiment.includes("good")
  ) {
    return colors.success;
  }

  if (
    sentiment.includes("negative") ||
    sentiment.includes("bad")
  ) {
    return colors.danger;
  }

  return colors.warning;
}

function normalizeSentiment(value: unknown) {
  return cleanText(value) || "Unknown";
}

function platformColor(value: unknown) {
  const platform = cleanText(value).toLowerCase();

  if (platform.includes("facebook")) return "#60A5FA";
  if (platform.includes("instagram")) return "#F472B6";
  if (platform.includes("youtube")) return "#F87171";
  if (platform.includes("tiktok")) return "#E5E7EB";
  if (platform.includes("reddit")) return "#FB923C";
  if (platform.includes("x") || platform.includes("twitter")) return "#A1A1AA";

  return colors.primary;
}

function platformIcon(value: unknown):
  | "logo-facebook"
  | "logo-instagram"
  | "logo-youtube"
  | "logo-tiktok"
  | "logo-reddit"
  | "chatbubble-ellipses-outline" {
  const platform = cleanText(value).toLowerCase();

  if (platform.includes("facebook")) return "logo-facebook";
  if (platform.includes("instagram")) return "logo-instagram";
  if (platform.includes("youtube")) return "logo-youtube";
  if (platform.includes("tiktok")) return "logo-tiktok";
  if (platform.includes("reddit")) return "logo-reddit";

  return "chatbubble-ellipses-outline";
}

function titleFor(type: ReportType) {
  if (type === "tickets") return "Ticket Records";
  if (type === "satisfaction") return "Satisfaction Responses";
  if (type === "global-rma") return "Global RMA Records";
  if (type === "rush-rma") return "Rush RMA Records";
  return "Social Report Data";
}

function RatingBadge({
  rating,
}: {
  rating: string;
}) {
  const good = rating === "Good";
  const bad = rating === "Bad";

  return (
    <View
      style={[
        styles.ratingBadge,
        good && styles.ratingGood,
        bad && styles.ratingBad,
      ]}
    >
      <Ionicons
        name={
          good
            ? "checkmark-circle-outline"
            : bad
              ? "close-circle-outline"
              : "ellipse-outline"
        }
        size={14}
        color={
          good
            ? colors.success
            : bad
              ? colors.danger
              : colors.textDim
        }
      />

      <Text
        style={[
          styles.ratingText,
          {
            color:
              good
                ? colors.success
                : bad
                  ? colors.danger
                  : colors.textDim,
          },
        ]}
      >
        {rating}
      </Text>
    </View>
  );
}

export default function ReportTableScreen() {
  const params =
    useLocalSearchParams<{
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

  const type =
    (params.type ||
      "tickets") as ReportType;

  const [rows, setRows] =
    useState<AnyRow[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const load =
    useCallback(async () => {
      setError("");

      try {
        if (type === "tickets") {
          const data =
            await fetchTicketReport({
              search:
                params.search || "",
              region:
                params.region || "",
              limit: 5000,
            });

          setRows(
            (data.rows ||
              []) as AnyRow[],
          );
        } else if (
          type ===
          "satisfaction"
        ) {
          const data =
            await fetchSatisfactionReport({
              search:
                params.search || "",
              rating:
                params.rating ||
                "Good",
              limit: 5000,
            });

          setRows(
            (data.rows ||
              []) as AnyRow[],
          );
        } else if (
          type ===
          "global-rma"
        ) {
          const data =
            await fetchGlobalRmaReport({
              search:
                params.search || "",
              region:
                params.region || "",
              year:
                params.year || "",
              limit: 5000,
            });

          setRows(
            (data.rows ||
              []) as AnyRow[],
          );
        } else if (
          type ===
          "rush-rma"
        ) {
          const data =
            await fetchRushRmaReport({
              search:
                params.search || "",
              region:
                params.region || "",
              product:
                params.product || "",
              month:
                params.month || "",
              limit: 5000,
            });

          setRows(
            (data.rows ||
              []) as AnyRow[],
          );
        } else {
          const data =
            await fetchSocialReport({
              search:
                params.search || "",
              socialPlatform:
                params.platform || "",
              platform:
                params.platform || "",
              customerResponse:
                params.sentiment || "",
              limit: 5000,
            });

          setRows(
            (data.rows ||
              []) as AnyRow[],
          );
        }
      } catch (
        requestError: any
      ) {
        setError(
          requestError?.response
            ?.data?.message ||
            requestError?.message ||
            "Unable to load records.",
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

  useEffect(() => {
    load();
  }, [load]);

  function renderTicket(
    row: AnyRow,
    index: number,
  ) {
    return (
      <View
        key={`${row.ticketNumber || index}`}
        style={styles.ticketCard}
      >
        <View style={styles.ticketTop}>
          <Text
            style={styles.ticketNumber}
          >
            #
            {row.ticketNumber ||
              row.ticketId ||
              "-"}
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
          style={styles.ticketSubject}
          numberOfLines={2}
        >
          {row.subject ||
            row.category ||
            "No subject"}
        </Text>

        <View
          style={styles.ticketBottom}
        >
          <Text
            style={styles.ticketDate}
          >
            {row.date || "-"}
          </Text>

          <Text
            style={styles.ticketProduct}
            numberOfLines={1}
          >
            {row.product ||
              "No product"}
          </Text>
        </View>
      </View>
    );
  }

  function renderSatisfaction(
    row: AnyRow,
    index: number,
  ) {
    const currentRating =
      normalizeRating(
        row.rating,
      );

    const comment =
      getComment(row);

    return (
      <View
        key={`${getTicketId(
          row,
        )}-${index}`}
        style={styles.responseCard}
      >
        <View
          style={styles.responseTop}
        >
          <Text
            style={styles.responseTicket}
          >
            #{getTicketId(row)}
          </Text>

          <RatingBadge
            rating={
              currentRating
            }
          />
        </View>

        <View style={styles.metaRow}>
          <Text
            style={styles.responseDate}
          >
            {getDate(row)}
          </Text>

          <Text
            style={styles.responseCategory}
          >
            {getCategory(row) ||
              "Unknown"}
          </Text>
        </View>

        <Text
          numberOfLines={4}
          style={[
            styles.responseComment,
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
            router.push({
              pathname:
                "/satisfaction-ai",
              params: {
                ticketId:
                  getTicketId(
                    row,
                  ),
                rating:
                  currentRating,
                category:
                  getCategory(
                    row,
                  ),
                comment,
              },
            })
          }
          disabled={!comment}
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
                ? "#000000"
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
            AI Summary
          </Text>
        </Pressable>
      </View>
    );
  }

  function renderGlobalRma(
    row: AnyRow,
    index: number,
  ) {
    return (
      <View
        key={`${row.id || row.rmaNumber || index}`}
        style={styles.rmaCard}
      >
        <View style={styles.rmaTop}>
          <Text
            style={styles.rmaNumber}
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
          numberOfLines={2}
          style={styles.rmaProduct}
        >
          {row.productName ||
            row.deviceName ||
            row.product ||
            "Unknown Product"}
        </Text>

        <View
          style={styles.rmaDateRow}
        >
          <Text
            style={styles.rmaDate}
          >
            Date:{" "}
            {row.entryDate ||
              "-"}
          </Text>

          <Text
            style={styles.rmaDate}
          >
            Processed:{" "}
            {row.processedDate ||
              "-"}
          </Text>
        </View>

        <Text
          numberOfLines={2}
          style={styles.rmaFault}
        >
          {row.faultCategory ||
            row.faultDescription ||
            "No fault category"}
        </Text>
      </View>
    );
  }

  function renderRushRma(
    row: AnyRow,
    index: number,
  ) {
    return (
      <View
        key={`${row.region}-${row.month}-${row.product}-${index}`}
        style={styles.rushCard}
      >
        <View
          style={styles.rushCardTop}
        >
          <Text
            style={styles.rushProduct}
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
          style={styles.rushMeta}
        >
          {row.month ||
            "No month"}
        </Text>

        <Text
          numberOfLines={3}
          style={styles.rushDescription}
        >
          {row.description ||
            "No description"}
        </Text>

        <View
          style={styles.rushValues}
        >
          <Text
            style={styles.rushValue}
          >
            Actual RMA:{" "}
            {Number(
              row.actualRmaReplacement ||
                0,
            )}
          </Text>

          <Text
            style={styles.rushValue}
          >
            Queries:{" "}
            {Number(
              row.googleDriveRmaCases ||
                0,
            )}
          </Text>
        </View>
      </View>
    );
  }

  function renderSocial(
    row: AnyRow,
    index: number,
  ) {
    return (
      <View
        key={`${row.id || row.postQueryDate || index}`}
        style={styles.socialCard}
      >
        <View
          style={styles.socialCardTop}
        >
          <View
            style={styles.platformTitle}
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
                name={platformIcon(
                  row.socialPlatform,
                )}
                size={18}
                color={platformColor(
                  row.socialPlatform,
                )}
              />
            </View>

            <View
              style={{ flex: 1 }}
            >
              <Text
                style={styles.cardPlatform}
              >
                {row.socialPlatform ||
                  "Unknown"}
              </Text>

              <Text
                style={styles.socialDate}
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
          style={styles.socialProduct}
        >
          {row.product ||
            "Unknown Product"}
        </Text>

        <Text
          numberOfLines={4}
          style={styles.socialQuery}
        >
          {row.postQuery ||
            "No query"}
        </Text>

        <Text
          numberOfLines={4}
          style={styles.socialResponse}
        >
          {row.response ||
            "No response"}
        </Text>

        <Text
          style={styles.socialCategory}
        >
          {row.category ||
            "Uncategorized"}
        </Text>
      </View>
    );
  }

  function renderRow(
    row: AnyRow,
    index: number,
  ) {
    if (type === "tickets") {
      return renderTicket(
        row,
        index,
      );
    }

    if (
      type ===
      "satisfaction"
    ) {
      return renderSatisfaction(
        row,
        index,
      );
    }

    if (
      type ===
      "global-rma"
    ) {
      return renderGlobalRma(
        row,
        index,
      );
    }

    if (
      type ===
      "rush-rma"
    ) {
      return renderRushRma(
        row,
        index,
      );
    }

    return renderSocial(
      row,
      index,
    );
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
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            router.back()
          }
          style={styles.back}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={colors.text}
          />
        </Pressable>

        <View
          style={{ flex: 1 }}
        >
          <Text
            style={styles.eyebrow}
          >
            REPORT RECORDS
          </Text>

          <Text
            style={styles.title}
          >
            {titleFor(type)}
          </Text>

          <Text
            style={styles.count}
          >
            {rows.length} records
          </Text>
        </View>
      </View>

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
              setRefreshing(
                true,
              );
              load();
            }}
          />
        }
      >
        {error ? (
          <Text
            style={styles.error}
          >
            {error}
          </Text>
        ) : null}

        {loading ? (
          <ActivityIndicator
            color={
              colors.primary
            }
            size="large"
            style={{
              marginTop: 40,
            }}
          />
        ) : (
          rows.map(
            renderRow,
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor:
        colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor:
        colors.border,
      backgroundColor:
        colors.surface,
    },
    back: {
      width: 42,
      height: 42,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        colors.border,
      alignItems: "center",
      justifyContent:
        "center",
    },
    eyebrow: {
      color:
        colors.primary,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.4,
    },
    title: {
      marginTop: 3,
      color:
        colors.text,
      fontSize: 21,
      fontWeight: "900",
    },
    count: {
      marginTop: 3,
      color:
        colors.textDim,
      fontSize: 10,
      fontWeight: "800",
    },
    content: {
      padding: 16,
      paddingBottom: 40,
      gap: 12,
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

    /* Tickets — same card layout as the main report page */
    ticketCard: {
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
    ticketSubject: {
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
    ticketDate: {
      color:
        colors.textDim,
      fontSize: 10,
      fontWeight: "700",
    },
    ticketProduct: {
      flex: 1,
      textAlign: "right",
      color:
        colors.primary,
      fontSize: 10,
      fontWeight: "800",
    },

    /* Satisfaction — same response-card layout as the main page */
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
    responseTicket: {
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
    responseDate: {
      color:
        colors.textMuted,
      fontSize: 10,
      fontWeight: "800",
    },
    responseCategory: {
      color:
        colors.textDim,
      fontSize: 10,
      fontWeight: "800",
    },
    responseComment: {
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
      color:
        "#FCA5A5",
    },
    summaryButton: {
      minHeight: 44,
      marginTop: 13,
      borderRadius: 13,
      backgroundColor:
        colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 8,
    },
    summaryDisabled: {
      backgroundColor:
        colors.borderSoft,
    },
    summaryText: {
      color: "#000000",
      fontSize: 11,
      fontWeight: "900",
    },
    summaryDisabledText: {
      color:
        colors.textDim,
    },

    /* Global RMA — same card layout as the main page */
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
    rmaProduct: {
      color:
        colors.primary,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: "800",
      marginTop: 10,
    },
    rmaDateRow: {
      marginTop: 10,
      gap: 4,
    },
    rmaDate: {
      color:
        colors.textMuted,
      fontSize: 10,
      fontWeight: "700",
    },
    rmaFault: {
      marginTop: 10,
      color: colors.text,
      fontSize: 14,
      fontWeight: "900",
      textTransform:
        "uppercase",
      letterSpacing: 1,
    },

    /* Rush RMA — same card layout as the main page */
    rushCard: {
      borderWidth: 1,
      borderColor:
        colors.borderSoft,
      borderRadius: 20,
      backgroundColor:
        colors.surface,
      padding: 15,
    },
    rushCardTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      gap: 10,
    },
    rushProduct: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      fontWeight: "900",
    },
    rushMeta: {
      marginTop: 8,
      color:
        colors.primary,
      fontSize: 10,
      fontWeight: "900",
    },
    rushDescription: {
      marginTop: 9,
      color:
        colors.textMuted,
      fontSize: 11,
      lineHeight: 17,
    },
    rushValues: {
      marginTop: 11,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    rushValue: {
      color:
        colors.textDim,
      fontSize: 10,
      fontWeight: "800",
    },

    /* Social — same card layout as the main page */
    socialCard: {
      borderWidth: 1,
      borderColor:
        colors.borderSoft,
      borderRadius: 20,
      backgroundColor:
        colors.surface,
      padding: 15,
    },
    socialCardTop: {
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
    platformIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent:
        "center",
    },
    cardPlatform: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "900",
    },
    socialDate: {
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
    socialProduct: {
      color:
        colors.textMuted,
      fontSize: 10,
      fontWeight: "800",
      marginTop: 12,
    },
    socialQuery: {
      color:
        colors.warning,
      fontSize: 11,
      lineHeight: 18,
      fontWeight: "700",
      marginTop: 10,
    },
    socialResponse: {
      color:
        colors.primary,
      fontSize: 11,
      lineHeight: 18,
      fontWeight: "700",
      marginTop: 10,
    },
    socialCategory: {
      color:
        colors.textDim,
      fontSize: 9,
      fontWeight: "800",
      marginTop: 10,
    },
  });
