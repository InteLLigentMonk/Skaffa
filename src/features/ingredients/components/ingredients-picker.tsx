import SearchBar from "@/components/search-bar";
import { IngredientsPickerProps } from "@/features/ingredients/ingredient-types";
import { StyledIonicons } from "@/utils/helpers";
import {
  Button,
  CloseButton,
  PressableFeedback,
  Separator,
  Surface,
  Typography,
} from "heroui-native";
import { useState } from "react";
import { FlatList, View } from "react-native";
import Category from "./category";

const IngredientsPicker = ({
  ingredients,
  onBack,
  onToggle,
  onCreateNew,
  selectedIds,
}: IngredientsPickerProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const q = searchTerm.trim().toLocaleLowerCase();
  const filtered = ingredients.filter((i) => i.name.toLowerCase().includes(q));
  const hasExactMatch = ingredients.some((i) => i.name.toLowerCase() === q);
  const showCreate = q.length > 0 && !hasExactMatch;

  return (
    <View className="flex-1 flex-col gap-4">
      <View className="flex flex-row items-center gap-4">
        <CloseButton className="rounded-lg" onPress={onBack}>
          <StyledIonicons
            name="chevron-back-outline"
            size={18}
            className="text-muted"
          />
        </CloseButton>
        <Typography.Heading type="h2" className="flex flex-row grow">
          Lägg till ingredienser
        </Typography.Heading>
      </View>
      <SearchBar
        onChange={setSearchTerm}
        value={searchTerm}
        placeholder="Sök ingredienser"
      />
      {showCreate && (
        <PressableFeedback onPress={() => onCreateNew(searchTerm.trim())}>
          <Surface className="flex flex-row gap-4 items-center justify-between rounded-2xl bg-accent-soft border border-dashed border-accent px-4 py-2">
            <View className="h-12 aspect-square flex items-center justify-center rounded-xl bg-accent">
              <StyledIonicons name="add" size={32} className="text-white" />
            </View>
            <View className=" gap-2">
              <Typography.Heading type="h4" className="text-accent">
                Skapa ”{searchTerm.trim()}”
              </Typography.Heading>
              <Typography.Paragraph
                type="body-sm"
                color="muted"
                className="text-accent/50"
              >
                Sätt kategori + enhet en gång — sparas i ingredienslistan.
              </Typography.Paragraph>
            </View>
          </Surface>
        </PressableFeedback>
      )}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={<Separator />}
        className="flex-1"
        renderItem={({ item, index }) => {
          const isSelected = selectedIds.has(item.id);
          return (
            <View className="flex-row items-center justify-between p-1">
              <View className="flex-1 flex-row gap-4 items-center">
                <Category category={item.category} />
                <View className="flex-1 flex-col gap-1">
                  <Typography.Heading type="h4">{item.name}</Typography.Heading>
                  <Typography.Paragraph type="body-sm" color="muted">
                    {item.category.charAt(0).toUpperCase() +
                      item.category.slice(1)}
                  </Typography.Paragraph>
                </View>
              </View>
              <Button
                isIconOnly
                size="sm"
                variant={isSelected ? "primary" : "ghost"}
                onPress={() => onToggle(item)}
                className={`rounded-full border-2 ${isSelected ? "border-accent" : "border-border"}`}
              >
                {isSelected && (
                  <StyledIonicons
                    name="checkmark"
                    size={24}
                    className="text-white"
                  />
                )}
              </Button>
            </View>
          );
        }}
      />
    </View>
  );
};

export default IngredientsPicker;
