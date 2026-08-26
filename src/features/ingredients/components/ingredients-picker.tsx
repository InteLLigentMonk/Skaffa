import { Ingredient } from "@/lib/types";
import { StyledIonicons } from "@/utils/helpers";
import { BottomSheet, Button, CloseButton, Typography } from "heroui-native";
import { View } from "react-native";

type IngredientsPickerProps = {
  onBack: () => void;
  onAdd: (row: Ingredient) => void;
};

const data: Ingredient[] = [
  {
    id: "1",
    name: "Tomat",
    unit: "styck",
  },
  {
    id: "2",
    name: "Lök",
    unit: "styck",
  },
  {
    id: "3",
    name: "Köttfärs",
    unit: "gram",
  },
];

const IngredientsPicker = ({ onBack, onAdd }: IngredientsPickerProps) => {
  return (
    <View className="flex flex-col gap-4">
      <View className="flex flex-row items-center justify-between">
        <CloseButton className="rounded-lg" onPress={onBack}>
          <StyledIonicons
            name="chevron-back-outline"
            size={18}
            className="text-muted"
          />
        </CloseButton>
        <BottomSheet.Title>
          <Typography.Heading type="h2">
            Lägg till ingrediens
          </Typography.Heading>
        </BottomSheet.Title>
        <BottomSheet.Close className="rounded-lg" />
      </View>
      {data.map((ingredient) => (
        <View
          key={ingredient.id}
          className="flex flex-row items-center justify-between p-4"
        >
          <Typography.Paragraph>{ingredient.name}</Typography.Paragraph>
          <Button className="rounded-lg" onPress={() => onAdd(ingredient)}>
            Lägg till
          </Button>
        </View>
      ))}
    </View>
  );
};

export default IngredientsPicker;
