import Fab from "@/app/components/fab";
import AddRecipeSheet from "@/features/recipes/components/add-recipe-sheet";
import SearchBar from "@/features/recipes/components/search-bar";
import { useState } from "react";
import { View } from "react-native";

const index = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View className="flex-1 gap-2 p-safe-offset-8">
      <SearchBar />

      <Fab onPress={() => setIsOpen(true)} />
      <AddRecipeSheet isOpen={isOpen} setIsOpen={setIsOpen} />
    </View>
  );
};

export default index;
