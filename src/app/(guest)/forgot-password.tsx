import Spacer from "@/components/spacer";
import ThemedButton from "@/components/themed-button";
import { ThemedText } from "@/components/themed-text";
import ThemedTextInput from "@/components/themed-text-input";
import { ThemedView } from "@/components/themed-view";
import { Keyboard, Pressable, StyleSheet } from "react-native";

const ForgotPassword = () => {
  return (
    <ThemedView style={styles.container}>
      <Pressable style={styles.inner} onPress={Keyboard.dismiss}>
        <ThemedText type="title">Glömt Lösenord</ThemedText>
        <Spacer size="xl" />
        <ThemedTextInput placeholder="Email" keyboardType="email-address" />
        <Spacer size="md" />
        <ThemedButton title="Återställ Lösenord" onPress={() => {}} />
        <Spacer size="xl" />
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

export default ForgotPassword;
