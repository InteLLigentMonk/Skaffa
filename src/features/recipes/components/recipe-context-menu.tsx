import { useRouter } from "expo-router";
import { Menu, MenuTriggerRef } from "heroui-native";
import { useRef } from "react";
import { Alert, View } from "react-native";
import {
  useCopyPublicRecipe,
  useToggleFavorite,
} from "../hooks/use-recipes";
import { RecipeCardData, RecipeScope } from "../recipe-types";
import RecipeCard from "./recipe-card";
import MenuRow from "./recipe-menu-row";

type Props = {
  recipe: RecipeCardData;
  scope: RecipeScope;
  width: number;
  // Veckoplansarket ligger på listan, inte i varje kort.
  onPlan: () => void;
};

// Kortet med sin långtrycksmeny. En meny per kort, så att popovern hamnar vid
// kortet som på detaljsidan.
//
// Kortet är inte själv Menu.Trigger: Slot slår ihop triggerns onPress med
// kortets, så ett vanligt tryck hade både öppnat receptet och menyn. Triggern
// är en passiv View runt kortet som bara mäts, och långtrycket öppnar menyn
// via dess ref. collapsable={false}: Android plattar annars bort en View utan
// egen stil, och då finns inget att mäta.
const RecipeContextMenu = ({ recipe, scope, width, onPlan }: Props) => {
  const router = useRouter();
  const trigger = useRef<MenuTriggerRef>(null);
  const toggleFavorite = useToggleFavorite();
  const copy = useCopyPublicRecipe();

  const openRecipe = (id: string, recipeScope: RecipeScope) =>
    router.push({
      pathname: "/recipe/[id]",
      params: { id, scope: recipeScope },
    });

  return (
    <Menu>
      <Menu.Trigger asChild ref={trigger}>
        <View collapsable={false} role="none">
          <RecipeCard
            recipe={recipe}
            width={width}
            onPress={() => openRecipe(recipe.id, scope)}
            onLongPress={() => trigger.current?.open()}
          />
        </View>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Overlay />
        <Menu.Content presentation="popover" width={220}>
          <MenuRow
            icon="calendar-outline"
            title="Lägg i veckoplan"
            onPress={onPlan}
          />
          <MenuRow
            icon="open-outline"
            title="Öppna"
            onPress={() => openRecipe(recipe.id, scope)}
          />
          {scope === "home" ? (
            <>
              <MenuRow
                icon="create-outline"
                title="Redigera recept"
                onPress={() =>
                  router.push({
                    pathname: "/recipe-form",
                    params: { id: recipe.id },
                  })
                }
              />
              <MenuRow
                icon={recipe.isFavorite ? "heart" : "heart-outline"}
                title={recipe.isFavorite ? "Ta bort favorit" : "Gör till favorit"}
                onPress={() =>
                  toggleFavorite.mutate(
                    { id: recipe.id, favorite: !recipe.isFavorite },
                    {
                      // Menyn är redan stängd, så felet har ingen plats att
                      // stå på i listan.
                      onError: () => Alert.alert("Kunde inte spara favorit"),
                    },
                  )
                }
              />
            </>
          ) : (
            <MenuRow
              icon="bookmark-outline"
              title={copy.isPending ? "Sparar…" : "Spara till hemmet"}
              isDisabled={copy.isPending}
              onPress={() =>
                copy.mutate(recipe.id, {
                  // Kopian öppnas: det visar att den sparats, och den går
                  // att redigera därifrån.
                  onSuccess: (homeId) => openRecipe(homeId, "home"),
                  onError: (error) =>
                    Alert.alert(
                      "Kunde inte spara receptet",
                      error.code === "P0001" ? error.message : undefined,
                    ),
                })
              }
            />
          )}
        </Menu.Content>
      </Menu.Portal>
    </Menu>
  );
};

export default RecipeContextMenu;
