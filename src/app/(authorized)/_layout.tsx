import { AuthorizedUserProvider } from "@/features/auth/contexts/authorized-user-context";
import { useTheme } from "@/hooks/use-theme";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

const TabsLayout = () => {
  const theme = useTheme();

  return (
    <AuthorizedUserProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarStyle: {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            overflow: "visible",
          },
        }}
      >
        <Tabs.Screen
          name="(home)"
          options={{
            title: "Hem",
            headerShown: false,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="(plan)"
          options={{
            title: "Veckoplan",
            headerShown: false,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "calendar-clear" : "calendar-clear-outline"}
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="(recipes)"
          options={{
            title: "Recept",
            headerShown: false,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "book" : "book-outline"}
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="(shopping-list)"
          options={{
            title: "Att handla",
            headerShown: false,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "basket" : "basket-outline"}
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="(user)"
          options={{
            title: "Användare",
            headerShown: false,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "person-circle" : "person-circle-outline"}
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen name="(products)" options={{ href: null }} />
      </Tabs>
    </AuthorizedUserProvider>
  );
};

export default TabsLayout;
