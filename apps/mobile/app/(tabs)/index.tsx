import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AtomosLogo from "@/components/AtomosLogo";
import { useAuth } from "@/context/AuthContext";
import { useDashboardSync } from "@/context/DashboardSyncContext";
import { colors } from "@/theme/colors";
import {
  canAccessModule,
  MobileModuleKey,
} from "@/utils/permissions";

const mahiLogo =
  require("../../assets/brand/mahi-logo.webp");

type HomeModule = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  module?: MobileModuleKey;
};

const modules: HomeModule[] = [
  {
    title: "Ticket Analytics",
    subtitle:
      "Tickets, products, categories and regions",
    icon: "ticket-outline",
    route:
      "/(tabs)/tickets",
    module: "tickets",
  },
  {
    title: "Global RMA",
    subtitle:
      "USA + EMEA RMA reporting",
    icon: "cube-outline",
    route: "/(tabs)/rma",
    module: "globalRma",
  },
  {
    title: "Social Analytics",
    subtitle:
      "Platforms, queries and customer sentiments",
    icon: "share-social-outline",
    route:
      "/(tabs)/social",
    module: "social",
  },
  {
    title: "Satisfaction",
    subtitle:
      "Good/Bad feedback and AI summaries",
    icon: "happy-outline",
    route: "/satisfaction",
    module:
      "satisfaction",
  },
  {
    title: "Rush RMA",
    subtitle:
      "US + EMEA inventory and replacement reporting",
    icon: "flash-outline",
    route: "/rush-rma",
    module: "rushRma",
  },
  {
    title: "Account & More",
    subtitle:
      "Profile, permissions, sync and additional reports",
    icon: "grid-outline",
    route: "/(tabs)/more",
  },
];

const moduleLabels: Record<
  MobileModuleKey,
  string
> = {
  tickets: "Tickets",
  globalRma: "Global RMA",
  rushRma: "Rush RMA",
  satisfaction:
    "Satisfaction",
  social: "Social",
  agents: "Agents",
};

export default function HomeScreen() {
  const {
    user,
  } =
    useAuth();

  const {
    syncing,
    status,
    lastSyncedAt,
    lastResults,
    syncAll,
  } =
    useDashboardSync();

  const visible =
    modules.filter(
      (item) =>
        !item.module ||
        canAccessModule(
          user,
          item.module,
        ),
    );

  const successful =
    lastResults.filter(
      (result) =>
        result.ok,
    ).length;

  const failed =
    lastResults.filter(
      (result) =>
        !result.ok,
    );

  async function refresh() {
    await syncAll();
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
              syncing
            }
            tintColor={
              colors.primary
            }
            onRefresh={
              refresh
            }
          />
        }
      >
        <View
          style={
            styles.header
          }
        >
          <AtomosLogo
            width={150}
            height={30}
          />

          <Pressable
            onPress={() =>
              router.push(
                "/profile",
              )
            }
            style={
              styles.role
            }
          >
            <Text
              style={
                styles.roleText
              }
            >
              {String(
                user?.role ||
                  "Viewer",
              ).toUpperCase()}
            </Text>
          </Pressable>
        </View>

        <Text
          style={
            styles.eyebrow
          }
        >
          MOBILE REPORTING
        </Text>

        <Text
          style={
            styles.title
          }
        >
          Analytics at a glance
        </Text>

        <Text
          style={
            styles.subtitle
          }
        >
          Permission-aware Atomos reporting powered by the existing Google Sheet API.
        </Text>

        <View
          style={
            styles.syncPanel
          }
        >
          <View
            style={
              styles.syncHead
            }
          >
            <View>
              <Text
                style={
                  styles.syncEyebrow
                }
              >
                DATA STATUS
              </Text>

              <Text
                style={
                  styles.syncTitle
                }
              >
                {syncing
                  ? "Syncing accessible reports"
                  : status ===
                      "success"
                    ? "Reports ready"
                    : "Mobile sync"}
              </Text>
            </View>

            <Pressable
              onPress={() =>
                syncAll()
              }
              disabled={
                syncing
              }
              style={
                styles.syncButton
              }
            >
              <Ionicons
                name={
                  syncing
                    ? "hourglass-outline"
                    : "sync"
                }
                size={18}
                color="#000"
              />
            </Pressable>
          </View>

          <Text
            style={
              styles.syncMeta
            }
          >
            {lastSyncedAt
              ? `Last full sync ${new Date(
                  lastSyncedAt,
                ).toLocaleString()}`
              : "Auto-sync starts after a valid login."}
          </Text>

          {lastResults.length ? (
            <View
              style={
                styles.syncSummary
              }
            >
              <Text
                style={
                  styles.okText
                }
              >
                {successful} synced
              </Text>

              <Text
                style={
                  styles.separator
                }
              >
                ·
              </Text>

              <Text
                style={
                  failed.length
                    ? styles.failText
                    : styles.mutedText
                }
              >
                {failed.length} failed
              </Text>
            </View>
          ) : null}

          {failed.map(
            (result) => (
              <Text
                key={
                  result.module
                }
                style={
                  styles.failDetail
                }
              >
                {moduleLabels[
                  result.module
                ]}:{" "}
                {result.message ||
                  "Sync failed"}
              </Text>
            ),
          )}
        </View>

        <View
          style={
            styles.grid
          }
        >
          {visible.map(
            (item) => (
              <Pressable
                key={
                  item.title
                }
                onPress={() =>
                  router.push(
                    item.route as never,
                  )
                }
                style={({
                  pressed,
                }) => [
                  styles.card,
                  pressed &&
                    styles.pressed,
                ]}
              >
                <View
                  style={
                    styles.icon
                  }
                >
                  <Ionicons
                    name={
                      item.icon
                    }
                    size={24}
                    color={
                      colors.primary
                    }
                  />
                </View>

                <Text
                  style={
                    styles.cardTitle
                  }
                >
                  {item.title}
                </Text>

                <Text
                  style={
                    styles.cardSub
                  }
                >
                  {item.subtitle}
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={
                    colors.textDim
                  }
                  style={
                    styles.arrow
                  }
                />
              </Pressable>
            ),
          )}
        </View>

        <View
          style={
            styles.presented
          }
        >
          <Text
            style={
              styles.presentedText
            }
          >
            PRESENTED BY
          </Text>

          <Image
            source={
              mahiLogo
            }
            resizeMode="contain"
            style={
              styles.mahi
            }
          />
        </View>
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
    content: {
      padding: 18,
      paddingBottom: 30,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 28,
    },
    role: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor:
        "rgba(0,220,197,.28)",
      backgroundColor:
        colors.primarySoft,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    roleText: {
      color:
        colors.primary,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.2,
    },
    eyebrow: {
      color:
        colors.primary,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 2,
    },
    title: {
      marginTop: 7,
      color:
        colors.text,
      fontSize: 30,
      fontWeight: "900",
      letterSpacing: -0.8,
    },
    subtitle: {
      marginTop: 9,
      color:
        colors.textMuted,
      fontSize: 13,
      lineHeight: 20,
    },
    syncPanel: {
      marginTop: 22,
      borderWidth: 1,
      borderColor:
        "rgba(0,220,197,.25)",
      borderRadius: 22,
      backgroundColor:
        colors.surface,
      padding: 15,
    },
    syncHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      gap: 12,
    },
    syncEyebrow: {
      color:
        colors.primary,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.4,
    },
    syncTitle: {
      color:
        colors.text,
      fontSize: 14,
      fontWeight: "900",
      marginTop: 4,
    },
    syncButton: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor:
        colors.primary,
      alignItems: "center",
      justifyContent:
        "center",
    },
    syncMeta: {
      color:
        colors.textDim,
      fontSize: 9,
      marginTop: 11,
    },
    syncSummary: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginTop: 9,
    },
    okText: {
      color:
        colors.success,
      fontSize: 10,
      fontWeight: "900",
    },
    failText: {
      color:
        colors.danger,
      fontSize: 10,
      fontWeight: "900",
    },
    mutedText: {
      color:
        colors.textDim,
      fontSize: 10,
      fontWeight: "900",
    },
    separator: {
      color:
        colors.textDim,
      fontSize: 10,
    },
    failDetail: {
      color: "#FCA5A5",
      fontSize: 9,
      lineHeight: 14,
      marginTop: 5,
    },
    grid: {
      marginTop: 16,
      gap: 13,
    },
    card: {
      minHeight: 126,
      borderRadius: 22,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      padding: 17,
      justifyContent:
        "center",
    },
    pressed: {
      borderColor:
        "rgba(0,220,197,.45)",
      backgroundColor:
        "rgba(0,220,197,.06)",
    },
    icon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        colors.primarySoft,
      marginBottom: 12,
    },
    cardTitle: {
      color:
        colors.text,
      fontSize: 17,
      fontWeight: "900",
    },
    cardSub: {
      marginTop: 5,
      color:
        colors.textDim,
      fontSize: 12,
      lineHeight: 18,
      paddingRight: 34,
    },
    arrow: {
      position: "absolute",
      right: 18,
      bottom: 18,
    },
    presented: {
      marginTop: 18,
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        colors.borderSoft,
      backgroundColor:
        colors.surface,
      padding: 18,
      alignItems: "center",
    },
    presentedText: {
      color:
        colors.textDim,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.7,
    },
    mahi: {
      marginTop: 8,
      width: 180,
      height: 34,
    },
  });
