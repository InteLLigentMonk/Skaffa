import { Emoji } from "@/components/emoji";
import { Button, Typography } from "heroui-native";
import { View } from "react-native";
import { RecipeScope } from "../recipe-types";

type Props = {
  scope: RecipeScope;
  query: string;
  hasFilters: boolean;
  onSearchExplore: () => void;
  onCreate: (name?: string) => void;
};

const RecipeEmptyState = ({
  scope,
  query,
  hasFilters,
  onSearchExplore,
  onCreate,
}: Props) => {
  if (query) {
    return (
      <EmptyLayout
        emoji="🔍"
        title={`Hittade inget för ”${query}” ${scope === "home" ? "bland dina recept" : "i Utforska"}`}
      >
        {scope === "home" && (
          <Button variant="secondary" onPress={onSearchExplore}>
            <Button.Label>Sök i Utforska</Button.Label>
          </Button>
        )}
        <Button variant="primary" onPress={() => onCreate(query)}>
          <Button.Label numberOfLines={1}>Skapa ”{query}”</Button.Label>
        </Button>
      </EmptyLayout>
    );
  }

  if (hasFilters) {
    return <EmptyLayout emoji="🧺" title="Inga recept matchar filtren" />;
  }

  if (scope === "explore") {
    return <EmptyLayout emoji="📖" title="Receptbanken är tom än så länge" />;
  }

  return (
    <EmptyLayout emoji="📖" title="Inga recept än">
      <Button variant="primary" onPress={() => onCreate()}>
        <Button.Label>Skapa recept</Button.Label>
      </Button>
    </EmptyLayout>
  );
};

const EmptyLayout = ({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children?: React.ReactNode;
}) => (
  <View className="flex-1 items-center justify-center gap-4 px-8 py-12">
    <Emoji size={48}>{emoji}</Emoji>
    <Typography.Heading type="h5" align="center">
      {title}
    </Typography.Heading>
    {children && <View className="w-full gap-2">{children}</View>}
  </View>
);

export default RecipeEmptyState;
