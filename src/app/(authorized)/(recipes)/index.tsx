import Fab from "@/components/fab";
import SearchBar from "@/components/search-bar";
import HomeTopBar from "@/features/home/components/home-top-bar";
import RecipeCard from "@/features/recipes/components/recipe-card";
import RecipeContextMenu from "@/features/recipes/components/recipe-context-menu";
import RecipeEmptyState from "@/features/recipes/components/recipe-empty-state";
import RecipeFilterPills from "@/features/recipes/components/recipe-filter-pills";
import { useRecipeSearch } from "@/features/recipes/hooks/use-recipes";
import {
  DietClass,
  RecipeCardData,
  RecipeScope,
} from "@/features/recipes/recipe-types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { StyledIonicons } from "@/utils/helpers";
import { useRouter } from "expo-router";
import {
  Button,
  PressableFeedback,
  Spinner,
  Surface,
  Tabs,
  Typography,
} from "heroui-native";
import { useState } from "react";
import { FlatList, useWindowDimensions, View } from "react-native";

const SIDE_PADDING = 16;
const COLUMN_GAP = 12;

const RecipeIndex = () => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  // Fast bredd i stället för flex-1: med ett udda antal recept hade det sista
  // kortet annars spänt över båda kolumnerna.
  const cardWidth = (width - SIDE_PADDING * 2 - COLUMN_GAP) / 2;

  const [scrolled, setScrolled] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [scope, setScope] = useState<RecipeScope>("home");
  const [quick, setQuick] = useState(false);
  const [diet, setDiet] = useState<DietClass | null>(null);

  const [menuRecipe, setMenuRecipe] = useState<RecipeCardData | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const query = useDebouncedValue(searchTerm.trim());
  const {
    data,
    isPending,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useRecipeSearch(scope, { query, quick, diet });
  const recipes = data?.pages.flat() ?? [];

  const openMenu = (recipe: RecipeCardData) => {
    setMenuRecipe(recipe);
    setIsMenuOpen(true);
  };

  const createRecipe = (name?: string) =>
    router.push(
      name ? { pathname: "/add-recipe", params: { name } } : "/add-recipe",
    );

  return (
    <View className="flex-1 pt-safe-offset-2">
      <HomeTopBar title="Recept" scrolled={scrolled} />

      <View className="gap-3 pb-3">
        <View className="gap-3 px-4">
          <SearchBar
            onChange={setSearchTerm}
            value={searchTerm}
            placeholder="Sök recept"
          />

          {/* Platshållare: (products) blir ingredienslistan i en senare plan. */}
          <PressableFeedback
            onPress={() => router.push("/(authorized)/(products)")}
          >
            <Surface
              variant="secondary"
              className="flex-row items-center gap-3 rounded-2xl px-4 py-3"
            >
              <StyledIonicons
                name="nutrition-outline"
                size={20}
                className="text-foreground"
              />
              <Typography.Paragraph weight="bold" className="flex-1">
                Ingredienser
              </Typography.Paragraph>
              <StyledIonicons
                name="chevron-forward"
                size={18}
                className="text-muted"
              />
            </Surface>
          </PressableFeedback>

          <Tabs
            value={scope}
            onValueChange={(value) => setScope(value as RecipeScope)}
          >
            <Tabs.List>
              <Tabs.Indicator />
              <Tabs.Trigger value="home" className="flex-1">
                <Tabs.Label>Hemmets recept</Tabs.Label>
              </Tabs.Trigger>
              <Tabs.Trigger value="explore" className="flex-1">
                <Tabs.Label>Utforska</Tabs.Label>
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs>
        </View>

        <RecipeFilterPills
          quick={quick}
          diet={diet}
          onChange={(next) => {
            setQuick(next.quick);
            setDiet(next.diet);
          }}
        />
      </View>

      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <Spinner size="lg" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Typography.Paragraph align="center" color="muted">
            Kunde inte hämta recepten
          </Typography.Paragraph>
          <Button variant="secondary" onPress={() => refetch()}>
            <Button.Label>Försök igen</Button.Label>
          </Button>
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(recipe) => recipe.id}
          numColumns={2}
          columnWrapperClassName="gap-3"
          contentContainerClassName="grow gap-3 px-4 pb-28"
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              width={cardWidth}
              // TODO: receptets detaljsida (nästa plan).
              onPress={() => {}}
              onLongPress={() => openMenu(item)}
            />
          )}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="items-center py-4">
                <Spinner />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <RecipeEmptyState
              scope={scope}
              query={query}
              hasFilters={quick || diet !== null}
              onSearchExplore={() => setScope("explore")}
              onCreate={createRecipe}
            />
          }
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 0)}
        />
      )}

      <Fab onPress={() => createRecipe()} />

      <RecipeContextMenu
        recipe={menuRecipe}
        scope={scope}
        isOpen={isMenuOpen}
        onOpenChange={setIsMenuOpen}
      />
    </View>
  );
};

export default RecipeIndex;
