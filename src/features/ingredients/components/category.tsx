import { Emoji } from "@/components/emoji";
import { View } from "react-native";
import {
  CATEGORY_COLORS,
  CATEGORY_EMOJI,
  IngredientCategory,
} from "../ingredient-types";

const Category = ({ category }: { category: IngredientCategory }) => {
  return (
    <View
      className={`flex items-center h-12 aspect-square justify-center gap-2 p-2 rounded-2xl ${CATEGORY_COLORS[category]}`}
    >
      <Emoji size={16}>{CATEGORY_EMOJI[category]}</Emoji>
    </View>
  );
};

export default Category;
