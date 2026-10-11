import NewIngredientForm from "@/features/ingredients/components/new-ingredient-form";
import { StyledIonicons } from "@/utils/helpers";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CloseButton, Typography } from "heroui-native";
import { View } from "react-native";
import ModalScreen from "../../components/modal-screen";

const NewIngredient = () => {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();

  const onBack = () => router.back();

  return (
    <ModalScreen>
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
            Ny ingrediens
          </Typography.Heading>
        </View>
        <NewIngredientForm initialName={name ?? ""} onCreated={onBack} />
      </View>
    </ModalScreen>
  );
};

export default NewIngredient;
