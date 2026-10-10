import PlanMealSheet from "@/features/plan/components/plan-meal-sheet";
import { useState } from "react";
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
