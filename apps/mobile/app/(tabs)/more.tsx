import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useDashboardSync } from "@/context/DashboardSyncContext";
import { colors } from "@/theme/colors";
import { canAccessModule } from "@/utils/permissions";

function ReportRow({
  title,
  subtitle,
  icon,
  onPress,
  disabled = false,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed &&
          !disabled &&
          styles.rowPressed,
        disabled &&
          styles.rowDisabled,
      ]}
    >
      <View
        style={
          styles.rowIcon
        }
      >
        <Ionicons
          name={icon}
          size={19}
          color={
            disabled
              ? colors.textDim
              : colors.primary
          }
        />
      </View>

      <View
        style={
          styles.rowCopy
        }
      >
        <Text
          style={
            styles.rowText
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.rowSub
          }
        >
          {subtitle}
        </Text>
      </View>

      {disabled ? (
        <Text
          style={
            styles.pending
          }
        >
          NEXT PHASE
        </Text>
      ) : (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={
            colors.textDim
          }
        />
      )}
    </Pressable>
  );
}

export default function MoreScreen() {
  const {
    user,
    logout,
  } =
    useAuth();

  const {
    syncing,
    lastSyncedAt,
    syncAll,
    lastResults,
  } =
    useDashboardSync();

  const successful =
    lastResults.filter(
      (item) =>
        item.ok,
    ).length;

  async function handleLogout() {
    await logout();
    router.replace(
      "/(auth)/login",
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
      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >
        <Text
          style={
            styles.eyebrow
          }
        >
          ACCOUNT
        </Text>

        <Text
          style={
            styles.title
          }
        >
          More
        </Text>

        <Pressable
          onPress={() =>
            router.push(
              "/profile",
            )
          }
          style={
            styles.profileCard
          }
        >
          <View
            style={
              styles.avatar
            }
          >
            <Ionicons
              name="person-outline"
              size={25}
              color={
                colors.primary
              }
            />
          </View>

          <View
            style={
              styles.profileCopy
            }
          >
            <Text
              style={
                styles.profileName
              }
            >
              {String(
                user?.name ||
                  user?.email ||
                  "Atomos User",
              )}
            </Text>

            <Text
              style={
                styles.profileMeta
              }
            >
              {String(
                user?.role ||
                  "viewer",
              ).toUpperCase()}
              {"  ·  "}
              VIEW PROFILE
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={
              colors.textDim
            }
          />
        </Pressable>

        <View
          style={
            styles.syncCard
          }
        >
          <View
            style={{
              flex: 1,
            }}
          >
            <Text
              style={
                styles.syncTitle
              }
            >
              MOBILE DATA SYNC
            </Text>

            <Text
              style={
                styles.syncMeta
              }
            >
              {lastSyncedAt
                ? `Last synced ${new Date(
                    lastSyncedAt,
                  ).toLocaleString()}`
                : "Auto-sync runs after login"}
            </Text>

            {lastResults.length ? (
              <Text
                style={
                  styles.syncResult
                }
              >
                {successful}/
                {lastResults.length} accessible modules synced
              </Text>
            ) : null}
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
            {syncing ? (
              <ActivityIndicator
                color="#000"
                size="small"
              />
            ) : (
              <Ionicons
                name="sync"
                size={17}
                color="#000"
              />
            )}
          </Pressable>
        </View>
<Pressable
          onPress={
            handleLogout
          }
          style={
            styles.logoutButton
          }
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color="#FCA5A5"
          />

          <Text
            style={
              styles.logoutText
            }
          >
            Log Out
          </Text>
        </Pressable>

        <Text
          style={
            styles.version
          }
        >
          Atomos Mobile · v0.13.0
        </Text>
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
      paddingBottom: 34,
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
    },
    profileCard: {
      marginTop: 22,
      borderRadius: 22,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 8,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 16,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        colors.primarySoft,
    },
    profileCopy: {
      flex: 1,
    },
    profileName: {
      color:
        colors.text,
      fontSize: 15,
      fontWeight: "900",
    },
    profileMeta: {
      marginTop: 4,
      color:
        colors.primary,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1,
    },
    syncCard: {
      marginTop: 10,
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        "rgba(0,220,197,.22)",
      backgroundColor:
        colors.primarySoft,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    syncTitle: {
      color:
        colors.primary,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.3,
    },
    syncMeta: {
      color:
        colors.textMuted,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 5,
    },
    syncResult: {
      color:
        colors.textDim,
      fontSize: 9,
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
    row: {
      minHeight: 72,
      marginTop: 10,
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        colors.borderSoft,
      backgroundColor:
        colors.surface,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    rowPressed: {
      borderColor:
        "rgba(0,220,197,.45)",
      backgroundColor:
        colors.primarySoft,
    },
    rowDisabled: {
      opacity: 0.62,
    },
    rowIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        colors.primarySoft,
    },
    rowCopy: {
      flex: 1,
    },
    rowText: {
      color:
        colors.text,
      fontSize: 14,
      fontWeight: "800",
    },
    rowSub: {
      marginTop: 3,
      color:
        colors.textDim,
      fontSize: 10,
      lineHeight: 15,
    },
    pending: {
      color:
        colors.textDim,
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1,
    },
    logoutButton: {
      marginTop: 20,
      minHeight: 56,
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        "rgba(239,68,68,0.30)",
      backgroundColor:
        colors.dangerSoft,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 9,
    },
    logoutText: {
      color: "#FCA5A5",
      fontSize: 14,
      fontWeight: "900",
    },
    version: {
      marginTop: 20,
      color:
        colors.textDim,
      fontSize: 10,
      textAlign: "center",
    },
  });
