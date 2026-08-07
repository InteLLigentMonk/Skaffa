import ThemedButton from "@/components/themed-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/contexts/auth-context";
import { StyleSheet } from "react-native";

const index = () => {
  const auth = useAuth();
  return (
    <ThemedView style={styles.container}>
      <ThemedText>Hej {auth.user?.name || "världen"}!</ThemedText>
      <ThemedButton title="Logga ut" onPress={auth.logout} />
    </ThemedView>
  );
};

export default index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  link: {
    margin: 10,
    padding: 10,
    backgroundColor: "#007AFF",
    borderRadius: 5,
  },
});
