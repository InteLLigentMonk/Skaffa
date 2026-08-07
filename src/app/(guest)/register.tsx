import Spacer from "@/components/spacer";
import ThemedButton from "@/components/themed-button";
import { ThemedText } from "@/components/themed-text";
import ThemedTextInput from "@/components/themed-text-input";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text } from "react-native";

type ErrorState = {
  displayName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

const Register = () => {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<ErrorState>({});

  const router = useRouter();
  const { register } = useAuth();

  const handleSubmit = () => {
    const errors: ErrorState = {};

    if (!displayName.trim()) {
      errors.displayName = "Namn är obligatoriskt.";
    }
    if (!email.trim()) {
      errors.email = "Email är obligatoriskt.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Ogiltig e-postadress.";
    }
    if (!password) {
      errors.password = "Lösenord är obligatoriskt.";
    }
    if (password && password.length < 6) {
      errors.password = "Lösenordet måste vara minst 6 tecken långt.";
    }
    if (!confirmPassword) {
      errors.confirmPassword = "Bekräftelse av lösenord är obligatoriskt.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Lösenorden matchar inte.";
    }

    setError(errors);

    if (Object.keys(errors).length > 0) return;

    register(email, password, displayName.trim())
      .then(() => {
        router.push("/verify-email");
      })
      .catch((err) => {
        console.error("Registration error:", err);
        setError({ email: "Registrering misslyckades. Försök igen." });
      });
  };

  return (
    <ThemedView style={styles.container}>
      <Pressable style={styles.inner} onPress={Keyboard.dismiss}>
        <ThemedText type="title">Registrera Dig</ThemedText>
        <Spacer size="xl" />
        <ThemedTextInput
          variant={error.displayName ? "error" : "default"}
          placeholder="Namn"
          autoCapitalize="words"
          value={displayName}
          onChangeText={setDisplayName}
        />
        {error.displayName && (
          <Text style={{ color: Colors.error }}>{error.displayName}</Text>
        )}
        <ThemedTextInput
          variant={error.email ? "error" : "default"}
          placeholder="Email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        {error.email && (
          <Text style={{ color: Colors.error }}>{error.email}</Text>
        )}
        <ThemedTextInput
          variant={error.password ? "error" : "default"}
          placeholder="Lösenord"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error.password && (
          <Text style={{ color: Colors.error }}>{error.password}</Text>
        )}
        <ThemedTextInput
          variant={error.confirmPassword ? "error" : "default"}
          placeholder="Bekräfta Lösenord"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        {error.confirmPassword && (
          <Text style={{ color: Colors.error }}>{error.confirmPassword}</Text>
        )}
        <Spacer size="md" />
        <ThemedButton title="Registrera" onPress={handleSubmit} />
        <Spacer size="xl" />
        <Link href="/login" replace>
          <ThemedText type="link">Har du redan ett konto? Logga in</ThemedText>
        </Link>
      </Pressable>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default Register;
