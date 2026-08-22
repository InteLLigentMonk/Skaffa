import { useAuth } from "@/features/auth/contexts/auth-context";
import { useAuthorizedUser } from "@/features/auth/contexts/authorized-user-context";
import { StyledIonicons } from "@/utils/helpers";
import { Ionicons } from "@expo/vector-icons";
import {
  Avatar as HeroAvatar,
  Menu,
  Separator,
  Typography,
} from "heroui-native";
import { View } from "react-native";

const dateToday = (date = new Date()) => {
  const s = date.toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const getInitials = (name?: string) => {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return "";
  // Första + sista ordet, så "Anna Maria Svensson" blir "AS", inte "AM".
  const picked = parts.length === 1 ? [parts[0]] : [parts[0], parts.at(-1)!];
  return picked.map((p) => p.charAt(0).toUpperCase()).join("");
};

const Avatar = ({ initials }: { initials: string }) => {
  return (
    <HeroAvatar size="sm">
      <HeroAvatar.Fallback
        color="default"
        className="border-none bg-gradient-to-br from-green-500 to-orange-500"
      >
        {initials ? (
          <Typography.Heading type="h3" weight="bold" className="text-white">
            {initials}
          </Typography.Heading>
        ) : (
          <Ionicons name="person-outline" size={16} color="white" />
        )}
      </HeroAvatar.Fallback>
    </HeroAvatar>
  );
};

export default function HomeTopBar({ scrolled }: { scrolled: boolean }) {
  const user = useAuthorizedUser();
  const auth = useAuth();
  const initials = getInitials(user.name);

  return (
    <View
      className={`flex flex-row px-4 pb-2 items-center justify-between bg-background ${scrolled ? "shadow-md" : ""}`}
    >
      <Typography.Paragraph className="text-foreground">
        {dateToday()}
      </Typography.Paragraph>
      <Menu>
        <Menu.Trigger>
          <Avatar initials={initials} />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Overlay />
          <Menu.Content presentation="popover" width={220}>
            <Menu.Item id="1">
              <View className="flex flex-row gap-2 items-center">
                <Avatar initials={initials} />
                <View className="flex-1">
                  <Menu.ItemTitle>{user.name}</Menu.ItemTitle>
                  <Menu.ItemDescription numberOfLines={1}>
                    {user.email}
                  </Menu.ItemDescription>
                </View>
              </View>
            </Menu.Item>
            <Separator className="mx-2 my-2 opacity-75" />
            <Menu.Item>
              <View className="flex flex-row items-center gap-4">
                <StyledIonicons
                  name="person-outline"
                  size={24}
                  className="text-foreground"
                />
                <Menu.ItemTitle>Kontoinställningar</Menu.ItemTitle>
              </View>
            </Menu.Item>
            <Menu.Item>
              <View className="flex flex-row items-center gap-4">
                <StyledIonicons
                  name="log-out-outline"
                  size={24}
                  className="text-foreground"
                />
                <Menu.ItemTitle>Lämna hemmet</Menu.ItemTitle>
              </View>
            </Menu.Item>
            <Separator className="mx-2 my-2 opacity-75" />
            <Menu.Item variant="danger" onPress={() => auth.logout()}>
              <View className="flex flex-row items-center gap-4">
                <StyledIonicons
                  name="log-out-outline"
                  size={24}
                  className="text-danger"
                />
                <Menu.ItemTitle>Log Out</Menu.ItemTitle>
              </View>
            </Menu.Item>
          </Menu.Content>
        </Menu.Portal>
      </Menu>
    </View>
  );
}
