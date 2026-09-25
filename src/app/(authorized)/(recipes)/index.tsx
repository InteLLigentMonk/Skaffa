import Fab from "@/components/fab";
import SearchBar from "@/components/search-bar";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

const RecipeIndex = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  return (
    <View className="flex-1 gap-2 p-safe-offset-8">
      <SearchBar
        onChange={setSearchTerm}
        value={searchTerm}
        placeholder="Sök recept"
      />

      <Fab onPress={() => router.push("/add-recipe")} />
    </View>
  );
};

export default RecipeIndex;
