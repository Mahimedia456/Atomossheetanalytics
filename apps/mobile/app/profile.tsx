import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
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
import { clearReportCache } from "@/services/reportCache";
import { isAdmin } from "@/utils/permissions";

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={
        styles.infoRow
      }
    >
      <Text
        style={
          styles.infoLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.infoValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const {
    user,
    logout,
  } =
    useAuth();

  const {
    lastSyncedAt,
  } =
    useDashboardSync();

  const permissions =
    Array.isArray(
      user?.permissions,
    )
      ? user?.permissions || []
      : [];

  async function handleLogout() {
    await logout();
    router.replace(
      "/(auth)/login",
    );
  }

  async function clearCachedReports() {
    await clearReportCache();
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
              ACCOUNT
            </Text>

            <Text
              style={
                styles.title
              }
            >
              Profile
            </Text>
          </View>
        </View>

        <View
          style={
            styles.identity
          }
        >
          <View
            style={
              styles.avatar
            }
          >
            <Ionicons
              name="person-outline"
              size={32}
              color={
                colors.primary
              }
            />
          </View>

          <Text
            style={
              styles.name
            }
          >
            {String(
              user?.name ||
                "Atomos User",
            )}
          </Text>

          <Text
            style={
              styles.email
            }
          >
            {String(
              user?.email ||
                "No email",
            )}
          </Text>

          <View
            style={
              styles.roleBadge
            }
          >
            <Text
              style={
                styles.roleText
              }
            >
              {String(
                user?.role ||
                  "viewer",
              ).toUpperCase()}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.panel
          }
        >
          <InfoRow
            label="Account ID"
            value={String(
              user?.id ||
                "-",
            )}
          />

          <InfoRow
            label="Access level"
            value={
              isAdmin(user)
                ? "Administrator"
                : "Viewer"
            }
          />

          <InfoRow
            label="Last mobile sync"
            value={
              lastSyncedAt
                ? new Date(
                    lastSyncedAt,
                  ).toLocaleString()
                : "Not synced yet"
            }
          />

          <InfoRow
            label="Mobile version"
            value="0.10.0"
          />
        </View>

        <View
          style={
            styles.panel
          }
        >
          <Text
            style={
              styles.panelTitle
            }
          >
            PERMISSIONS
          </Text>

          {isAdmin(user) ? (
            <View
              style={
                styles.permission
              }
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={17}
                color={
                  colors.primary
                }
              />

              <Text
                style={
                  styles.permissionText
                }
              >
                Administrator — all reporting modules
              </Text>
            </View>
          ) : permissions.length ? (
            permissions.map(
              (
                permission,
              ) => (
                <View
                  key={
                    permission
                  }
                  style={
                    styles.permission
                  }
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={17}
                    color={
                      colors.success
                    }
                  />

                  <Text
                    style={
                      styles.permissionText
                    }
                  >
                    {permission}
                  </Text>
                </View>
              ),
            )
          ) : (
            <Text
              style={
                styles.empty
              }
            >
              No explicit module permissions were returned for this account.
            </Text>
          )}
        </View>

        <Pressable
          onPress={
            clearCachedReports
          }
          style={
            styles.cacheButton
          }
        >
          <Ionicons
            name="trash-bin-outline"
            size={18}
            color={
              colors.warning
            }
          />

          <Text
            style={
              styles.cacheButtonText
            }
          >
            Clear Offline Report Cache
          </Text>
        </Pressable>

        <Pressable
          onPress={
            handleLogout
          }
          style={
            styles.logout
          }
        >
          <Ionicons
            name="log-out-outline"
            size={19}
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
      letterSpacing: 1.6,
    },
    title: {
      color:
        colors.text,
      fontSize: 27,
      fontWeight: "900",
      marginTop: 4,
    },
    identity: {
      marginTop: 4,
      borderRadius: 24,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      padding: 20,
      alignItems: "center",
    },
    avatar: {
      width: 70,
      height: 70,
      borderRadius: 24,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        colors.primarySoft,
      borderWidth: 1,
      borderColor:
        "rgba(0,220,197,.26)",
    },
    name: {
      color:
        colors.text,
      fontSize: 20,
      fontWeight: "900",
      marginTop: 14,
    },
    email: {
      color:
        colors.textMuted,
      fontSize: 11,
      marginTop: 5,
    },
    roleBadge: {
      marginTop: 12,
      borderWidth: 1,
      borderColor:
        "rgba(0,220,197,.28)",
      backgroundColor:
        colors.primarySoft,
      borderRadius: 99,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    roleText: {
      color:
        colors.primary,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.2,
    },
    panel: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        colors.borderSoft,
      backgroundColor:
        colors.surface,
      padding: 15,
    },
    panelTitle: {
      color:
        colors.primary,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.4,
      marginBottom: 8,
    },
    infoRow: {
      minHeight: 48,
      borderBottomWidth: 1,
      borderBottomColor:
        colors.borderSoft,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      gap: 18,
    },
    infoLabel: {
      color:
        colors.textDim,
      fontSize: 10,
      fontWeight: "800",
    },
    infoValue: {
      flex: 1,
      color:
        colors.text,
      fontSize: 10,
      fontWeight: "800",
      textAlign: "right",
    },
    permission: {
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      borderBottomWidth: 1,
      borderBottomColor:
        colors.borderSoft,
    },
    permissionText: {
      flex: 1,
      color:
        colors.textMuted,
      fontSize: 10,
      lineHeight: 15,
      fontWeight: "700",
    },
    empty: {
      color:
        colors.textDim,
      fontSize: 11,
      lineHeight: 17,
    },
    cacheButton: {
      minHeight: 52,
      borderRadius: 17,
      borderWidth: 1,
      borderColor:
        "rgba(245,158,11,.28)",
      backgroundColor:
        "rgba(245,158,11,.07)",
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 8,
    },
    cacheButtonText: {
      color:
        colors.warning,
      fontSize: 12,
      fontWeight: "900",
    },
    logout: {
      minHeight: 54,
      borderRadius: 17,
      borderWidth: 1,
      borderColor:
        "rgba(239,68,68,.30)",
      backgroundColor:
        colors.dangerSoft,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 8,
    },
    logoutText: {
      color: "#FCA5A5",
      fontSize: 13,
      fontWeight: "900",
    },
  });
