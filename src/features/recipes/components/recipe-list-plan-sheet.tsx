import PlanMealSheet from "@/features/plan/components/plan-meal-sheet";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useRecipe } from "../hooks/use-recipes";
import { RecipeCardData, RecipeScope } from "../recipe-types";

type Props = {
  /** null tills ett recept valts. */
  target: { recipe: RecipeCardData; scope: RecipeScope } | null;
  isOpen: boolean;
  onClose: () => void;
};

// Veckoplansarket från receptlistan. Kortet saknar portioner, så receptet
// hämtas först — samma fråga som detaljsidan, så den är ofta redan cachad och
// sidan laddas inte om när man öppnar receptet efteråt. Arket öppnas när
// portionerna finns, i stället för att visa en siffra som sedan hoppar.
//
// Monterat hela tiden, även innan något recept valts — se kommentaren om Sheet
// i veckoplanen.
const RecipeListPlanSheet = ({ target, isOpen, onClose }: Props) => {
  const recipeKey = target ? `${target.scope}:${target.recipe.id}` : null;
  const detail = useRecipe(target?.scope ?? "home", target?.recipe.id);

  // Portioner man ändrat i arket gäller bara receptet de ändrades för; ett
  // nytt recept börjar om från sina egna.
  const [picked, setPicked] = useState<{ key: string; servings: number } | null>(
    null,
  );
  const value =
    picked && picked.key === recipeKey ? picked.servings : detail.data?.servings;

  // Utan portioner öppnas arket aldrig, så ett misslyckat hämtande hade
  // annars sett ut som att trycket inte gjorde något. Beroende på isOpen så
  // att ett nytt försök på samma recept säger till igen.
  const failed = detail.isError && value === undefined;
  useEffect(() => {
    if (!failed || !isOpen) return;
    Alert.alert(
      "Kunde inte öppna veckoplanen",
      "Receptet gick inte att hämta. Kontrollera anslutningen och försök igen.",
    );
    onClose();
    // Frågan ligger kvar i felläge om man trycker på samma recept igen, och
    // då hämtar useRecipe inte om av sig själv.
    detail.refetch();
  }, [failed, isOpen, onClose, detail]);

  return (
    <PlanMealSheet
      recipe={
        target
          ? { id: target.recipe.id, scope: target.scope, name: target.recipe.name }
          : null
      }
      isOpen={isOpen && value !== undefined}
      onClose={onClose}
      servings={value ?? null}
      onServingsChange={(servings) =>
        recipeKey && setPicked({ key: recipeKey, servings })
      }
    />
  );
};

export default RecipeListPlanSheet;
