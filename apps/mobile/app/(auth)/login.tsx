import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AtomosLogo from "@/components/AtomosLogo";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/theme/colors";


export default function LoginScreen() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await login({ email: email.trim(), password });
      router.replace("/(tabs)/tickets");
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Invalid email or password."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.glowOne} />
          <View style={styles.glowTwo} />

          <View style={styles.card}>
            <View style={styles.logoWrap}>
              <AtomosLogo width={205} height={39} />
            </View>

            <Text style={styles.eyebrow}>ANALYTICS WORKSPACE</Text>
            <Text style={styles.title}>Sign in to continue</Text>
            <Text style={styles.description}>
              Ticket, RMA, satisfaction and social reporting in one workspace.
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={18} color="#FCA5A5" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <View style={styles.inputShell}>
                <Ionicons name="mail-outline" size={19} color={colors.textDim} />
                <TextInput
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    setError("");
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="name@company.com"
                  placeholderTextColor="#52525B"
                  style={styles.input}
                  editable={!submitting}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.inputShell}>
                <Ionicons name="lock-closed-outline" size={19} color={colors.textDim} />
                <TextInput
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setError("");
                  }}
                  secureTextEntry={!showPassword}
                  placeholder="Enter password"
                  placeholderTextColor="#52525B"
                  style={styles.input}
                  editable={!submitting}
                  onSubmitEditing={submit}
                />
                <Pressable
                  onPress={() => setShowPassword((current) => !current)}
                  hitSlop={10}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textDim}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={submit}
              disabled={submitting}
              style={({ pressed }) => [
                styles.button,
                pressed && !submitting ? styles.buttonPressed : null,
                submitting ? styles.buttonDisabled : null
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Ionicons name="log-in-outline" size={19} color="#000000" />
              )}
              <Text style={styles.buttonText}>
                {submitting ? "Signing In..." : "Sign In"}
              </Text>
            </Pressable>
</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingVertical: 24,
    justifyContent: "center",
    overflow: "hidden"
  },
  glowOne: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: "rgba(0,220,197,0.10)",
    top: 30,
    right: -150
  },
  glowTwo: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(56,189,248,0.05)",
    bottom: 15,
    left: -130
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(5,5,5,0.98)",
    padding: 22
  },
  logoWrap: { alignItems: "center", marginBottom: 22 },
  eyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2.2,
    textAlign: "center"
  },
  title: {
    marginTop: 10,
    color: colors.text,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "900",
    textAlign: "center"
  },
  description: {
    marginTop: 8,
    marginBottom: 22,
    color: colors.textDim,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center"
  },
  errorBox: {
    marginBottom: 16,
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.32)",
    backgroundColor: colors.dangerSoft,
    flexDirection: "row",
    gap: 9,
    alignItems: "flex-start"
  },
  errorText: {
    flex: 1,
    color: "#FCA5A5",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700"
  },
  fieldGroup: { marginBottom: 16 },
  label: {
    marginBottom: 8,
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: "900"
  },
  inputShell: {
    minHeight: 56,
    paddingHorizontal: 15,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    flexDirection: "row",
    alignItems: "center",
    gap: 11
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    paddingVertical: 14
  },
  button: {
    minHeight: 58,
    marginTop: 4,
    borderRadius: 20,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9
  },
  buttonPressed: { opacity: 0.88, transform: [{ scale: 0.995 }] },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: "#000000", fontSize: 14, fontWeight: "900" },
  divider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: 22 },
  presentedBy: { alignItems: "center", gap: 8 },
  presentedText: {
    color: colors.textDim,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.8
  },
  mahiLogo: { width: 178, height: 34 }
});
