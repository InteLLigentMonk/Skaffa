import { Stack } from "expo-router";

const ProtectedLayout = () => {
  return (
    <Stack screenOptions={{ animation: "slide_from_right" }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: "Registrera dig" }} />
      <Stack.Screen
        name="verify-email"
        options={{
          title: "Verifiera e-post",
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: "Återställ lösenord",
        }}
      />
    </Stack>
  );
};

export default ProtectedLayout;
