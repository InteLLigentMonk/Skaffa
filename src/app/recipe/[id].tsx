import { Emoji } from "@/components/emoji";
import NumberSelect from "@/components/number-select";
import PlanMealSheet from "@/features/plan/components/plan-meal-sheet";
import RecipeActionsMenu from "@/features/recipes/components/recipe-actions-menu";
import RecipeIngredientList from "@/features/recipes/components/recipe-ingredient-list";
import RecipeStepList from "@/features/recipes/components/recipe-step-list";
import {
  useDeleteRecipe,
  useDuplicateRecipe,
  useRecipe,
  useToggleFavorite,
} from "@/features/recipes/hooks/use-recipes";
import {
  DIET_EMOJI,
  DIET_LABELS,
  FAVORITE_TAG,
  RecipeDetail,
  RecipeScope,
} from "@/features/recipes/recipe-types";
import { StyledIonicons } from "@/utils/helpers";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Button,
  Chip,
  Spinner,
  Surface,
  Typography,
} from "heroui-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { withUniwind } from "uniwind";

const StyledImage = withUniwind(Image);

const errorText = (
  error: { code?: string; message: string } | null,
  fallback: string,
) => {
  if (!error) return null;
  return error.code === "P0001" ? error.message : fallback;
};

const RecipeScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; scope?: string }>();
  // Allt som inte uttryckligen är banken behandlas som hemmets recept; en
  // trasig länk ger då "hittades inte" i stället för fel tabell.
  const scope: RecipeScope = params.scope === "explore" ? "explore" : "home";

  const { data: recipe, isPending, isError, refetch } = useRecipe(
    scope,
    params.id,
  );

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner size="lg" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
        <Typography.Paragraph align="center" color="muted">
          Kunde inte hämta receptet
        </Typography.Paragraph>
        <View className="flex-row gap-2">
          <Button variant="tertiary" onPress={() => router.back()}>
            <Button.Label>Tillbaka</Button.Label>
          </Button>
          <Button variant="secondary" onPress={() => refetch()}>
            <Button.Label>Försök igen</Button.Label>
          </Button>
        </View>
      </View>
    );
  }

  // key: portionerna ska börja om från receptets eget värde när sidan byter
  // recept (Duplicera ersätter skärmen med kopian).
  return <RecipeView key={`${scope}:${recipe.id}`} recipe={recipe} />;
};

const RecipeView = ({ recipe }: { recipe: RecipeDetail }) => {
  const router = useRouter();
  const isHome = recipe.scope === "home";
  const isFavorite = recipe.tags.includes(FAVORITE_TAG);

  // Delas med veckoplansarket, så en ändring där syns här och tvärtom.
  const [servings, setServings] = useState(recipe.servings);
  const [isPlanOpen, setIsPlanOpen] = useState(false);

  const toggleFavorite = useToggleFavorite();
  const duplicate = useDuplicateRecipe();
  const remove = useDeleteRecipe();

  const otherTags = recipe.tags.filter((tag) => tag !== FAVORITE_TAG);

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="pb-32">
        {/* ---- Bild ---- */}
        {recipe.imageUrl ? (
          <StyledImage
            source={{
              uri: recipe.imageUrl,
              cacheKey: recipe.imagePath ?? undefined,
            }}
            className="h-72 w-full"
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View className="h-72 w-full items-center justify-center bg-secondary-soft">
            <Emoji size={72}>
              {recipe.diet ? DIET_EMOJI[recipe.diet] : "🍽️"}
            </Emoji>
          </View>
        )}

        {/* ---- Innehållet: ser ut som ett ark, men är en del av sidan ---- */}
        <View className="-mt-6 gap-6 rounded-t-3xl bg-background px-4 pt-6">
          <View className="gap-3">
            <Typography.Heading type="h2" weight="bold">
              {recipe.name}
            </Typography.Heading>
            <View className="flex-row flex-wrap gap-2">
              {recipe.prepMinutes !== null && (
                <Chip size="sm" variant="secondary">
                  <StyledIonicons
                    name="time-outline"
                    size={14}
                    className="text-foreground"
                  />
                  <Chip.Label>{recipe.prepMinutes} min</Chip.Label>
                </Chip>
              )}
              {recipe.diet && (
                // Emojin som eget element, inte i etikettens sträng: en
                // emoji i samma Text som Nunito-texten tappade ordet efter
                // några navigeringar, men emojin blev kvar.
                <Chip size="sm" variant="soft" color="success">
                  <Emoji size={12}>{DIET_EMOJI[recipe.diet]}</Emoji>
                  <Chip.Label>{DIET_LABELS[recipe.diet]}</Chip.Label>
                </Chip>
              )}
              {otherTags.map((tag) => (
                <Chip key={tag} size="sm" variant="secondary">
                  <Chip.Label>{capitalize(tag)}</Chip.Label>
                </Chip>
              ))}
              {isFavorite && (
                <Chip size="sm" variant="soft" color="warning">
                  <Emoji size={12}>⭐</Emoji>
                  <Chip.Label>Favorit</Chip.Label>
                </Chip>
              )}
            </View>
          </View>

          <Surface
            variant="secondary"
            className="flex-row items-center justify-between rounded-2xl p-4"
          >
            <View className="flex-1 pr-2">
              <Typography.Paragraph weight="bold">Portioner</Typography.Paragraph>
              <Typography.Paragraph type="body-xs" color="muted">
                Mängderna räknas om direkt
              </Typography.Paragraph>
            </View>
            <NumberSelect value={servings} onChange={setServings} />
          </Surface>

          <View className="gap-1">
            <Typography.Heading type="h5" weight="bold">
              Ingredienser
            </Typography.Heading>
            <RecipeIngredientList
              ingredients={recipe.ingredients}
              factor={servings / recipe.servings}
            />
          </View>

          <View className="gap-3">
            <Typography.Heading type="h5" weight="bold">
              Gör så här
            </Typography.Heading>
            <RecipeStepList steps={recipe.steps} />
          </View>

          {(duplicate.error || toggleFavorite.error) && (
            <Typography.Paragraph type="body-sm" className="text-danger">
              {duplicate.error
                ? errorText(duplicate.error, "Kunde inte duplicera receptet")
                : errorText(toggleFavorite.error, "Kunde inte spara favorit")}
            </Typography.Paragraph>
          )}
        </View>
      </ScrollView>

      {/* ---- Knapparna över bilden ---- */}
      <View className="absolute inset-x-0 top-0 flex-row items-center justify-between px-4 pt-safe-offset-2">
        <RoundButton
          icon="chevron-back"
          label="Tillbaka"
          onPress={() => router.back()}
        />
        {isHome && (
          <View className="flex-row gap-2">
            <RoundButton
              icon={isFavorite ? "heart" : "heart-outline"}
              iconClassName="text-secondary"
              label={isFavorite ? "Ta bort favorit" : "Gör till favorit"}
              onPress={() =>
                toggleFavorite.mutate({ id: recipe.id, favorite: !isFavorite })
              }
            />
            <RecipeActionsMenu
              recipeName={recipe.name}
              isDuplicating={duplicate.isPending}
              isDeleting={remove.isPending}
              error={errorText(remove.error, "Kunde inte ta bort receptet")}
              onDuplicate={() =>
                duplicate.mutate(recipe.id, {
                  onSuccess: (id) =>
                    router.replace({
                      pathname: "/recipe/[id]",
                      params: { id, scope: "home" },
                    }),
                })
              }
              // Ingen guard flyttar oss härifrån, så sidan går tillbaka själv.
              onDelete={() =>
                remove.mutate(recipe.id, { onSuccess: () => router.back() })
              }
            />
          </View>
        )}
      </View>

      {/* ---- Lägg i veckoplan ---- */}
      <View className="absolute inset-x-0 bottom-0 bg-background px-4 pb-safe-offset-3 pt-3">
        <Button size="lg" onPress={() => setIsPlanOpen(true)}>
          <StyledIonicons
            name="calendar-outline"
            size={20}
            className="text-accent-foreground"
          />
          <Button.Label>Lägg i veckoplan</Button.Label>
        </Button>
      </View>

      <PlanMealSheet
        recipe={recipe}
        isOpen={isPlanOpen}
        onClose={() => setIsPlanOpen(false)}
        servings={servings}
        onServingsChange={setServings}
      />
    </View>
  );
};

const RoundButton = ({
  icon,
  label,
  onPress,
  iconClassName = "text-foreground",
}: {
  icon: React.ComponentProps<typeof StyledIonicons>["name"];
  label: string;
  onPress: () => void;
  iconClassName?: string;
}) => (
  <Button
    variant="tertiary"
    isIconOnly
    onPress={onPress}
    accessibilityLabel={label}
    className="rounded-full bg-background"
  >
    <StyledIonicons name={icon} size={20} className={iconClassName} />
  </Button>
);

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

export default RecipeScreen;
