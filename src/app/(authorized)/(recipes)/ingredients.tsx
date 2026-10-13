import SearchBar from "@/components/search-bar";
import Category from "@/features/ingredients/components/category";
import {
  useDeleteIngredient,
  useIngredients,
  useRenameIngredient,
} from "@/features/ingredients/hooks/use-ingredients";
import { PickerIngredient } from "@/features/ingredients/ingredient-types";
import { StyledIonicons } from "@/utils/helpers";
import { PostgrestError } from "@supabase/supabase-js";
import { useHeaderHeight } from "expo-router/build/react-navigation";
import {
  Button,
  FieldError,
  Input,
  Surface,
  TextField,
  Typography,
} from "heroui-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  View,
} from "react-native";

// Se kommentaren vid keyboardBehavior i (settings)/manage-home.tsx.
const keyboardBehavior = Platform.OS === "ios" ? "padding" : "height";

const errorText = (error: PostgrestError | null, fallback: string) => {
  if (!error) return null;
  // ingredients_owner_name_uniq: hemmet har redan en med samma namn.
  if (error.code === "23505") return "Ni har redan en ingrediens med det namnet";
  // Vakterna i databasen skriver sina texter för att visas rakt upp.
  return error.code === "P0001" ? error.message : fallback;
};

const IngredientRow = ({ ingredient }: { ingredient: PickerIngredient }) => {
  const rename = useRenameIngredient();
  const remove = useDeleteIngredient();
  const [draft, setDraft] = useState<string | null>(null);

  const confirmDelete = () =>
    Alert.alert(
      `Ta bort ${ingredient.name}?`,
      "Ingrediensen försvinner från hemmets lista. Det går bara om den inte används någonstans.",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Ta bort",
          style: "destructive",
          onPress: () =>
            remove.mutate(ingredient.id, {
              onError: (error) =>
                Alert.alert(
                  "Kunde inte ta bort",
                  errorText(error, "Försök igen senare.") ?? "",
                ),
            }),
        },
      ],
    );

  if (draft !== null) {
    return (
      <Surface className="gap-2">
        <TextField isInvalid={!!rename.error}>
          <Input
            value={draft}
            onChangeText={setDraft}
            maxLength={80}
            autoCapitalize="sentences"
            autoFocus
          />
          <FieldError>{errorText(rename.error, "Kunde inte byta namn")}</FieldError>
        </TextField>
        <View className="flex-row gap-2">
          <Button
            variant="tertiary"
            className="flex-1 rounded-2xl bg-field"
            onPress={() => {
              setDraft(null);
              rename.reset();
            }}
          >
            <Typography.Paragraph>Avbryt</Typography.Paragraph>
          </Button>
          <Button
            variant="primary"
            className="flex-1 rounded-2xl"
            isDisabled={rename.isPending || draft.trim().length === 0}
            onPress={() =>
              rename.mutate(
                { id: ingredient.id, name: draft },
                { onSuccess: () => setDraft(null) },
              )
            }
          >
            <Typography.Paragraph className="text-white">
              Spara
            </Typography.Paragraph>
          </Button>
        </View>
      </Surface>
    );
  }

  return (
    <Surface className="flex-row items-center gap-3 py-2">
      <Category category={ingredient.category} />
      <Typography.Paragraph weight="bold" className="flex-1">
        {ingredient.name}
      </Typography.Paragraph>
      <Button
        variant="tertiary"
        className="rounded-xl bg-field p-2"
        accessibilityLabel={`Byt namn på ${ingredient.name}`}
        onPress={() => setDraft(ingredient.name)}
      >
        <StyledIonicons name="pencil-outline" size={20} />
      </Button>
      <Button
        variant="tertiary"
        className="rounded-xl bg-danger-soft p-2"
        accessibilityLabel={`Ta bort ${ingredient.name}`}
        isDisabled={remove.isPending}
        onPress={confirmDelete}
      >
        <StyledIonicons name="trash-outline" size={20} className="text-danger" />
      </Button>
    </Surface>
  );
};

const Ingredients = () => {
  const { data, isPending, isError, refetch } = useIngredients();
  const [search, setSearch] = useState("");
  const headerHeight = useHeaderHeight();

  // Frö-ingredienserna (home_id null) är gemensamma och skrivskyddade.
  const term = search.trim().toLowerCase();
  const own =
    data?.filter(
      (i) => i.home_id !== null && i.name.toLowerCase().includes(term),
    ) ?? [];

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center gap-3 p-8">
        <Typography.Paragraph color="muted" align="center">
          Kunde inte läsa ingredienserna.
        </Typography.Paragraph>
        <Button variant="tertiary" onPress={() => refetch()}>
          <Typography.Paragraph>Försök igen</Typography.Paragraph>
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={keyboardBehavior}
      className="flex-1"
      keyboardVerticalOffset={headerHeight}
    >
      <FlatList
        data={own}
        keyExtractor={(item) => item.id}
        contentContainerClassName="grow gap-2 px-4 py-4 pb-safe-offset-4"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View className="gap-3 pb-2">
            <Typography.Paragraph type="body-sm" color="muted">
              Ingredienser som ert hem har skapat. De gemensamma
              grundingredienserna går inte att ändra.
            </Typography.Paragraph>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Sök bland egna ingredienser"
            />
          </View>
        }
        ListEmptyComponent={
          <Typography.Paragraph
            color="muted"
            align="center"
            className="pt-8"
          >
            {term
              ? "Ingen egen ingrediens matchar sökningen."
              : "Ni har inte skapat några egna ingredienser än. Det gör ni när ni lägger till en ingrediens i ett recept."}
          </Typography.Paragraph>
        }
        renderItem={({ item }) => <IngredientRow ingredient={item} />}
      />
    </KeyboardAvoidingView>
  );
};

export default Ingredients;
