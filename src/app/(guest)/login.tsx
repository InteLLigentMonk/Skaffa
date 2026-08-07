import Spacer from "@/components/spacer";
import ThemedButton from "@/components/themed-button";
import { ThemedText } from "@/components/themed-text";
import ThemedTextInput from "@/components/themed-text-input";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Keyboard, Pressable, StyleSheet } from "react-native";

type LoginErrorState = {
  email?: string;
  password?: string;
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<LoginErrorState>({});
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = () => {
    const errors: LoginErrorState = {};

    if (!email.trim()) {
      errors.email = "Email är obligatoriskt.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Ogiltig e-postadress.";
    }
    if (!password) {
      errors.password = "Lösenord är obligatoriskt.";
    }
    setError(errors);

    if (Object.keys(errors).length > 0) return;

    login(email, password).catch((err: Error) => {
      console.error("Login failed:", err);
      setError({ password: "Fel e-postadress eller lösenord." });
    });
  };

  return (
    <ThemedView style={styles.container}>
      <Pressable style={styles.inner} onPress={Keyboard.dismiss}>
        <ThemedText type="title">Logga In</ThemedText>
        <Spacer size="xl" />
        <ThemedTextInput
          placeholder="Email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        {error.email && (
          <ThemedText style={{ color: Colors.error }}>{error.email}</ThemedText>
        )}
        <Spacer size="md" />
        <ThemedTextInput
          placeholder="Lösenord"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error.password && (
          <ThemedText style={{ color: Colors.error }}>
            {error.password}
          </ThemedText>
        )}
        <Spacer size="md" />
        <ThemedButton title="Logga In" onPress={handleSubmit} />
        <Spacer size="xl" />
        <Link href="/register" replace>
          <ThemedText type="link">
            Har du inget konto? Registrera dig
          </ThemedText>
        </Link>
        <Spacer size="sm" />
        <Link href="/forgot-password">
          <ThemedText type="link">Glömt lösenord?</ThemedText>
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

export default Login;
