import PlanMealSheet from "@/features/plan/components/plan-meal-sheet";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useRecipe } from "../hooks/use-recipes";
import { RecipeCardData, RecipeScope } from "../recipe-types";

type Props = {
  recipe: RecipeCardData;
  scope: RecipeScope;
  isOpen: boolean;
  onClose: () => void;
};

// Veckoplansarket från receptlistan. Kortet saknar portioner, så receptet
// hämtas först — samma fråga som detaljsidan, så den är ofta redan cachad och
// sidan laddas inte om när man öppnar receptet efteråt. Arket öppnas när
// portionerna finns, i stället för att visa en siffra som sedan hoppar.
const RecipeListPlanSheet = ({ recipe, scope, isOpen, onClose }: Props) => {
  const detail = useRecipe(scope, recipe.id);
  const [servings, setServings] = useState<number | null>(null);
  const value = servings ?? detail.data?.servings;

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
    // Komponenten ligger kvar monterad (samma key) om man trycker på samma
    // recept igen, och då hämtar useRecipe inte om av sig själv.
    detail.refetch();
  }, [failed, isOpen, onClose, detail]);

  if (value === undefined) return null;

  return (
    <PlanMealSheet
      recipe={{ id: recipe.id, scope, name: recipe.name }}
      isOpen={isOpen}
      onClose={onClose}
      servings={value}
      onServingsChange={setServings}
    />
  );
};

export default RecipeListPlanSheet;
