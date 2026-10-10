import { createContext, ReactNode, useContext } from "react";

type RecipeFormMode = {
  isEditing: boolean;
  // Den sparade bildens signerade URL. Bara för förhandsvisningen —
  // formuläret bär sökvägen i imagePath.
  initialImageUrl: string | null;
};

const RecipeFormModeContext = createContext<RecipeFormMode | null>(null);

export const RecipeFormModeProvider = ({
  value,
  children,
}: {
  value: RecipeFormMode;
  children: ReactNode;
}) => (
  <RecipeFormModeContext.Provider value={value}>
    {children}
  </RecipeFormModeContext.Provider>
);

export const useRecipeFormMode = () => {
  const mode = useContext(RecipeFormModeContext);
  if (!mode) {
    throw new Error("useRecipeFormMode måste användas inuti recipe-form");
  }
  return mode;
};
