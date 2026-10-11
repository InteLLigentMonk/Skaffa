import { AuthorizedUserProvider } from "@/features/auth/contexts/authorized-user-context";
import { Stack } from "expo-router";

// Ligger utanför flikarna så avatarmenyn kan öppna kontot ovanpå vilken flik
// som helst. Därför egen AuthorizedUserProvider — (authorized)/_layout.tsx
// lindar bara in flikarna.
const AccountLayout = () => {
  return (
    <AuthorizedUserProvider>
      <Stack screenOptions={{ animation: "slide_from_right" }}>
        <Stack.Screen name="index" options={{ title: "Konto" }} />
        <Stack.Screen
          name="change-password"
          options={{ title: "Ändra lösenord" }}
        />
      </Stack>
    </AuthorizedUserProvider>
  );
};

export default AccountLayout;
